const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local before running the import.');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const MATERIALIZED_VIEWS = [
  'company_stats',
  'job_stats',
  'city_stats',
  'company_job_stats',
  'company_city_stats',
  'yearly_stats',
];

async function refreshStats() {
  console.log('\nRefreshing aggregate materialized views...');
  for (const view of MATERIALIZED_VIEWS) {
    try {
      await client.query(`REFRESH MATERIALIZED VIEW ${view}`);
      console.log(`  refreshed ${view}`);
    } catch (e) {
      console.log(`  could not refresh ${view}: ${e.message.substring(0, 120)}`);
    }
  }
}

function toSlug(str) {
  if (!str) return null;
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
}

function cleanName(str) {
  if (!str) return null;
  return str.trim().toUpperCase().replace(/\s+/g, ' ');
}

function toAnnual(amount, unit) {
  if (!amount) return null;
  const num = parseFloat(amount.toString().replace(/,/g, '').replace(/\$/g, ''));
  if (isNaN(num) || num <= 0) return null;
  switch ((unit || '').toString().toUpperCase().trim()) {
    case 'YEAR':      return Math.round(num);
    case 'MONTH':     return Math.round(num * 12);
    case 'BI-WEEKLY': return Math.round(num * 26);
    case 'WEEK':      return Math.round(num * 52);
    case 'HOUR':      return Math.round(num * 2080);
    default:          return num > 1000 ? Math.round(num) : null;
  }
}

function getFiscalYear(filename) {
  const match = filename.match(/FY(\d{2,4})/i);
  if (!match) return null;
  const yr = match[1];
  if (yr.length === 2) return 2000 + parseInt(yr);
  return parseInt(yr);
}

function parseDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  } catch (e) { return null; }
}

function normalizeRow(row, headers) {
  const h = headers.map(h => (h || '').toString().toUpperCase().trim());

  function get(...keys) {
    for (const key of keys) {
      const idx = h.indexOf(key.toUpperCase().trim());
      if (idx !== -1) {
        const val = row[idx];
        if (val !== undefined && val !== null && val.toString().trim() !== '' && val.toString().trim() !== 'NULL') {
          return val.toString().trim();
        }
      }
    }
    return null;
  }

  return {
    case_number:    get('CASE_NUMBER'),
    case_status:    get('CASE_STATUS'),
    received_date:  get('RECEIVED_DATE', 'CASE_SUBMITTED', 'DATE_OF_ACCEPTANCE'),
    decision_date:  get('DECISION_DATE'),
    employer_name:  get('EMPLOYER_NAME', 'EMPLOYER_BUSINESS_NAME'),
    worksite_city:  get('WORKSITE_CITY', 'WORKSITE_CITY_1', 'WORKSITE_COUNTY', 'EMPLOYER_CITY'),
    worksite_state: get('WORKSITE_STATE', 'WORKSITE_STATE_1', 'EMPLOYER_STATE'),
    job_title:      get('JOB_TITLE', 'POSITION_TITLE'),
    soc_code:       get('SOC_CODE', 'SOC_CD', 'OCCUPATIONAL_CODE'),
    soc_title:      get('SOC_TITLE', 'SOC_NAME', 'SOC_TITLE_1', 'OCCUPATIONAL_TITLE'),
    wage_from:      get('WAGE_RATE_OF_PAY_FROM', 'WAGE_RATE_OF_PAY_FROM_1', 'WAGE_RATE_OF_PAY', 'PREVAILING_WAGE', 'WAGE_FROM'),
    wage_to:        get('WAGE_RATE_OF_PAY_TO', 'WAGE_RATE_OF_PAY_TO_1', 'WAGE_TO'),
    wage_unit:      get('WAGE_UNIT_OF_PAY', 'WAGE_UNIT_OF_PAY_1', 'PW_UNIT_OF_PAY', 'WAGE_UNIT'),
    wage_level:     get('WAGE_LEVEL', 'PW_WAGE_LEVEL', 'WAGE_LEVEL_1', 'PREVAILING_WAGE_LEVEL'),
    full_time:      get('FULL_TIME_POSITION', 'FULL_TIME_POSITION', 'FULL_TIME'),
    total_workers:  get('TOTAL_WORKERS', 'TOTAL WORKERS'),
  };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function importFile(filePath, fiscalYear) {
  console.log(`\nReading: ${path.basename(filePath)} (FY${fiscalYear})`);

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    let headers = null;
    let batch = [];
    let inserted = 0;
    let skipped = 0;
    let lineNum = 0;
    const BATCH_SIZE = 500;
    let processing = Promise.resolve();

    rl.on('line', (line) => {
      if (!line.trim()) return;
      lineNum++;

      const row = parseCSVLine(line);

      if (lineNum === 1) {
        headers = row;
        console.log(`  Headers: ${headers.slice(0, 5).join(' | ')}`);
        return;
      }

      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        const toProcess = batch.splice(0, BATCH_SIZE);
        rl.pause();
        processing = processing.then(() =>
          insertBatch(toProcess, headers, fiscalYear)
            .then(({ ins, skp }) => {
              inserted += ins;
              skipped += skp;
              if (inserted % 50000 < BATCH_SIZE) {
                process.stdout.write(`  ${inserted.toLocaleString()} rows inserted...\r`);
              }
              rl.resume();
            })
        );
      }
    });

    rl.on('close', () => {
      processing.then(async () => {
        if (batch.length > 0) {
          const { ins, skp } = await insertBatch(batch, headers, fiscalYear);
          inserted += ins;
          skipped += skp;
        }
        console.log(`  Done: ${inserted.toLocaleString()} inserted, ${skipped.toLocaleString()} skipped`);
        resolve(inserted);
      }).catch(reject);
    });

    rl.on('error', reject);
  });
}

async function insertBatch(rows, headers, fiscalYear) {
  const values = [];
  const params = [];
  let paramIdx = 1;
  let ins = 0;
  let skp = 0;

  for (const rawRow of rows) {
    if (!rawRow || rawRow.length === 0) continue;
    const r = normalizeRow(rawRow, headers);
    if (!r.employer_name || !r.job_title) { skp++; continue; }

    const employerClean = cleanName(r.employer_name);
    const jobClean = cleanName(r.job_title);
    const annualSalary = toAnnual(r.wage_from, r.wage_unit);
    const citySlug = r.worksite_city && r.worksite_state
      ? toSlug(`${r.worksite_city} ${r.worksite_state}`)
      : toSlug(r.worksite_city);
    const isFullTime = r.full_time
      ? r.full_time.toString().toUpperCase().startsWith('Y')
      : null;

    values.push(`($${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++})`);

    params.push(
      r.case_number, r.case_status,
      parseDate(r.received_date), parseDate(r.decision_date),
      fiscalYear,
      r.employer_name, employerClean, toSlug(employerClean),
      r.worksite_city, r.worksite_state, citySlug,
      r.job_title, jobClean, toSlug(jobClean),
      r.soc_code, r.soc_title,
      r.wage_from ? parseFloat(r.wage_from.toString().replace(/,/g, '').replace(/\$/g, '')) : null,
      r.wage_to   ? parseFloat(r.wage_to.toString().replace(/,/g, '').replace(/\$/g, ''))   : null,
      r.wage_unit, annualSalary,
      r.wage_level, isFullTime,
      r.total_workers ? parseInt(r.total_workers) : null
    );
    ins++;
  }

  if (values.length === 0) return { ins: 0, skp };

  try {
    await client.query(
      `INSERT INTO lca_records (
        case_number, case_status, received_date, decision_date,
        fiscal_year, employer_name, employer_name_clean, employer_slug,
        worksite_city, worksite_state, worksite_city_slug,
        job_title, job_title_clean, job_title_slug,
        soc_code, soc_title,
        wage_from, wage_to, wage_unit, annual_salary,
        wage_level, full_time, total_workers
      ) VALUES ${values.join(',')}
      ON CONFLICT DO NOTHING`,
      params
    );
  } catch (e) {
    console.log(`  Batch error: ${e.message.substring(0, 120)}`);
    return { ins: 0, skp: ins };
  }

  return { ins, skp };
}

async function main() {
  await client.connect();
  console.log('Connected to database.');

  const dataDir = path.join(__dirname, 'raw_data');
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.csv'))
    .sort();

  console.log(`Found ${files.length} CSV files to import.\n`);

  let totalInserted = 0;
  for (const file of files) {
    const fiscalYear = getFiscalYear(file);
    if (!fiscalYear) {
      console.log(`Skipping ${file} — could not detect fiscal year`);
      continue;
    }
    const count = await importFile(path.join(dataDir, file), fiscalYear);
    totalInserted += count;
  }

  console.log(`\n==========================================`);
  console.log(`IMPORT COMPLETE: ${totalInserted.toLocaleString()} total records`);
  console.log(`==========================================`);

  await refreshStats();

  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});