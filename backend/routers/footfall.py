import calendar
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import pandas as pd
from datetime import date

from models.schemas import APIResponse
from services.supabase_client import get_supabase
from services.data_processor import get_date_range

router = APIRouter(prefix="/api/footfall", tags=["footfall"])

_FY_START_MONTH = 4  # April


def _ff_rows(select: str, filters: list) -> list:
    """Paginate footfall_data with given filters."""
    sb = get_supabase()
    query = sb.table("footfall_data").select(select)
    for op, col, val in filters:
        if op == "eq":
            query = query.eq(col, val)
        elif op == "gte":
            query = query.gte(col, val)
        elif op == "lte":
            query = query.lte(col, val)
    rows = []
    offset = 0
    page_size = 1000
    while True:
        resp = query.range(offset, offset + page_size - 1).execute()
        if not resp.data:
            break
        rows.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return rows


def _ytd_ff_rows(year: int, select: str) -> list:
    today = date.today()
    cur_month = today.month
    if cur_month >= _FY_START_MONTH:
        return _ff_rows(select, [
            ("eq",  "ff_year",      year),
            ("gte", "ff_month_num", _FY_START_MONTH),
            ("lte", "ff_month_num", cur_month),
        ])
    # Jan/Feb/Mar: spans prev calendar year Apr-Dec + this year Jan-cur
    prev = _ff_rows(select, [
        ("eq",  "ff_year",      year - 1),
        ("gte", "ff_month_num", _FY_START_MONTH),
    ])
    curr = _ff_rows(select, [
        ("eq",  "ff_year",      year),
        ("lte", "ff_month_num", cur_month),
    ])
    return prev + curr


def _mtd_ff_rows(year: int, select: str) -> list:
    today = date.today()
    return _ff_rows(select, [
        ("eq", "ff_year",      year),
        ("eq", "ff_month_num", today.month),
    ])


def _period_ff_rows(period: str, year: int, select: str) -> list:
    if period == "mtd":
        return _mtd_ff_rows(year, select)
    return _ytd_ff_rows(year, select)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/available-months", response_model=APIResponse)
def get_available_months():
    try:
        sb = get_supabase()
        resp = sb.table("footfall_data").select("ff_year,ff_month,ff_month_num").execute()
        rows = resp.data or []
        seen = set()
        months = []
        for r in rows:
            key = (r["ff_year"], r["ff_month_num"])
            if key not in seen:
                seen.add(key)
                months.append({
                    "year": r["ff_year"],
                    "month_num": r["ff_month_num"],
                    "month_name": r["ff_month"],
                    "label": f"{r['ff_month']} {r['ff_year']}",
                })
        months.sort(key=lambda x: (x["year"], x["month_num"]), reverse=True)
        return APIResponse(success=True, data={"months": months})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/branches", response_model=APIResponse)
def get_footfall_branches():
    try:
        sb = get_supabase()
        resp = sb.table("footfall_data").select("branch_nm").limit(10000).execute()
        rows = resp.data or []
        branches = sorted({r["branch_nm"] for r in rows if r.get("branch_nm")})
        return APIResponse(success=True, data={"branches": branches})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=APIResponse)
def get_footfall_summary(
    period: str = Query("ytd"),
    years: str = Query("2026"),
):
    try:
        year_list = [int(y.strip()) for y in years.split(",") if y.strip()]
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        result = {}
        for year in year_list:
            rows = _period_ff_rows(period, year, "branch_nm,footfall")
            if not rows:
                result[str(year)] = {"total": 0, "by_branch": [], "top_branch": None, "avg_daily": 0}
                continue

            df = pd.DataFrame(rows)
            df["footfall"] = pd.to_numeric(df["footfall"], errors="coerce").fillna(0)

            total = int(df["footfall"].sum())
            by_branch = df.groupby("branch_nm")["footfall"].sum().sort_values(ascending=False)

            top_branch = None
            if not by_branch.empty:
                top_nm = by_branch.index[0]
                top_branch = {"name": top_nm, "footfall": int(by_branch.iloc[0])}

            # Estimate days in period for avg_daily
            today = date.today()
            if period == "mtd":
                days_count = today.day
            else:
                if today.month >= _FY_START_MONTH:
                    from dateutil.relativedelta import relativedelta
                    start = date(year, _FY_START_MONTH, 1)
                    end_d = date(year, today.month, today.day)
                    days_count = max((end_d - start).days + 1, 1)
                else:
                    days_count = 365  # rough fallback

            avg_daily = round(total / max(days_count, 1), 1)

            result[str(year)] = {
                "total": total,
                "by_branch": [{"branch": b, "footfall": int(v)} for b, v in by_branch.items()],
                "top_branch": top_branch,
                "avg_daily": avg_daily,
            }

        return APIResponse(success=True, data={"years": result, "period": period})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-trend", response_model=APIResponse)
def get_footfall_monthly_trend(
    years: str = Query("2026"),
):
    try:
        year_list = [int(y.strip()) for y in years.split(",") if y.strip()]
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        result = {}
        for year in year_list:
            rows = _ff_rows("ff_month,ff_month_num,footfall", [("eq", "ff_year", year)])
            if not rows:
                result[str(year)] = []
                continue

            df = pd.DataFrame(rows)
            df["footfall"] = pd.to_numeric(df["footfall"], errors="coerce").fillna(0)
            df["ff_month_num"] = pd.to_numeric(df["ff_month_num"], errors="coerce").fillna(0).astype(int)

            grouped = (
                df.groupby(["ff_month_num", "ff_month"])["footfall"]
                .sum()
                .reset_index()
                .sort_values("ff_month_num")
            )

            result[str(year)] = [
                {
                    "month": str(r["ff_month"]).strip().capitalize(),
                    "month_num": int(r["ff_month_num"]),
                    "footfall": int(r["footfall"]),
                }
                for _, r in grouped.iterrows()
            ]

        return APIResponse(success=True, data={"years": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily", response_model=APIResponse)
def get_footfall_daily(
    year: int = Query(2026),
    month_num: int = Query(...),
    branch: Optional[str] = Query(None),
):
    try:
        filters = [
            ("eq", "ff_year",      year),
            ("eq", "ff_month_num", month_num),
        ]
        if branch and branch.lower() != "all":
            filters.append(("eq", "branch_nm", branch))

        rows = _ff_rows("branch_nm,ff_date,footfall", filters)

        days_in_month = calendar.monthrange(year, month_num)[1]

        if not rows:
            days_result = [{"day": d, "date": None, "weekday": "", "footfall": 0} for d in range(1, days_in_month + 1)]
            return APIResponse(success=True, data={"days": days_result, "total": 0, "branch": branch, "year": year, "month_num": month_num})

        df = pd.DataFrame(rows)
        df["footfall"] = pd.to_numeric(df["footfall"], errors="coerce").fillna(0)
        df["ff_date_parsed"] = pd.to_datetime(df["ff_date"], errors="coerce")
        df["day_num"] = df["ff_date_parsed"].dt.day
        df["weekday"] = df["ff_date_parsed"].dt.strftime("%a")

        grouped = (
            df.groupby(["day_num", "ff_date", "weekday"])["footfall"]
            .sum()
            .reset_index()
            .sort_values("day_num")
        )
        day_map = {int(r["day_num"]): r for _, r in grouped.iterrows()}

        days_result = []
        for d in range(1, days_in_month + 1):
            if d in day_map:
                r = day_map[d]
                days_result.append({
                    "day": d,
                    "date": r["ff_date"],
                    "weekday": r["weekday"],
                    "footfall": int(r["footfall"]),
                })
            else:
                days_result.append({"day": d, "date": None, "weekday": "", "footfall": 0})

        total = int(df["footfall"].sum())
        return APIResponse(success=True, data={
            "days": days_result,
            "total": total,
            "branch": branch,
            "year": year,
            "month_num": month_num,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversion", response_model=APIResponse)
def get_footfall_conversion(
    period: str = Query("ytd"),
    years: str = Query("2026"),
):
    try:
        year_list = [int(y.strip()) for y in years.split(",") if y.strip()]
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        result = {}
        for year in year_list:
            ff_rows = _period_ff_rows(period, year, "branch_nm,footfall")
            if not ff_rows:
                result[str(year)] = []
                continue

            ff_df = pd.DataFrame(ff_rows)
            ff_df["footfall"] = pd.to_numeric(ff_df["footfall"], errors="coerce").fillna(0)
            ff_by_branch = ff_df.groupby("branch_nm")["footfall"].sum()

            # Fetch transaction count per branch from sales_data
            try:
                start, end = get_date_range(period, year)
                sb = get_supabase()
                txn_rows = []
                offset = 0
                page_size = 1000
                while True:
                    resp = sb.table("sales_data") \
                        .select("branch_nm,doc_cd") \
                        .gte("doc_time", start) \
                        .lte("doc_time", end + "T23:59:59") \
                        .range(offset, offset + page_size - 1) \
                        .execute()
                    if not resp.data:
                        break
                    txn_rows.extend(resp.data)
                    if len(resp.data) < page_size:
                        break
                    offset += page_size

                if txn_rows:
                    txn_df = pd.DataFrame(txn_rows)
                    txn_by_branch = txn_df.groupby("branch_nm")["doc_cd"].nunique()
                else:
                    txn_by_branch = pd.Series(dtype=float)
            except Exception:
                txn_by_branch = pd.Series(dtype=float)

            all_branches = sorted(ff_by_branch.index.tolist())
            branch_rows = []
            for b in all_branches:
                ff = int(ff_by_branch.get(b, 0))
                txn = int(txn_by_branch.get(b, 0)) if b in txn_by_branch.index else 0
                conv = round(txn / ff * 100, 1) if ff > 0 else 0.0
                branch_rows.append({
                    "branch": b,
                    "footfall": ff,
                    "transactions": txn,
                    "conversion_pct": conv,
                })

            result[str(year)] = sorted(branch_rows, key=lambda x: x["footfall"], reverse=True)

        return APIResponse(success=True, data={"years": result, "period": period})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
