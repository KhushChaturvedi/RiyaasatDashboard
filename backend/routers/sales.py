from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import pandas as pd
import time
from datetime import date

from models.schemas import APIResponse
from services.supabase_client import fetch_all_rows, get_supabase
from services.data_processor import get_date_range

router = APIRouter(prefix="/api/sales", tags=["sales"])

EXCLUDED_BRANCHES = ["RYST-ONLINE"]
EXCLUDED_SALESMEN_UPPER = ["AKSHAR FASHION", "TILAK", "AKSHAR", "SELF"]
EXCLUDED_BRANDS = ["TILAK"]

_HARDCODED_BRANCHES = ["RYST-HO", "RYST-R2", "RYST-R4", "RYST-R5", "RYST-MMBI", "RYST-BRD"]


def _parse_years(years_param: str) -> list[int]:
    try:
        return [int(y.strip()) for y in years_param.split(",") if y.strip()]
    except ValueError:
        return []


def _fetch_period_df(year: int, period: str, columns: str, extra_filters: list[tuple] = None) -> pd.DataFrame:
    start, end = get_date_range(period, year)
    filters = [
        ("gte", "doc_time", start),
        ("lte", "doc_time", end + "T23:59:59"),
    ]
    if extra_filters:
        filters.extend(extra_filters)
    rows = fetch_all_rows("sales_data", columns, filters)
    return pd.DataFrame(rows) if rows else pd.DataFrame()


@router.get("/summary", response_model=APIResponse)
def get_summary(
    period: str = Query("ytd"),
    years: str = Query("2026"),
):
    try:
        year_list = _parse_years(years)
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        result = {}
        for year in year_list:
            df = _fetch_period_df(year, period, "amount1,qty,doc_cd,branch_nm")
            if df.empty:
                result[str(year)] = {
                    "total_sales": 0, "total_qty": 0,
                    "total_transactions": 0, "top_branch": None,
                }
                continue

            df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0)
            df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0)

            total_sales = round(float(df["amount1"].sum()), 2)
            total_qty = int(df["qty"].sum())
            total_txn = df["doc_cd"].nunique() if "doc_cd" in df.columns else len(df)

            top_branch = None
            if "branch_nm" in df.columns:
                branch_sales = df.groupby("branch_nm")["amount1"].sum().sort_values(ascending=False)
                branch_sales = branch_sales[~branch_sales.index.isin(EXCLUDED_BRANCHES)]
                if not branch_sales.empty:
                    top_branch = {
                        "name": branch_sales.index[0],
                        "amount": round(float(branch_sales.iloc[0]), 2),
                    }

            result[str(year)] = {
                "total_sales": total_sales,
                "total_qty": total_qty,
                "total_transactions": total_txn,
                "top_branch": top_branch,
            }

        start, end = get_date_range(period, year_list[0])
        return APIResponse(success=True, data={
            "years": result,
            "period": period,
            "date_range": {"start": start, "end": end}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands", response_model=APIResponse)
def get_brands(
    period: str = Query("ytd"),
    years: str = Query("2026"),
    metric: str = Query("amount"),
):
    try:
        year_list = _parse_years(years)
        result = {}

        for year in year_list:
            df = _fetch_period_df(year, period, "brand_desc,dept_desc,category,amount1,qty")
            if df.empty:
                result[str(year)] = {"bride": [], "groom": []}
                continue

            df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0)
            df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0)

            if "category" not in df.columns or df["category"].isna().all():
                df["category"] = df["dept_desc"].apply(
                    lambda x: "Bride" if isinstance(x, str) and x.strip().startswith("L ") else "Groom"
                )

            val_col = "amount1" if metric == "amount" else "qty"
            year_result = {}

            for cat in ["Bride", "Groom"]:
                cat_df = df[df["category"] == cat]
                if cat_df.empty:
                    year_result[cat.lower()] = []
                    continue
                grouped = (
                    cat_df.groupby("brand_desc")[val_col]
                    .sum()
                    .sort_values(ascending=False)
                    .head(5)
                )
                year_result[cat.lower()] = [
                    {"brand": b, "value": round(float(v), 2)}
                    for b, v in grouped.items()
                    if b not in EXCLUDED_BRANDS
                ]

            result[str(year)] = year_result

        return APIResponse(success=True, data={
            "years": result,
            "period": period,
            "metric": metric
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salesmen/company", response_model=APIResponse)
def get_salesmen_company(
    period: str = Query("ytd"),
    years: str = Query("2026"),
):
    try:
        year_list = _parse_years(years)
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        current_year = year_list[0]
        compare_years = year_list[1:]

        current_df = _fetch_period_df(current_year, period, "sales_rep,amount1,qty")
        if current_df.empty:
            return APIResponse(success=True, data={"salesmen": [], "period": period})

        current_df["amount1"] = pd.to_numeric(current_df["amount1"], errors="coerce").fillna(0)
        current_df["qty"] = pd.to_numeric(current_df["qty"], errors="coerce").fillna(0)
        current_df = current_df[current_df["sales_rep"].notna() & (current_df["sales_rep"].astype(str).str.strip() != "")]
        current_df["sales_rep"] = current_df["sales_rep"].astype(str).str.strip().str.title()
        current_df = current_df[~current_df["sales_rep"].str.upper().str.strip().isin(EXCLUDED_SALESMEN_UPPER)]

        top10 = (
            current_df.groupby("sales_rep")["amount1"]
            .sum()
            .sort_values(ascending=False)
            .head(10)
        )

        compare_data = {}
        for yr in compare_years:
            cdf = _fetch_period_df(yr, period, "sales_rep,amount1")
            if not cdf.empty:
                cdf["amount1"] = pd.to_numeric(cdf["amount1"], errors="coerce").fillna(0)
                cdf = cdf[cdf["sales_rep"].notna() & (cdf["sales_rep"].astype(str).str.strip() != "")]
                cdf["sales_rep"] = cdf["sales_rep"].astype(str).str.strip().str.title()
                cdf = cdf[~cdf["sales_rep"].str.upper().str.strip().isin(EXCLUDED_SALESMEN_UPPER)]
                compare_data[str(yr)] = cdf.groupby("sales_rep")["amount1"].sum().to_dict()

        salesmen = []
        for name, curr_amt in top10.items():
            row = {
                "name": name,
                "current_amount": round(float(curr_amt), 2),
                "comparisons": {},
            }
            for yr, yr_data in compare_data.items():
                prev_amt = yr_data.get(name, 0)
                growth = ((float(curr_amt) - prev_amt) / prev_amt * 100) if prev_amt else None
                row["comparisons"][yr] = {
                    "amount": round(float(prev_amt), 2),
                    "growth_pct": round(growth, 1) if growth is not None else None,
                }
            salesmen.append(row)

        return APIResponse(success=True, data={"salesmen": salesmen, "period": period})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salesmen/branch", response_model=APIResponse)
def get_salesmen_branch(
    period: str = Query("ytd"),
    years: str = Query("2026"),
    branch: str = Query(...),
):
    try:
        year_list = _parse_years(years)
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        if branch in EXCLUDED_BRANCHES:
            return APIResponse(success=True, data={"salesmen": [], "branch": branch, "period": period})

        current_year = year_list[0]
        compare_years = year_list[1:]

        extra = [("eq", "branch_nm", branch)]
        current_df = _fetch_period_df(current_year, period, "sales_rep,amount1,qty,branch_nm", extra)

        if current_df.empty:
            return APIResponse(success=True, data={"salesmen": [], "branch": branch, "period": period})

        current_df["amount1"] = pd.to_numeric(current_df["amount1"], errors="coerce").fillna(0)
        current_df = current_df[current_df["sales_rep"].notna() & (current_df["sales_rep"].astype(str).str.strip() != "")]
        current_df["sales_rep"] = current_df["sales_rep"].astype(str).str.strip().str.title()
        current_df = current_df[~current_df["sales_rep"].str.upper().str.strip().isin(EXCLUDED_SALESMEN_UPPER)]

        top5 = (
            current_df.groupby("sales_rep")["amount1"]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )

        compare_data = {}
        for yr in compare_years:
            cdf = _fetch_period_df(yr, period, "sales_rep,amount1,branch_nm", extra)
            if not cdf.empty:
                cdf["amount1"] = pd.to_numeric(cdf["amount1"], errors="coerce").fillna(0)
                cdf = cdf[cdf["sales_rep"].notna() & (cdf["sales_rep"].astype(str).str.strip() != "")]
                cdf["sales_rep"] = cdf["sales_rep"].astype(str).str.strip().str.title()
                cdf = cdf[~cdf["sales_rep"].str.upper().str.strip().isin(EXCLUDED_SALESMEN_UPPER)]
                compare_data[str(yr)] = cdf.groupby("sales_rep")["amount1"].sum().to_dict()

        salesmen = []
        for name, curr_amt in top5.items():
            row = {
                "name": name,
                "current_amount": round(float(curr_amt), 2),
                "comparisons": {},
            }
            for yr, yr_data in compare_data.items():
                prev_amt = yr_data.get(name, 0)
                growth = ((float(curr_amt) - prev_amt) / prev_amt * 100) if prev_amt else None
                row["comparisons"][yr] = {
                    "amount": round(float(prev_amt), 2),
                    "growth_pct": round(growth, 1) if growth is not None else None,
                }
            salesmen.append(row)

        return APIResponse(success=True, data={"salesmen": salesmen, "branch": branch, "period": period})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/designs", response_model=APIResponse)
def get_designs(
    period: str = Query("ytd"),
    years: str = Query("2026"),
    metric: str = Query("amount"),
):
    try:
        year_list = _parse_years(years)
        if not year_list:
            return APIResponse(success=False, error="Invalid years.")

        year = year_list[0]
        df = _fetch_period_df(year, period, "style_desc,brand_desc,dept_desc,category,amount1,qty")

        if df.empty:
            return APIResponse(success=True, data={
                "top": {"bride": [], "groom": []},
                "bottom": {"bride": [], "groom": []},
                "period": period
            })

        df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0)
        df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0)

        if "category" not in df.columns or df["category"].isna().all():
            df["category"] = df["dept_desc"].apply(
                lambda x: "Bride" if isinstance(x, str) and x.strip().startswith("L ") else "Groom"
            )

        # val_col refers to the agg output column names: "amount" or "qty"
        val_col = "amount" if metric == "amount" else "qty"

        result = {"top": {}, "bottom": {}}

        for cat in ["Bride", "Groom"]:
            cat_df = df[df["category"] == cat].copy()
            if cat_df.empty:
                result["top"][cat.lower()] = []
                result["bottom"][cat.lower()] = []
                continue

            grouped = (
                cat_df.groupby(["style_desc", "brand_desc", "dept_desc"])
                .agg(
                    qty=("qty", "sum"),
                    amount=("amount1", "sum"),
                )
                .reset_index()
                .sort_values(val_col, ascending=False)
            )

            def fmt_row(r):
                return {
                    "style_desc": r["style_desc"],
                    "brand_desc": r["brand_desc"],
                    "dept_desc": r["dept_desc"],
                    "qty": int(r["qty"]),
                    "amount": round(float(r["amount"]), 2),
                }

            result["top"][cat.lower()] = [fmt_row(r) for _, r in grouped.head(5).iterrows()]
            result["bottom"][cat.lower()] = [fmt_row(r) for _, r in grouped.tail(5).iterrows()]

        return APIResponse(success=True, data={**result, "period": period, "metric": metric})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/departments", response_model=APIResponse)
def get_departments(
    period: str = Query("ytd"),
    years: str = Query("2026"),
    metric: str = Query("amount"),
):
    try:
        year_list = _parse_years(years)
        result = {}
        val_col = "amount" if metric == "amount" else "qty"

        def _top10(subset: pd.DataFrame) -> list[dict]:
            if subset.empty:
                return []
            grouped = (
                subset.groupby("dept_desc")
                .agg(qty=("qty", "sum"), amount=("amount1", "sum"))
                .reset_index()
                .sort_values(val_col, ascending=False)
                .head(10)
            )
            return [
                {"dept_desc": r["dept_desc"], "qty": int(r["qty"]), "amount": round(float(r["amount"]), 2)}
                for _, r in grouped.iterrows()
            ]

        for year in year_list:
            df = _fetch_period_df(year, period, "dept_desc,amount1,qty")
            if df.empty:
                result[str(year)] = {"bride": [], "groom": []}
                continue

            df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0)
            df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0)

            bride_mask = df["dept_desc"].apply(lambda x: isinstance(x, str) and x.strip().startswith("L "))
            result[str(year)] = {
                "bride": _top10(df[bride_mask]),
                "groom": _top10(df[~bride_mask]),
            }

        return APIResponse(success=True, data={"years": result, "period": period, "metric": metric})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/branches", response_model=APIResponse)
def get_branches():
    return APIResponse(success=True, data={"branches": _HARDCODED_BRANCHES})


def _get_ytd_months(today: date) -> list[int]:
    """April through current month (financial year Apr-Mar)."""
    if today.month >= 4:
        return list(range(4, today.month + 1))
    # Jan-Mar: we've crossed into next calendar year of the FY
    return list(range(4, 13)) + list(range(1, today.month + 1))


def _fetch_target_by_branch(year: int, months: list[int]) -> dict[str, float]:
    """Return {branch_nm: sum(target_amt)} for given year+months from target_data."""
    try:
        sb = get_supabase()
        rows = sb.table("target_data") \
            .select("branch_nm,target_amt") \
            .eq("year", year) \
            .in_("month_num", months) \
            .execute().data or []
        result: dict[str, float] = {}
        for r in rows:
            b = r.get("branch_nm") or "Unknown"
            result[b] = result.get(b, 0.0) + float(r.get("target_amt") or 0)
        return result
    except Exception:
        return {}


@router.get("/target-vs-actual", response_model=APIResponse)
def get_target_vs_actual(
    period: str = Query("ytd"),
    years: str = Query("2026"),
):
    try:
        today = date.today()
        year_list = _parse_years(years)
        if not year_list:
            return APIResponse(success=False, error="Invalid years parameter.")

        months = [today.month] if period == "mtd" else _get_ytd_months(today)

        company_result: dict[str, dict] = {}
        branches_result: dict[str, list] = {}

        for year in year_list:
            # Actual sales
            df = _fetch_period_df(year, period, "branch_nm,amount1")
            if not df.empty:
                df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0)
                actual_by_branch = df.groupby("branch_nm")["amount1"].sum().to_dict()
            else:
                actual_by_branch = {}
            company_actual = sum(actual_by_branch.values())

            # Target
            target_by_branch = _fetch_target_by_branch(year, months)
            company_target = sum(target_by_branch.values())

            def _pct(actual: float, target: float) -> Optional[float]:
                if target > 0:
                    return round(actual / target * 100, 1)
                return None

            company_result[str(year)] = {
                "actual": round(company_actual, 2),
                "target": round(company_target, 2),
                "achievement_pct": _pct(company_actual, company_target),
            }

            all_branches = sorted(set(list(actual_by_branch.keys()) + list(target_by_branch.keys())))
            all_branches = [b for b in all_branches if b not in EXCLUDED_BRANCHES]
            branch_rows = []
            for b in all_branches:
                act = actual_by_branch.get(b, 0.0)
                tgt = target_by_branch.get(b, 0.0)
                branch_rows.append({
                    "branch": b,
                    "actual": round(act, 2),
                    "target": round(tgt, 2),
                    "achievement_pct": _pct(act, tgt),
                    "gap": round(act - tgt, 2),
                })
            branches_result[str(year)] = branch_rows

        return APIResponse(success=True, data={
            "company": company_result,
            "branches": branches_result,
            "period": period,
            "months": months,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/target-daywise", response_model=APIResponse)
def get_target_daywise(
    month: int = Query(...),
    year: int = Query(...),
):
    try:
        sb = get_supabase()
        rows = sb.table("target_data") \
            .select("branch_nm,day_num,day_name,target_amt") \
            .eq("year", year) \
            .eq("month_num", month) \
            .order("day_num") \
            .execute().data or []

        # Group by day_num
        days: dict[int, dict] = {}
        for r in rows:
            d = int(r.get("day_num") or 0)
            b = r.get("branch_nm") or "Unknown"
            amt = float(r.get("target_amt") or 0)
            if d not in days:
                days[d] = {"day": d, "day_name": r.get("day_name"), "branches": {}, "total": 0.0}
            days[d]["branches"][b] = days[d]["branches"].get(b, 0.0) + amt
            days[d]["total"] = round(days[d]["total"] + amt, 2)

        day_list = [days[k] for k in sorted(days.keys())]

        return APIResponse(success=True, data={
            "days": day_list,
            "month": month,
            "year": year,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))