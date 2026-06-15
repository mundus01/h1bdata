-- ============================================================
-- H1B Data — database schema
-- ============================================================
-- Run order:
--   1. psql ... -f schema.sql        (creates base tables + indexes)
--   2. node import.js                (loads raw_data/*.csv into lca_records)
--   3. psql ... -f schema.sql again  OR run refresh_stats.sql
--      to (re)build the aggregate materialized views below.
-- ============================================================

-- Trigram search (used for fast ILIKE '%term%' typeahead)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- Base table ----------
CREATE TABLE IF NOT EXISTS lca_records (
  id                    SERIAL PRIMARY KEY,
  case_number           VARCHAR(30),
  case_status           VARCHAR(30),
  received_date         DATE,
  decision_date         DATE,
  fiscal_year           SMALLINT,
  employer_name         TEXT,
  employer_name_clean   TEXT,
  employer_slug         VARCHAR(255),
  worksite_city         TEXT,
  worksite_state        CHAR(2),
  worksite_city_slug    VARCHAR(255),
  job_title             TEXT,
  job_title_clean       TEXT,
  job_title_slug        VARCHAR(255),
  soc_code              VARCHAR(15),
  soc_title             TEXT,
  wage_from             NUMERIC(12,2),
  wage_to               NUMERIC(12,2),
  wage_unit             VARCHAR(20),
  annual_salary         NUMERIC(12,2),
  wage_level            VARCHAR(5),
  full_time             BOOLEAN,
  total_workers         SMALLINT
);

-- Dedup guard so import.js ON CONFLICT DO NOTHING actually works.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lca_case ON lca_records(case_number) WHERE case_number IS NOT NULL;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_employer_slug    ON lca_records(employer_slug);
CREATE INDEX IF NOT EXISTS idx_job_slug         ON lca_records(job_title_slug);
CREATE INDEX IF NOT EXISTS idx_city_slug        ON lca_records(worksite_city_slug);
CREATE INDEX IF NOT EXISTS idx_fiscal_year      ON lca_records(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_case_status      ON lca_records(case_status);
CREATE INDEX IF NOT EXISTS idx_annual_salary    ON lca_records(annual_salary);
CREATE INDEX IF NOT EXISTS idx_wage_level       ON lca_records(wage_level);
CREATE INDEX IF NOT EXISTS idx_combo            ON lca_records(employer_slug, job_title_slug, worksite_city_slug, fiscal_year);

-- Summaries table for AI-generated text (cache)
CREATE TABLE IF NOT EXISTS ai_summaries (
  id           SERIAL PRIMARY KEY,
  page_key     VARCHAR(500) UNIQUE,
  summary      TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Aggregate materialized views
-- ------------------------------------------------------------
-- The application reads from these (NOT directly from lca_records
-- on hot paths). Rebuild them after every import with:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY company_stats;  (etc.)
-- A "valid certified row" is: certified status + a plausible
-- annual salary. Percentiles/medians are computed only over those,
-- while approval_rate is computed over ALL of the entity's rows.
-- ============================================================

-- ---------- company_stats ----------
CREATE MATERIALIZED VIEW IF NOT EXISTS company_stats AS
SELECT
  employer_slug,
  MAX(employer_name_clean) AS employer_name_clean,
  COUNT(*) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) AS total_filings,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p25_salary,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS median_salary,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p75_salary,
  ROUND(AVG(annual_salary) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS avg_salary,
  ROUND(AVG(CASE WHEN case_status ILIKE '%certified%' THEN 1.0 ELSE 0 END) * 100, 1) AS approval_rate,
  MIN(fiscal_year) AS first_year,
  MAX(fiscal_year) AS last_year
FROM lca_records
WHERE employer_slug IS NOT NULL
GROUP BY employer_slug
HAVING COUNT(*) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_stats_slug ON company_stats(employer_slug);
CREATE INDEX IF NOT EXISTS idx_company_stats_filings ON company_stats(total_filings DESC);
CREATE INDEX IF NOT EXISTS idx_company_stats_name_trgm ON company_stats USING gin (employer_name_clean gin_trgm_ops);

-- ---------- job_stats ----------
CREATE MATERIALIZED VIEW IF NOT EXISTS job_stats AS
SELECT
  job_title_slug,
  MAX(job_title_clean) AS job_title_clean,
  COUNT(*) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) AS total_filings,
  COUNT(DISTINCT employer_slug) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) AS distinct_employers,
  ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p10_salary,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p25_salary,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS median_salary,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p75_salary,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p90_salary,
  ROUND(AVG(annual_salary) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS avg_salary,
  MIN(fiscal_year) AS first_year,
  MAX(fiscal_year) AS last_year
FROM lca_records
WHERE job_title_slug IS NOT NULL AND LENGTH(job_title_slug) > 3
GROUP BY job_title_slug
HAVING COUNT(*) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_stats_slug ON job_stats(job_title_slug);
CREATE INDEX IF NOT EXISTS idx_job_stats_filings ON job_stats(total_filings DESC);
CREATE INDEX IF NOT EXISTS idx_job_stats_title_trgm ON job_stats USING gin (job_title_clean gin_trgm_ops);

-- ---------- city_stats ----------
CREATE MATERIALIZED VIEW IF NOT EXISTS city_stats AS
SELECT
  worksite_city_slug,
  INITCAP(MAX(worksite_city)) AS worksite_city,
  MAX(worksite_state) AS worksite_state,
  COUNT(*) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) AS total_filings,
  COUNT(DISTINCT employer_slug) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) AS distinct_employers,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p25_salary,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS median_salary,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY annual_salary)
        FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000)) AS p75_salary,
  MIN(fiscal_year) AS first_year,
  MAX(fiscal_year) AS last_year
FROM lca_records
WHERE worksite_city_slug IS NOT NULL
GROUP BY worksite_city_slug
HAVING COUNT(*) FILTER (WHERE case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000) >= 10;

CREATE UNIQUE INDEX IF NOT EXISTS uq_city_stats_slug ON city_stats(worksite_city_slug);
CREATE INDEX IF NOT EXISTS idx_city_stats_filings ON city_stats(total_filings DESC);
CREATE INDEX IF NOT EXISTS idx_city_stats_city_trgm ON city_stats USING gin (worksite_city gin_trgm_ops);

-- ---------- company_job_stats (top jobs per company / top companies per job) ----------
CREATE MATERIALIZED VIEW IF NOT EXISTS company_job_stats AS
SELECT
  employer_slug,
  job_title_slug,
  MAX(job_title_clean) AS job_title_clean,
  COUNT(*) AS filings,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)) AS median_salary
FROM lca_records
WHERE employer_slug IS NOT NULL AND job_title_slug IS NOT NULL
  AND case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000
GROUP BY employer_slug, job_title_slug;

CREATE INDEX IF NOT EXISTS idx_cjs_employer ON company_job_stats(employer_slug, filings DESC);
CREATE INDEX IF NOT EXISTS idx_cjs_job ON company_job_stats(job_title_slug, median_salary DESC);

-- ---------- company_city_stats (top cities per company / top employers per city) ----------
CREATE MATERIALIZED VIEW IF NOT EXISTS company_city_stats AS
SELECT
  employer_slug,
  worksite_city_slug,
  INITCAP(MAX(worksite_city)) AS worksite_city,
  MAX(worksite_state) AS worksite_state,
  COUNT(*) AS filings,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)) AS median_salary
FROM lca_records
WHERE employer_slug IS NOT NULL AND worksite_city_slug IS NOT NULL
  AND case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000
GROUP BY employer_slug, worksite_city_slug;

CREATE INDEX IF NOT EXISTS idx_ccs_employer ON company_city_stats(employer_slug, filings DESC);
CREATE INDEX IF NOT EXISTS idx_ccs_city ON company_city_stats(worksite_city_slug, filings DESC);

-- ---------- yearly_stats (per-year trend, one dimension populated per row) ----------
-- Rows carry exactly one of {employer_slug, job_title_slug, worksite_city_slug}
-- so the app can filter by a single dimension and group by fiscal_year.
CREATE MATERIALIZED VIEW IF NOT EXISTS yearly_stats AS
  SELECT employer_slug,
         NULL::varchar(255) AS job_title_slug,
         NULL::varchar(255) AS worksite_city_slug,
         fiscal_year,
         COUNT(*) AS filings,
         ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)) AS median_salary
  FROM lca_records
  WHERE employer_slug IS NOT NULL
    AND case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000
  GROUP BY employer_slug, fiscal_year
UNION ALL
  SELECT NULL::varchar(255), job_title_slug, NULL::varchar(255), fiscal_year,
         COUNT(*), ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary))
  FROM lca_records
  WHERE job_title_slug IS NOT NULL AND LENGTH(job_title_slug) > 3
    AND case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000
  GROUP BY job_title_slug, fiscal_year
UNION ALL
  SELECT NULL::varchar(255), NULL::varchar(255), worksite_city_slug, fiscal_year,
         COUNT(*), ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary))
  FROM lca_records
  WHERE worksite_city_slug IS NOT NULL
    AND case_status ILIKE '%certified%' AND annual_salary BETWEEN 30000 AND 1000000
  GROUP BY worksite_city_slug, fiscal_year;

CREATE INDEX IF NOT EXISTS idx_ys_employer ON yearly_stats(employer_slug, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ys_job ON yearly_stats(job_title_slug, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ys_city ON yearly_stats(worksite_city_slug, fiscal_year);
