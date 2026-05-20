import calendar
from datetime import date, timedelta
from io import BytesIO
from typing import Optional
import pandas as pd

from services.column_detector import detect_columns


def get_date_range(period: str, year: int) -> tuple[str, str]:
    today = date.today()
    yesterday = today - timedelta(days=1)

    if period == "mtd":
        start = date(year, today.month, 1)
        end_day = min(yesterday.day, calendar.monthrange(year, today.month)[1])
        end = date(year, today.month, end_day)
    else:
        fy_start_yr = year if today.month >= 4 else year - 1
        start = date(fy_start_yr, 4, 1)
        end_month = yesterday.month
        end_day = min(yesterday.day, calendar.monthrange(year, end_month)[1])
        end = date(year, end_month, end_day)

    return start.isoformat(), end.isoformat()


COLUMN_ALIASES = {
    "branch": "branch_nm",
    "months": "month",
    "temp":   "fy",
}


def read_and_map_excel(file_bytes: bytes, saved_mapping: Optional[dict] = None) -> tuple[pd.DataFrame, dict, list]:
    df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    df.columns = [str(c).strip() for c in df.columns]

    # Deduplicate column names by appending _1, _2 etc to duplicates
    cols = pd.Series(df.columns)
    for dup in cols[cols.duplicated()].unique():
        cols[cols[cols == dup].index.values.tolist()] = [
            dup if i == 0 else f"{dup}_{i}"
            for i in range(sum(cols == dup))
        ]
    df.columns = cols

    # Pre-normalize column name aliases to standard names before detection
    df.columns = [
        COLUMN_ALIASES.get(c.strip().lower(), c.strip())
        for c in df.columns
    ]

    if saved_mapping:
        mapping = saved_mapping
        unresolved: list[str] = []
    else:
        mapping, unresolved = detect_columns(df)

    return df, mapping, unresolved


def process_dataframe(df: pd.DataFrame, mapping: dict[str, str]) -> pd.DataFrame:
    reverse_map = {v: k for k, v in mapping.items()}
    rename_dict = {v: k for k, v in mapping.items() if v in df.columns}
    df = df.rename(columns=rename_dict)

    required = ["doc_time", "amount1", "qty", "branch_nm", "dept_desc"]
    for col in required:
        if col not in df.columns:
            df[col] = None

    if "doc_time" in df.columns:
        df["doc_time"] = pd.to_datetime(df["doc_time"], errors="coerce")
        df = df.dropna(subset=["doc_time"])
        # drop epoch/zero dates — any date before 2000 is bad data
        df = df[df["doc_time"].dt.year >= 2000]
        df["doc_time"] = df["doc_time"].dt.strftime("%Y-%m-%dT%H:%M:%S")

    if "amount1" in df.columns:
        df["amount1"] = pd.to_numeric(df["amount1"], errors="coerce").fillna(0.0)

    if "qty" in df.columns:
        df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0).astype(int)

    if "dept_desc" in df.columns:
        df["category"] = df["dept_desc"].apply(
            lambda x: "Bride" if isinstance(x, str) and x.strip().startswith("L ") else "Groom"
        )
    else:
        df["category"] = "Groom"

    if "sales_rep" in df.columns:
        df["sales_rep"] = df["sales_rep"].apply(
            lambda x: x.strip().title() if isinstance(x, str) and x.strip() else None
        )

    for col in ["month", "year", "days"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "month" in df.columns:
        df["month"] = df["month"].apply(
            lambda x: str(x).strip().title()
            if isinstance(x, str) else x
        )

    standard_cols = [
        "fy", "acct_cd", "acct_nm", "qty", "branch_nm", "doc_cd", "pay_type",
        "brand_desc", "dept_desc", "size_desc", "style_desc", "sales_rep",
        "doc_time", "amount1", "days", "month", "year", "category",
    ]
    for col in standard_cols:
        if col not in df.columns:
            df[col] = None

    df = df[standard_cols]
    return df


def prepare_records(df: pd.DataFrame) -> list[dict]:
    df = df.copy()

    # Replace NaN and NaT with None before any further processing
    df = df.replace({float("nan"): None})
    df = df.where(df.notna(), None)

    # Convert all datetime columns to ISO string format for JSON serialization
    import pandas.api.types as ptypes
    datetime_cols = [col for col in df.columns if ptypes.is_datetime64_any_dtype(df[col])]
    for col in datetime_cols:
        df[col] = df[col].dt.strftime("%Y-%m-%dT%H:%M:%S").where(df[col].notna(), None)

    # Convert any remaining Timestamp objects to strings
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
