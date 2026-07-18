import calendar
from datetime import date
from io import BytesIO
from typing import Optional
import pandas as pd

from services.column_detector import detect_columns


def get_date_range(period: str, year: int) -> tuple[str, str]:
    today = date.today()

    if period == "mtd":
        start = date(year, today.month, 1)
        end_day = min(today.day, calendar.monthrange(year, today.month)[1])
        end = date(year, today.month, end_day)
    else:
        fy_start_yr = year if today.month >= 4 else year - 1
        start = date(fy_start_yr, 4, 1)
        end_month = today.month
        end_day = min(today.day, calendar.monthrange(year, end_month)[1])
        end = date(year, end_month, end_day)

    return start.isoformat(), end.isoformat()


def read_and_map_excel(file_bytes: bytes, saved_mapping=None):
    # read_only=True uses openpyxl's streaming mode instead of building the
    # full in-memory workbook object model — critical for large files on
    # memory-constrained servers (avoids OOM crashes on 500MB+ files).
    xl = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")

    if len(xl.sheet_names) == 1:
        # Common case (single-sheet dump/daily files) — read once, no need
        # to compare row counts across sheets.
        df = pd.read_excel(
            BytesIO(file_bytes),
            sheet_name=xl.sheet_names[0],
            engine="openpyxl",
            engine_kwargs={"read_only": True},
        )
    else:
        # Multiple sheets — read each to find the one with the most rows.
        best_df = None
        best_rows = 0
        for sheet in xl.sheet_names:
            try:
                temp_df = pd.read_excel(
                    BytesIO(file_bytes),
                    sheet_name=sheet,
                    engine="openpyxl",
                    engine_kwargs={"read_only": True},
                )
                if len(temp_df) > best_rows:
                    best_rows = len(temp_df)
                    best_df = temp_df
                del temp_df
            except Exception:
                continue

        df = best_df if best_df is not None else pd.read_excel(
            BytesIO(file_bytes), engine="openpyxl", engine_kwargs={"read_only": True}
        )

    # Strip column name whitespace
    df.columns = [str(c).strip() for c in df.columns]

    # Deduplicate column names
    cols = pd.Series(df.columns)
    for dup in cols[cols.duplicated()].unique():
        indices = cols[cols == dup].index.tolist()
        for i, idx in enumerate(indices):
            if i > 0:
                cols[idx] = f"{dup}_{i}"
    df.columns = cols

    # Hardcoded column selection — only keep required columns
    REQUIRED_COLUMNS = {
        "qty":        "qty",
        "branch_nm":  "branch_nm",
        "doc_cd":     "doc_cd",
        "brand_desc": "brand_desc",
        "dept_desc":  "dept_desc",
        "style_desc": "style_desc",
        "sales_rep":  "sales_rep",
        "doc_dt":     "doc_time",   # new raw format uses doc_dt
        "doc_time":   "doc_time",   # fallback for old format
        "amount1":    "amount1",
    }

    rename_dict = {}
    for col in df.columns:
        col_lower = col.strip().lower()
        if col_lower in REQUIRED_COLUMNS:
            internal_name = REQUIRED_COLUMNS[col_lower]
            rename_dict[col] = internal_name

    df = df.rename(columns=rename_dict)

    KEEP_COLS = ["qty", "branch_nm", "doc_cd", "brand_desc",
                 "dept_desc", "style_desc", "sales_rep",
                 "doc_time", "amount1"]
    df = df[[c for c in KEEP_COLS if c in df.columns]]

    mapping = {internal: internal for internal in df.columns}
    unresolved = [c for c in KEEP_COLS if c not in df.columns]

    return df, mapping, unresolved


def process_dataframe(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    if "doc_time" in df.columns:
        df["doc_time"] = pd.to_datetime(df["doc_time"], errors="coerce")
        df = df.dropna(subset=["doc_time"])
        # Drop epoch/zero dates — any date before 2000 is bad data
        df = df[df["doc_time"].dt.year >= 2000]

        df["year"]  = df["doc_time"].dt.year
        df["month"] = df["doc_time"].dt.strftime("%b")
        df["days"]  = df["doc_time"].dt.day

        def get_fy(dt):
            if dt.month >= 4:
                return f"{dt.year}-{str(dt.year + 1)[2:]}"
            else:
                return f"{dt.year - 1}-{str(dt.year)[2:]}"

        df["fy"] = df["doc_time"].apply(get_fy)
        df["doc_time"] = df["doc_time"].dt.strftime("%Y-%m-%dT%H:%M:%S")

    if "amount1" in df.columns:
        df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0.0)

    if "qty" in df.columns:
        df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0).astype(int)

    if "dept_desc" in df.columns:
        df["category"] = df["dept_desc"].apply(
            lambda x: "Bride"
            if isinstance(x, str) and x.strip().startswith("L ")
            else "Groom"
        )
    else:
        df["category"] = "Groom"

    if "sales_rep" in df.columns:
        df["sales_rep"] = df["sales_rep"].apply(
            lambda x: x.strip().title()
            if isinstance(x, str) and x.strip()
            else None
        )

    supabase_cols = [
        "fy", "acct_cd", "acct_nm", "qty", "branch_nm",
        "doc_cd", "pay_type", "brand_desc", "dept_desc",
        "size_desc", "style_desc", "sales_rep", "doc_time",
        "amount1", "days", "month", "year", "category",
    ]
    for col in supabase_cols:
        if col not in df.columns:
            df[col] = None

    return df[supabase_cols]


def prepare_records(df: pd.DataFrame) -> list[dict]:
    df = df.copy()

    df = df.replace({float("nan"): None})
    df = df.where(df.notna(), None)

    import pandas.api.types as ptypes
    datetime_cols = [col for col in df.columns if ptypes.is_datetime64_any_dtype(df[col])]
    for col in datetime_cols:
        df[col] = df[col].dt.strftime("%Y-%m-%dT%H:%M:%S").where(df[col].notna(), None)

    def _serialize(val):
        if isinstance(val, pd.Timestamp):
            return val.isoformat()
        if hasattr(val, "item"):
            return val.item()
        return val

    records = [
        {k: _serialize(v) for k, v in row.items()}
        for row in df.where(pd.notnull(df), None).to_dict(orient="records")
    ]
    return records