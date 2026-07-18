import traceback
import gc
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import APIResponse
from services.supabase_client import get_supabase
from services.data_processor import read_and_map_excel, process_dataframe, prepare_records
from datetime import datetime, timezone, date
from io import BytesIO
import pandas as pd

router = APIRouter(prefix="/api/upload", tags=["upload"])

BATCH_SIZE = 1000


def _load_saved_mapping() -> dict | None:
    try:
        sb = get_supabase()
        resp = sb.table("column_mapping").select("mapping").order("updated_at", desc=True).limit(1).execute()
        if resp.data:
            return resp.data[0]["mapping"]
    except Exception:
        pass
    return None


def _save_mapping(mapping: dict):
    try:
        sb = get_supabase()
        sb.table("column_mapping").upsert(
            {"id": 1, "mapping": mapping, "updated_at": datetime.now(timezone.utc).isoformat()}
        ).execute()
    except Exception:
        pass


def _log_upload(file_name: str, file_type: str, row_count: int, date_start: str | None, date_end: str | None):
    try:
        sb = get_supabase()
        sb.table("upload_log").insert({
            "file_name": file_name,
            "file_type": file_type,
            "row_count": row_count,
            "date_range_start": date_start,
            "date_range_end": date_end,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass


def _insert_in_batches(records: list[dict]) -> int:
    sb = get_supabase()
    inserted = 0
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i: i + BATCH_SIZE]
        sb.table("sales_data").insert(batch).execute()
        inserted += len(batch)
    return inserted


def _batch_delete_table(sb, table: str):
    """Delete all rows from a table in a single request instead of paginating
    (id is always > 0, so this matches every row in one call)."""
    sb.table(table).delete().gt("id", 0).execute()


@router.post("/dump", response_model=APIResponse)
def upload_dump(file: UploadFile = File(...)):
    try:
        if not file.filename.endswith((".xlsx", ".xls")):
            return APIResponse(success=False, error="Only .xlsx or .xls files are accepted.")

        print(f"[DUMP] Starting upload: {file.filename}", flush=True)
        content = file.file.read()
        print(f"[DUMP] File read: {len(content)} bytes", flush=True)

        saved_mapping = _load_saved_mapping()
        df, mapping, unresolved = read_and_map_excel(content, saved_mapping)
        del content
        print(f"[DUMP] Excel parsed: {len(df)} rows", flush=True)

        processed = process_dataframe(df, mapping)
        del df
        print(f"[DUMP] Processed: {len(processed)} rows", flush=True)

        sb = get_supabase()
        print("[DUMP] Deleting old sales_data...", flush=True)
        _batch_delete_table(sb, "sales_data")
        print("[DUMP] Old data deleted successfully", flush=True)

        total_rows = len(processed)
        total_batches = (total_rows + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"[DUMP] Inserting {total_rows} rows in {total_batches} chunks of {BATCH_SIZE}...", flush=True)
        print(f"[DUMP] DEBUG branch_nm in processed df, first 5: {processed['branch_nm'].head(5).tolist() if 'branch_nm' in processed.columns else 'COLUMN MISSING'}", flush=True)
        print(f"[DUMP] DEBUG branch_nm null count: {processed['branch_nm'].isna().sum() if 'branch_nm' in processed.columns else 'N/A'} / {total_rows}", flush=True)

        inserted = 0
        for batch_num, i in enumerate(range(0, total_rows, BATCH_SIZE), start=1):
            # Slice + convert ONLY this chunk to records — never build the
            # full records list for all rows in memory at once.
            chunk_df = processed.iloc[i:i + BATCH_SIZE]
            chunk_records = prepare_records(chunk_df)
            if batch_num == 1:
                print(f"[DUMP] DEBUG first record about to be inserted: {chunk_records[0]}", flush=True)
            try:
                sb.table("sales_data").insert(chunk_records).execute()
                inserted += len(chunk_records)
                print(f"[DUMP] Batch {batch_num}/{total_batches} inserted ({inserted}/{total_rows} total)", flush=True)
            except Exception as batch_err:
                print(f"[DUMP] FAILED on batch {batch_num}/{total_batches}: {repr(batch_err)}", flush=True)
                raise
            del chunk_df, chunk_records
            gc.collect()

        print(f"[DUMP] All batches inserted: {inserted} rows", flush=True)

        date_min = processed[processed["doc_time"].notna()]["doc_time"].min() if "doc_time" in processed.columns and not processed["doc_time"].dropna().empty else None
        date_max = processed[processed["doc_time"].notna()]["doc_time"].max() if "doc_time" in processed.columns and not processed["doc_time"].dropna().empty else None

        del processed
        gc.collect()

        _save_mapping(mapping)
        _log_upload(file.filename, "dump", inserted, str(date_min), str(date_max))
        print("[DUMP] Complete.", flush=True)

        return APIResponse(success=True, data={
            "inserted": inserted,
            "mapping": mapping,
            "unresolved_fields": unresolved,
        })
    except Exception as e:
        print(f"[DUMP] FATAL ERROR: {repr(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/daily", response_model=APIResponse)
async def upload_daily(file: UploadFile = File(...)):
    try:
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            return APIResponse(success=False, error="Only .xlsx or .xls files are accepted.")

        contents = await file.read()
        file_name = file.filename

        sb = get_supabase()

        # Get saved mapping from Supabase
        saved_mapping = None
        try:
            resp = sb.table("column_mapping").select("mapping") \
                .order("updated_at", desc=True).limit(1).execute()
            if resp.data:
                saved_mapping = resp.data[0]["mapping"]
        except Exception:
            pass

        df, mapping, unresolved = read_and_map_excel(contents, saved_mapping)
        df = process_dataframe(df, mapping)
        records = prepare_records(df)
        total = len(records)

        # Get date range covered by this file
        date_start = None
        date_end = None
        if "doc_time" in df.columns:
            dates = pd.to_datetime(df["doc_time"], errors="coerce").dropna()
            if len(dates) > 0:
                date_start = dates.min().date().isoformat()
                date_end = dates.max().date().isoformat()

        # Dedup protection: clear any existing rows in this file's date range
        # before inserting, so re-uploading the same/overlapping file never
        # double-counts sales.
        if date_start and date_end:
            sb.table("sales_data") \
                .delete() \
                .gte("doc_time", date_start) \
                .lte("doc_time", date_end + "T23:59:59") \
                .execute()

        # Insert in batches of 200
        inserted = 0
        batch_size = 200
        for i in range(0, total, batch_size):
            batch = records[i:i + batch_size]
            sb.table("sales_data").insert(batch).execute()
            inserted += len(batch)

        # Save upload log
        try:
            sb.table("upload_log").insert({
                "file_name": file_name,
                "file_type": "daily",
                "row_count": inserted,
                "date_range_start": date_start,
                "date_range_end": date_end,
            }).execute()
        except Exception:
            pass

        return APIResponse(success=True, data={
            "inserted": inserted,
            "total_in_file": total,
            "date_range": {"start": date_start, "end": date_end},
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reset", response_model=APIResponse)
def reset_data():
    try:
        sb = get_supabase()
        _batch_delete_table(sb, "sales_data")
        sb.table("upload_log").delete().neq("id", 0).execute()
        sb.table("column_mapping").delete().neq("id", 0).execute()
        return APIResponse(success=True, data={"message": "All sales data deleted successfully."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reset-target", response_model=APIResponse)
def reset_target():
    try:
        sb = get_supabase()
        _batch_delete_table(sb, "target_data")
        return APIResponse(success=True, data={"message": "All target data deleted successfully."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reset-footfall", response_model=APIResponse)
def reset_footfall():
    try:
        sb = get_supabase()
        _batch_delete_table(sb, "footfall_data")
        return APIResponse(success=True, data={"message": "All footfall data deleted successfully."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=APIResponse)
def upload_status():
    try:
        sb = get_supabase()

        # Sales data
        logs_resp = sb.table("upload_log").select("*").order("uploaded_at", desc=True).limit(20).execute()
        logs = logs_resp.data or []
        sales_count = sb.table("sales_data").select("id", count="exact").execute().count or 0
        latest_log = logs[0] if logs else None
        sales = {
            "total_rows": sales_count,
            "last_upload": latest_log,
            "date_range": {
                "start": latest_log.get("date_range_start") if latest_log else None,
                "end": latest_log.get("date_range_end") if latest_log else None,
            } if latest_log else None,
            "upload_log": logs,
        }

        # Target data
        target_count = sb.table("target_data").select("id", count="exact").execute().count or 0
        target_rows = sb.table("target_data").select("month_name,month_num,year,inserted_at").order("inserted_at", desc=True).limit(500).execute().data or []
        months = sorted({f"{r['month_name']} {r['year']}" for r in target_rows}) if target_rows else []
        target = {
            "total_rows": target_count,
            "months": months,
            "last_uploaded": target_rows[0]["inserted_at"] if target_rows else None,
        }

        # Footfall data
        ff_count = sb.table("footfall_data").select("id", count="exact").execute().count or 0
        # Fetch all branch names (entire table is small)
        ff_all = sb.table("footfall_data").select("branch_nm,ff_date,inserted_at").limit(100000).execute().data or []
        ff_branches = sorted({r["branch_nm"] for r in ff_all if r.get("branch_nm")})
        ff_dates = [r["ff_date"] for r in ff_all if r.get("ff_date")]
        ff_last = max((r["inserted_at"] for r in ff_all if r.get("inserted_at")), default=None)
        footfall = {
            "total_rows": ff_count,
            "branches": ff_branches,
            "last_uploaded": ff_last,
            "date_range": {"start": min(ff_dates), "end": max(ff_dates)} if ff_dates else None,
        }

        return APIResponse(success=True, data={
            "sales": sales,
            "target": target,
            "footfall": footfall,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


_STORE_MAP = {
    "ryst-brd": "RYST-BRD",
    "ryst-ho": "RYST-HO",
    "ryst-r2": "RYST-R2",
    "ryst-r4": "RYST-R4",
    "ryst-r5 (bride)": "RYST-R5",
    "ryst-r5 (groom)": "RYST-R5",
    "mumbai gf": "RYST-MMBI",
    "mumbai ff": "RYST-MMBI",
    "mumbai sf": "RYST-MMBI",
}

_MONTH_MAP = {
    "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9,
    "oct": 10, "nov": 11, "dec": 12, "jan": 1, "feb": 2, "mar": 3,
}


def _map_store(raw: str) -> str:
    return _STORE_MAP.get(str(raw).strip().lower(), str(raw).strip())


def _map_month(raw: str) -> int | None:
    return _MONTH_MAP.get(str(raw).strip().lower()[:3])


@router.post("/target", response_model=APIResponse)
def upload_target(file: UploadFile = File(...)):
    try:
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            return APIResponse(success=False, error="Only .xlsx or .xls files accepted.")

        content = file.file.read()
        df = pd.read_excel(BytesIO(content), engine="openpyxl")
        df.columns = [str(c).strip() for c in df.columns]

        col_lower = {c.lower(): c for c in df.columns}
        store_col = next((col_lower[k] for k in col_lower if k in ("store", "store name", "branch")), None)
        month_col = next((col_lower[k] for k in col_lower if k in ("month", "mon")), None)
        day_name_col = next((col_lower[k] for k in col_lower if k == "day"), None)
        date_col = next((col_lower[k] for k in col_lower if k == "date"), None)
        amt_col = next((col_lower[k] for k in col_lower if k in ("amt", "amount", "target", "target amt", "target amount")), None)

        missing = [n for n, c in [("Store", store_col), ("Month", month_col), ("Amt", amt_col)] if c is None]
        if missing:
            return APIResponse(success=False, error=f"Missing required columns: {', '.join(missing)}")

        df = df.dropna(subset=[store_col, month_col, amt_col])
        df["_branch_nm"] = df[store_col].apply(_map_store)
        df["_month_name"] = df[month_col].apply(lambda x: str(x).strip()[:3].capitalize())
        df["_month_num"] = df[month_col].apply(_map_month)
        df["_day_name"] = df[day_name_col].apply(lambda x: str(x).strip()[:3].capitalize()) if day_name_col else None
        df["_day_num"] = pd.to_numeric(df[date_col], errors="coerce").fillna(0).astype(int) if date_col else 0
        df["_target_amt"] = pd.to_numeric(df[amt_col], errors="coerce").fillna(0)
        df["_store_original"] = df[store_col].astype(str).str.strip()
        df["_year"] = date.today().year

        df = df.dropna(subset=["_month_num"])
        df = df[df["_month_num"] > 0]

        sb = get_supabase()
        months_in_file = df["_month_num"].unique().tolist()
        year_val = int(df["_year"].iloc[0])
        for m in months_in_file:
            sb.table("target_data").delete().eq("month_num", int(m)).eq("year", year_val).execute()

        records = [
            {
                "store_original": row["_store_original"],
                "branch_nm": row["_branch_nm"],
                "month_name": row["_month_name"],
                "month_num": int(row["_month_num"]),
                "day_name": row["_day_name"] if day_name_col else None,
                "day_num": int(row["_day_num"]),
                "year": int(row["_year"]),
                "target_amt": float(row["_target_amt"]),
            }
            for _, row in df.iterrows()
        ]

        inserted = 0
        try:
            for i in range(0, len(records), BATCH_SIZE):
                sb.table("target_data").insert(records[i: i + BATCH_SIZE]).execute()
                inserted += len(records[i: i + BATCH_SIZE])
        except Exception as db_err:
            err_str = str(db_err)
            if "42501" in err_str or "row-level security" in err_str.lower():
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Row-level security is blocking inserts on target_data. "
                        "Run this SQL in your Supabase SQL Editor:\n\n"
                        "alter table target_data disable row level security;\n"
                        "grant all on target_data to anon, authenticated;\n"
                        "grant all on all sequences in schema public to anon, authenticated;"
                    ),
                )
            raise HTTPException(status_code=500, detail=err_str)

        month_names = sorted(df["_month_name"].unique().tolist())
        stores_found = sorted(df["_store_original"].unique().tolist())

        return APIResponse(success=True, data={
            "inserted": inserted,
            "months_covered": month_names,
            "stores_found": stores_found,
            "year": year_val,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/target/status", response_model=APIResponse)
def target_status():
    try:
        sb = get_supabase()
        count_resp = sb.table("target_data").select("id", count="exact").execute()
        total_rows = count_resp.count or 0

        if total_rows == 0:
            return APIResponse(success=True, data={"total_rows": 0, "months": [], "last_uploaded": None})

        rows = sb.table("target_data").select("month_name,month_num,year,inserted_at") \
            .order("inserted_at", desc=True).limit(1000).execute().data or []

        months = sorted({f"{r['month_name']} {r['year']}" for r in rows})
        last_uploaded = rows[0]["inserted_at"] if rows else None

        return APIResponse(success=True, data={
            "total_rows": total_rows,
            "months": months,
            "last_uploaded": last_uploaded,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Footfall upload ────────────────────────────────────────────────────────

def _clean_branch(raw: str) -> str:
    """'0001-RYST-HO' → 'RYST-HO'. Skip leading numeric segment."""
    parts = str(raw).strip().split("-")
    if len(parts) >= 2 and parts[0].isdigit():
        return "-".join(parts[1:])
    return str(raw).strip()


_MONTH_NUM_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4,
    "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8,
    "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


@router.post("/footfall", response_model=APIResponse)
def upload_footfall(file: UploadFile = File(...)):
    try:
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            return APIResponse(success=False, error="Only .xlsx or .xls files accepted.")

        contents = file.file.read()
        df = pd.read_excel(BytesIO(contents), engine="openpyxl")
        df.columns = [str(c).strip() for c in df.columns]

        # Clean branch names
        df["branch_nm"] = df["branch_nm"].apply(_clean_branch)

        # Convert ff_date to string YYYY-MM-DD
        df["ff_date"] = pd.to_datetime(df["ff_date"], errors="coerce").dt.strftime("%Y-%m-%d")

        # Normalize ff_month to uppercase
        df["ff_month"] = df["ff_month"].astype(str).str.strip().str.upper()

        # Compute ff_month_num from ff_month
        df["ff_month_num"] = df["ff_month"].map(_MONTH_NUM_MAP).fillna(0).astype(int)

        # ff_year as integer
        df["ff_year"] = pd.to_numeric(df["ff_year"], errors="coerce").fillna(0).astype(int)

        # footfall as integer
        df["footfall"] = pd.to_numeric(df["footfall"], errors="coerce").fillna(0).astype(int)

        # Drop rows with missing critical fields
        df = df.dropna(subset=["branch_nm", "ff_date"])

        # Deduplicate on branch_nm + ff_date
        original_count = len(df)
        df = df.drop_duplicates(subset=["branch_nm", "ff_date"], keep="first")
        duplicates_removed = original_count - len(df)

        # Keep only valid columns for insertion
        valid_cols = ["branch_nm", "ff_date", "ff_month", "ff_month_num", "ff_year", "footfall"]
        df = df[[c for c in valid_cols if c in df.columns]]

        # Get date range for pre-delete
        min_date = df["ff_date"].min()
        max_date = df["ff_date"].max()

        # Delete existing rows in this date range
        sb = get_supabase()
        sb.table("footfall_data").delete().gte("ff_date", min_date).lte("ff_date", max_date).execute()

        # Insert in batches of 500
        records = df.to_dict(orient="records")
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            sb.table("footfall_data").insert(batch).execute()

        branches = sorted(df["branch_nm"].unique().tolist())

        return APIResponse(success=True, data={
            "inserted": len(records),
            "duplicates_removed": duplicates_removed,
            "date_range": {"start": min_date, "end": max_date},
            "branches": branches,
        })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/footfall/status", response_model=APIResponse)
def footfall_status():
    try:
        sb = get_supabase()
        count_resp = sb.table("footfall_data").select("id", count="exact").execute()
        total_rows = count_resp.count or 0

        if total_rows == 0:
            return APIResponse(success=True, data={"total_rows": 0, "branches": [], "last_uploaded": None, "date_range": None})

        rows = sb.table("footfall_data").select("branch_nm,ff_date,inserted_at") \
            .limit(100000).execute().data or []

        branches = sorted({r["branch_nm"] for r in rows if r.get("branch_nm")})
        last_uploaded = max((r["inserted_at"] for r in rows if r.get("inserted_at")), default=None)
        dates = [r["ff_date"] for r in rows if r.get("ff_date")]
        date_range = {"start": min(dates), "end": max(dates)} if dates else None

        return APIResponse(success=True, data={
            "total_rows": total_rows,
            "branches": branches,
            "last_uploaded": last_uploaded,
            "date_range": date_range,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))