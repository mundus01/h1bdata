# H1BData.us

A searchable database of H1B / LCA salary disclosure records from the US Department of Labor, built with Next.js (App Router) and PostgreSQL.

## Stack

- **Next.js 16** (App Router, React Server Components, ISR)
- **PostgreSQL** via the `pg` driver
- **Tailwind CSS v4**

## Prerequisites

- Node.js 20+
- A PostgreSQL database

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create `.env.local` (this file is gitignored — never commit secrets):

   ```bash
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/h1bdata
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Create the schema**

   This creates the base `lca_records` table, indexes, and the aggregate
   materialized views the app reads from (`company_stats`, `job_stats`,
   `city_stats`, `company_job_stats`, `company_city_stats`, `yearly_stats`).

   ```bash
   psql "$DATABASE_URL" -f schema.sql
   ```

4. **Import the data**

   Place the DOL LCA disclosure CSVs in `raw_data/` (filenames must contain
   `FYxx`, e.g. `LCA_FY2024.csv`), then run:

   ```bash
   node import.js
   ```

   `import.js` loads the raw records and then refreshes all materialized views.
   Re-run it (or `REFRESH MATERIALIZED VIEW ...`) whenever new data is added.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Data model

- `lca_records` — one row per LCA filing (the raw, imported data).
- The materialized views pre-aggregate salary percentiles, filing counts, and
  trends so request-time pages stay fast. The app **does not** run heavy
  `PERCENTILE_CONT` scans over `lca_records` on hot paths.

## Notes

- Pages use ISR (`export const revalidate`) so expensive aggregate queries run
  at most once per day per URL.
- Data is sourced from the US Department of Labor LCA Disclosure Data. This
  project is not affiliated with USCIS or the DOL.
