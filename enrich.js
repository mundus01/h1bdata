/**
 * LLM Enrichment Script
 * Generates AI summaries for companies and job titles using Claude.
 * Stores results in the ai_summaries table.
 *
 * Usage:
 *   node enrich.js companies   -- enrich top 1000 companies
 *   node enrich.js jobs        -- enrich top 500 job titles
 *   node enrich.js companies 50  -- enrich top 50 companies
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Client({ connectionString: process.env.DATABASE_URL });
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const [, , mode = 'companies', limitArg = '1000'] = process.argv;
const LIMIT = parseInt(limitArg);
const DELAY_MS = 500; // pause between API calls to avoid rate limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateCompanySummary(company) {
  const prompt = `You are writing a concise, factual summary for an H1B salary database page about ${company.employer_name_clean}.

Data:
- Total H1B filings: ${parseInt(company.total_filings).toLocaleString()}
- Median H1B salary: $${Math.round(company.median_salary / 1000)}K
- Salary range (25th–75th percentile): $${Math.round(company.p25_salary / 1000)}K – $${Math.round(company.p75_salary / 1000)}K
- Approval rate: ${company.approval_rate}%
- Years active: FY${company.first_year} – FY${company.last_year}

Write 2-3 sentences that:
1. Describe the company as an H1B sponsor (size, how active they are)
2. Mention the salary range and what it means for applicants
3. Note approval rate if notable

Be factual and data-forward. Do not use filler phrases like "In conclusion" or "It's worth noting". No markdown. Plain text only.`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text.trim();
}

async function generateJobSummary(job) {
  const prompt = `You are writing a concise, factual summary for an H1B salary database page about the job title: ${job.job_title_clean}.

Data:
- Total H1B filings: ${parseInt(job.total_filings).toLocaleString()}
- Number of employers: ${parseInt(job.distinct_employers).toLocaleString()}
- Median H1B salary: $${Math.round(job.median_salary / 1000)}K
- Salary range (25th–75th percentile): $${Math.round(job.p25_salary / 1000)}K – $${Math.round(job.p75_salary / 1000)}K
- Top 10% earn: $${Math.round(job.p90_salary / 1000)}K+
- Years in data: FY${job.first_year} – FY${job.last_year}

Write 2-3 sentences that:
1. Describe how common this role is in H1B sponsorship
2. Describe the salary landscape — what workers at different levels earn
3. Mention the breadth of employers if notable

Be factual and data-forward. No markdown. Plain text only.`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text.trim();
}

async function enrichCompanies() {
  console.log(`Fetching top ${LIMIT} companies...`);
  const { rows: companies } = await client.query(`
    SELECT cs.employer_slug, cs.employer_name_clean, cs.total_filings,
           cs.median_salary, cs.p25_salary, cs.p75_salary,
           cs.approval_rate, cs.first_year, cs.last_year
    FROM company_stats cs
    LEFT JOIN ai_summaries ai ON ai.page_key = 'company:' || cs.employer_slug
    WHERE ai.id IS NULL
    ORDER BY cs.total_filings DESC
    LIMIT $1
  `, [LIMIT]);

  console.log(`Found ${companies.length} companies without summaries.`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    process.stdout.write(`[${i + 1}/${companies.length}] ${company.employer_name_clean}... `);

    try {
      const summary = await generateCompanySummary(company);
      await client.query(`
        INSERT INTO ai_summaries (page_key, summary)
        VALUES ($1, $2)
        ON CONFLICT (page_key) DO UPDATE SET summary = $2, created_at = NOW()
      `, [`company:${company.employer_slug}`, summary]);
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }

    await sleep(DELAY_MS);
  }
}

async function enrichJobs() {
  console.log(`Fetching top ${LIMIT} job titles...`);
  const { rows: jobs } = await client.query(`
    SELECT js.job_title_slug, js.job_title_clean, js.total_filings,
           js.distinct_employers, js.median_salary, js.p25_salary,
           js.p75_salary, js.p90_salary, js.first_year, js.last_year
    FROM job_stats js
    LEFT JOIN ai_summaries ai ON ai.page_key = 'job:' || js.job_title_slug
    WHERE ai.id IS NULL
    ORDER BY js.total_filings DESC
    LIMIT $1
  `, [LIMIT]);

  console.log(`Found ${jobs.length} job titles without summaries.`);

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    process.stdout.write(`[${i + 1}/${jobs.length}] ${job.job_title_clean}... `);

    try {
      const summary = await generateJobSummary(job);
      await client.query(`
        INSERT INTO ai_summaries (page_key, summary)
        VALUES ($1, $2)
        ON CONFLICT (page_key) DO UPDATE SET summary = $2, created_at = NOW()
      `, [`job:${job.job_title_slug}`, summary]);
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }

    await sleep(DELAY_MS);
  }
}

async function main() {
  await client.connect();
  console.log(`Starting enrichment: ${mode} (limit: ${LIMIT})\n`);

  try {
    if (mode === 'companies') {
      await enrichCompanies();
    } else if (mode === 'jobs') {
      await enrichJobs();
    } else {
      console.error('Usage: node enrich.js [companies|jobs] [limit]');
    }
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

main().catch(console.error);
