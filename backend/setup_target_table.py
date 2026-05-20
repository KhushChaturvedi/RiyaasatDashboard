TARGET_TABLE_SQL = """
-- Run this in your Supabase SQL Editor
create table if not exists target_data (
  id bigserial primary key,
  store_original text,
  branch_nm text,
  month_name text,
  month_num integer,
  day_name text,
  day_num integer,
  year integer,
  target_amt float,
  inserted_at timestamptz default now()
);

grant all on target_data to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter table target_data disable row level security;
"""

if __name__ == "__main__":
    print("=" * 60)
    print("Run the following SQL in your Supabase SQL Editor:")
    print("=" * 60)
    print(TARGET_TABLE_SQL)
    print("=" * 60)
