import re
import pandas as pd
from typing import Optional

# ---------------------------------------------------------------------------
# Known canonical field names (all lowercase).
# Keys   = internal field name used everywhere in the backend.
# Values = the lowercase form we match against incoming column names.
# ---------------------------------------------------------------------------
KNOWN_NAMES: dict[str, str] = {
    "fy":         "fy",
    "acct_cd":    "acct_cd",
    "acct_nm":    "acct_nm",
    "qty":        "qty",
    "branch_nm":  "branch_nm",
    "doc_cd":     "doc_cd",
    "pay_type":   "pay_type",
    "brand_desc": "brand_desc",
    "dept_desc":  "dept_desc",
    "size_desc":  "size_desc",
    "style_desc": "style_desc",
    "sales_rep":  "sales_rep",
    "doc_time":   "doc_time",
    "amount1":    "amount1",
    "days":       "days",
    "month":      "month",
    "year":       "year",
}

# All internal field names in a stable order.
STANDARD_FIELDS: list[str] = list(KNOWN_NAMES.keys())

CONFIDENCE_THRESHOLD = 0.5

FY_PATTERN     = re.compile(r"^\d{4}-\d{2}$")
BRANCH_PATTERN = re.compile(r"^[A-Z0-9]+-[A-Z0-9]+$")


# ---------------------------------------------------------------------------
# Heuristic scorers — only called when exact-name match fails for a field.
# Each scorer returns a float in [0.0, 1.0].
# ---------------------------------------------------------------------------

def _score_fy(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(50)
    if len(sample) == 0:
        return 0.0
    matches = sample.apply(lambda x: bool(FY_PATTERN.match(x.strip()))).sum()
    return matches / len(sample)


def _score_datetime(series: pd.Series, col_name: str) -> float:
    if pd.api.types.is_datetime64_any_dtype(series):
        return 1.0
    try:
        converted = pd.to_datetime(
            series.dropna().head(20),
            errors="coerce",
            format="mixed",
            dayfirst=False,
        )
        hit_rate = converted.notna().sum() / max(len(converted), 1)
        if hit_rate >= 0.8:
            return hit_rate
    except Exception:
        pass
    return 0.0


def _score_amount(series: pd.Series) -> float:
    if not pd.api.types.is_numeric_dtype(series):
        try:
            series = pd.to_numeric(series, errors="coerce")
        except Exception:
            return 0.0
    valid = series.dropna()
    if len(valid) == 0:
        return 0.0
    score = 0.0
    if (valid < 0).any():
        score += 0.4
    if valid.max() - valid.min() > 1000:
        score += 0.3
    if valid.abs().mean() > 100:
        score += 0.3
    return min(score, 1.0)


def _score_qty(series: pd.Series) -> float:
    if not pd.api.types.is_numeric_dtype(series):
        try:
            series = pd.to_numeric(series, errors="coerce")
        except Exception:
            return 0.0
    valid = series.dropna()
    if len(valid) == 0:
        return 0.0
    is_int   = (valid == valid.astype(int, errors="ignore")).all()
    small_pos = (valid >= 0).all() and valid.max() < 500 and valid.mean() < 20
    score = 0.0
    if is_int:
        score += 0.5
    if small_pos:
        score += 0.5
    return score


def _score_branch(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    matches = sample.apply(lambda x: bool(BRANCH_PATTERN.match(x.strip()))).sum()
    score = matches / len(sample)
    if sample.nunique() < 20:
        score += 0.2
    return min(score, 1.0)


def _score_salesman(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    has_spaces = sample.apply(lambda x: " " in x.strip()).mean()
    length_ok  = sample.apply(lambda x: 4 < len(x.strip()) < 50).mean()
    n_unique   = sample.nunique()
    score = has_spaces * 0.4 + length_ok * 0.3
    if 2 < n_unique < 100:
        score += 0.3
    return min(score, 1.0)


def _score_brand(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    n_unique = sample.nunique()
    avg_len  = sample.apply(len).mean()
    no_digits = sample.apply(lambda x: not any(c.isdigit() for c in x)).mean()
    score = 0.0
    if 2 <= n_unique <= 30:
        score += 0.4
    if 3 <= avg_len <= 25:
        score += 0.3
    score += no_digits * 0.3
    return min(score, 1.0)


def _score_dept(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    has_l_prefix = sample.apply(lambda x: x.strip().startswith("L ")).mean()
    n_unique     = sample.nunique()
    score = has_l_prefix * 0.5
    if 2 <= n_unique <= 50:
        score += 0.3
    if sample.apply(len).mean() > 4:
        score += 0.2
    return min(score, 1.0)


def _score_style(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    has_alnum  = sample.apply(lambda x: any(c.isdigit() for c in x) and any(c.isalpha() for c in x)).mean()
    no_spaces  = sample.apply(lambda x: " " not in x.strip()).mean()
    high_unique = series.dropna().nunique() / max(len(series.dropna()), 1)
    return min(has_alnum * 0.4 + no_spaces * 0.2 + min(high_unique, 1.0) * 0.4, 1.0)


def _score_acct_cd(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    all_numeric = sample.apply(lambda x: x.strip().isdigit()).mean()
    short       = sample.apply(lambda x: len(x.strip()) < 12).mean()
    return min(all_numeric * 0.6 + short * 0.4, 1.0)


def _score_acct_nm(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    long_names  = sample.apply(lambda x: len(x.strip()) > 5).mean()
    has_spaces  = sample.apply(lambda x: " " in x.strip()).mean()
    not_numeric = sample.apply(lambda x: not x.strip().isdigit()).mean()
    return min(long_names * 0.3 + has_spaces * 0.4 + not_numeric * 0.3, 1.0)


def _score_doc_cd(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    short    = sample.apply(lambda x: len(x.strip()) < 20).mean()
    n_unique = sample.nunique()
    score = short * 0.4
    if n_unique > 50:
        score += 0.4
    return min(score, 1.0)


def _score_pay_type(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    short    = sample.apply(lambda x: len(x.strip()) < 15).mean()
    n_unique = sample.nunique()
    score = short * 0.5
    if 1 <= n_unique <= 15:
        score += 0.5
    return min(score, 1.0)


def _score_size(series: pd.Series) -> float:
    sample = series.dropna().astype(str).head(100)
    if len(sample) == 0:
        return 0.0
    short    = sample.apply(lambda x: len(x.strip()) < 10).mean()
    n_unique = sample.nunique()
    score = short * 0.4
    if 2 <= n_unique <= 30:
        score += 0.4
    return min(score, 0.8)


def _score_days(series: pd.Series) -> float:
    if not pd.api.types.is_numeric_dtype(series):
        return 0.0
    valid = series.dropna()
    if len(valid) == 0:
        return 0.0
    return float(((valid >= 1) & (valid <= 31)).mean()) * 0.9


def _score_month(series: pd.Series) -> float:
    if pd.api.types.is_numeric_dtype(series):
        valid = series.dropna()
        if len(valid) == 0:
            return 0.0
        return float(((valid >= 1) & (valid <= 12)).mean()) * 0.9
    sample = series.dropna().astype(str).head(100)
    month_names = {
        "january","february","march","april","may","june","july",
        "august","september","october","november","december",
        "jan","feb","mar","apr","jun","jul","aug","sep","oct","nov","dec",
    }
    return float(sample.apply(lambda x: x.strip().lower() in month_names).mean())


def _score_year(series: pd.Series) -> float:
    if not pd.api.types.is_numeric_dtype(series):
        try:
            series = pd.to_numeric(series, errors="coerce")
        except Exception:
            return 0.0
    valid = series.dropna()
    if len(valid) == 0:
        return 0.0
    return float(((valid >= 2000) & (valid <= 2100)).mean()) * 0.9


SCORERS: dict[str, callable] = {
    "fy":         _score_fy,
    "doc_time":   _score_datetime,
    "amount1":    _score_amount,
    "qty":        _score_qty,
    "branch_nm":  _score_branch,
    "sales_rep":  _score_salesman,
    "brand_desc": _score_brand,
    "dept_desc":  _score_dept,
    "style_desc": _score_style,
    "acct_cd":    _score_acct_cd,
    "acct_nm":    _score_acct_nm,
    "doc_cd":     _score_doc_cd,
    "pay_type":   _score_pay_type,
    "size_desc":  _score_size,
    "days":       _score_days,
    "month":      _score_month,
    "year":       _score_year,
}

# Priority order for heuristic assignment (most distinctive fields first).
_HEURISTIC_ORDER = [
    "fy", "doc_time", "amount1", "qty", "branch_nm", "days", "month", "year",
    "dept_desc", "sales_rep", "brand_desc", "style_desc", "size_desc",
    "pay_type", "doc_cd", "acct_cd", "acct_nm",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_columns(df: pd.DataFrame) -> tuple[dict[str, str], list[str]]:
    """
    Map DataFrame columns to internal field names.

    Returns:
        mapping          – { internal_field: original_excel_column_name }
        unresolved_fields – internal field names that could not be mapped
    """
    # Normalised (lowercase, stripped) → original column name.
    # Later duplicates overwrite earlier ones; deduplication should already
    # have been applied upstream, but we handle it gracefully here.
    col_normalised: dict[str, str] = {
        col.strip().lower(): col for col in df.columns
    }

    mapping: dict[str, str] = {}       # internal_field → original_excel_col
    used_cols: set[str]     = set()    # original_excel_col values already claimed

    # ------------------------------------------------------------------
    # STEP 1 — Exact name match (case-insensitive).
    # Iterates STANDARD_FIELDS in declaration order so the mapping is
    # built deterministically.
    # ------------------------------------------------------------------
    for field in STANDARD_FIELDS:
        canonical = KNOWN_NAMES[field]          # e.g. "fy", "doc_time" …
        original  = col_normalised.get(canonical)  # original casing from file
        if original is not None and original not in used_cols:
            mapping[field]  = original
            used_cols.add(original)

    # ------------------------------------------------------------------
    # STEP 2 — Heuristic scoring, strictly limited to:
    #   • fields NOT resolved in step 1
    #   • columns NOT claimed in step 1
    # The two sets are disjoint by construction; no overlap is possible.
    # ------------------------------------------------------------------
    fields_todo = [f for f in STANDARD_FIELDS if f not in mapping]
    cols_todo   = [c for c in df.columns      if c not in used_cols]

    if fields_todo and cols_todo:
        # Score every (column, field) pair once.
        scores: dict[str, dict[str, float]] = {col: {} for col in cols_todo}
        for col in cols_todo:
            series = df[col]
            for field in fields_todo:
                scorer = SCORERS.get(field)
                if scorer is None:
                    scores[col][field] = 0.0
                    continue
                try:
                    scores[col][field] = (
                        scorer(series, col) if field == "doc_time" else scorer(series)
                    )
                except Exception:
                    scores[col][field] = 0.0

        # Greedy assignment: pick the best unassigned column for each field
        # in priority order.
        for field in _HEURISTIC_ORDER:
            if field not in fields_todo:
                continue
            best_col:   Optional[str] = None
            best_score: float         = CONFIDENCE_THRESHOLD  # minimum to accept
            for col in cols_todo:
                if col in used_cols:
                    continue
                s = scores[col].get(field, 0.0)
                if s > best_score:
                    best_score = s
                    best_col   = col
            if best_col is not None:
                mapping[field] = best_col
                used_cols.add(best_col)

    unresolved = [f for f in STANDARD_FIELDS if f not in mapping]
    return mapping, unresolved
