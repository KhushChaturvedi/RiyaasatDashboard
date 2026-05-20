import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _client = create_client(url, key)
    return _client


def fetch_all_rows(table: str, columns: str, filters: list[tuple]) -> list[dict]:
    """Fetch all rows from a table with given column selection and filters, handling pagination."""
    sb = get_supabase()
    all_data: list[dict] = []
    batch = 1000
    offset = 0

    while True:
        query = sb.table(table).select(columns)
        for method, col, val in filters:
            query = getattr(query, method)(col, val)
        query = query.range(offset, offset + batch - 1)
        response = query.execute()
        rows = response.data or []
        all_data.extend(rows)
        if len(rows) < batch:
            break
        offset += batch

    return all_data
