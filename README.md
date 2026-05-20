# Riyaasat Dashboard

Production-grade sales intelligence platform for a high-end Indian retail clothing brand. Built with FastAPI (Python) + React (Vite), backed by Supabase.

---

## Architecture

```
D:\RiyaasatDashboard\
├── backend\          → FastAPI — data ingestion, aggregation, Supabase integration
└── frontend\         → React + Vite — dashboard UI, real-time sync, 6 themes
```

**Backend:** FastAPI, pandas, openpyxl, supabase-py, python-dotenv  
**Frontend:** React 19, Vite 8, Tailwind CSS v4, Recharts, Framer Motion, GSAP, React Three Fiber, Zustand, Supabase JS

---

## Environment Variables

### Backend — `backend/.env`

```env
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_KEY=<your-supabase-anon-or-service-key>
```

### Frontend — `frontend/.env`

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_API_BASE_URL=http://localhost:8000
```

---

## Supabase Setup

### Required Tables

Run these SQL statements in your Supabase SQL editor:

```sql
-- Sales data (main table)
create table if not exists sales_data (
  id bigserial primary key,
  fy text,
  acct_cd text,
  acct_nm text,
  qty integer,
  branch_nm text,
  doc_cd text,
  pay_type text,
  brand_desc text,
  dept_desc text,
  size_desc text,
  style_desc text,
  sales_rep text,
  doc_time timestamp,
  amount1 float,
  days float,
  month float,
  year float,
  category text,
  inserted_at timestamptz default now()
);

-- Column mapping (stores auto-detected column map)
create table if not exists column_mapping (
  id integer primary key default 1,
  mapping jsonb,
  updated_at timestamptz default now()
);

-- Upload log
create table if not exists upload_log (
  id bigserial primary key,
  file_name text,
  file_type text,
  row_count integer,
  date_range_start text,
  date_range_end text,
  uploaded_at timestamptz default now()
);

-- App settings (for future use)
create table if not exists app_settings (
  id bigserial primary key,
  key text unique,
  value text,
  updated_at timestamptz default now()
);
```

### Enable Realtime

In Supabase Dashboard → Table Editor → `sales_data` → Enable Realtime  
Do the same for `upload_log`.

### Row Level Security

For development, you can disable RLS on all tables:

```sql
alter table sales_data disable row level security;
alter table column_mapping disable row level security;
alter table upload_log disable row level security;
alter table app_settings disable row level security;
```

For production, set up appropriate RLS policies.

---

## Running the Application

### Backend

```bash
cd D:\RiyaasatDashboard\backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`  
API docs (Swagger): `http://localhost:8000/docs`

### Frontend

```bash
cd D:\RiyaasatDashboard\frontend
npm run dev
```

App available at: `http://localhost:5173`

---

## First Upload

1. Open the app at `http://localhost:5173`
2. Navigate to **Data Management** (database icon in sidebar)
3. In the **Replace Master File** section, drag and drop your YTD Excel dump
4. The system will:
   - Auto-detect all column mappings
   - Process and categorise rows (Bride/Groom)
   - Insert data into Supabase in batches
   - Display upload confirmation with row count

### Subsequent Daily Updates

Use the **Upload Daily Update** drop zone at the top of Data Management. Rows are merged (appended) into the existing data.

---

## Excel File Format

Expected columns (names are flexible — system auto-detects):

| Column | Description |
|--------|-------------|
| FY | Financial year string e.g. "2025-26" |
| acct_cd | Customer account code |
| acct_nm | Customer name |
| qty | Quantity (integer) |
| branch_nm | Branch code e.g. "RYST-BRD" |
| doc_cd | Document/invoice number |
| pay_type | Payment method |
| brand_desc | Brand name |
| dept_desc | Department — starts with "L " for Bride category |
| size_desc | Size code |
| style_desc | Style/design code |
| sales_rep | Salesman name (can be blank) |
| doc_time | Transaction datetime |
| amount1 | Transaction amount (negative = return) |
| Days | Day of month |
| Month | Month number |
| Year | Calendar year |

---

## Business Logic

| Rule | Implementation |
|------|---------------|
| **Category** | `dept_desc` starting with "L " → Bride, else Groom |
| **Net Sales** | Sum of `amount1` (negatives = returns, naturally deducted) |
| **MTD** | 1st of current month to yesterday |
| **YTD** | April 1st of current financial year to yesterday |
| **Year Comparison** | Same calendar period (same month-day range) across selected years |
| **Salesman** | Blank `sales_rep` excluded from all rankings |
| **Name Cleaning** | `sales_rep` stripped of whitespace and title-cased before grouping |
| **Branches** | Always dynamic — read from data, never hardcoded |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload/dump` | Upload initial YTD Excel dump |
| `POST` | `/api/upload/daily` | Upload daily update Excel file |
| `DELETE` | `/api/upload/reset` | Delete all sales data and upload log |
| `GET` | `/api/upload/status` | Master file info and upload history |
| `GET` | `/api/sales/summary` | Total sales, qty, transactions, top branch |
| `GET` | `/api/sales/brands` | Top 5 Bride + Top 5 Groom brands |
| `GET` | `/api/sales/salesmen/company` | Top 10 salesmen company-wide |
| `GET` | `/api/sales/salesmen/branch` | Top 5 salesmen for a specific branch |
| `GET` | `/api/sales/designs` | Top 10 + Bottom 5 designs pivot |
| `GET` | `/api/sales/departments` | Top 10 departments |
| `GET` | `/api/sales/branches` | List of all unique branches |
| `GET` | `/api/column-mapping` | Current column mapping |
| `POST` | `/api/column-mapping` | Save/update column mapping |

**Common query parameters:**
- `period` — `mtd` or `ytd`
- `years` — comma-separated e.g. `2026,2025,2024`
- `metric` — `amount` or `qty`

---

## Themes

Six themes available in Settings:
- **Light** — white background, blue accents (default)
- **Dark** — near-black, purple accents, glassmorphism
- **Navy Blue** — deep navy, gold accents, premium
- **Red** — dark charcoal, red accents, bold
- **Green** — dark background, emerald accents
- **Grey** — warm grey, slate accents, neutral

Theme preference is persisted in localStorage.

---

## Features

- **MTD / YTD toggle** — all widgets react simultaneously
- **Year comparison** — current + up to 5 previous years, same period
- **Auto column detection** — intelligent mapping of any Excel format
- **Cross-device sync** — Supabase Realtime subscriptions
- **Guided tour** — first-time onboarding via React Joyride
- **3D background** — React Three Fiber floating geometry on Dashboard
- **Animated counters** — GSAP number animations on stat cards
- **Responsive** — sidebar on desktop, bottom nav on mobile
- **6 complete themes** — CSS variables, instant switching

---

## Column Detection Algorithm

On every upload, the backend scores each Excel column against 17 standard field types using heuristics:
- FY pattern (`YYYY-YY` regex)
- Datetime detection (pandas `to_datetime`)
- Amount: large range, can be negative
- Qty: small positive integers
- Branch: uppercase codes with hyphens
- Salesman: full names with spaces
- Department: some values start with "L "
- etc.

Columns with confidence < 50% are flagged as `unresolved_fields` in the upload response. The UI will show these for manual assignment.

Detected mappings are saved to Supabase `column_mapping` table and reused on subsequent uploads of the same format.
