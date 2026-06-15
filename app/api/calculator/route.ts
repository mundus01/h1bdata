import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company')?.trim() || '';
  const job = searchParams.get('job')?.trim() || '';
  const city = searchParams.get('city')?.trim() || '';
  const salary = parseFloat(searchParams.get('salary') || '0');

  if (!job || !Number.isFinite(salary) || salary <= 0) {
    return NextResponse.json({ error: 'Job title and a valid salary are required.' }, { status: 400 });
  }

  // Build a parameterized WHERE clause. User input never touches the SQL string.
  const conditions = [
    'annual_salary BETWEEN 30000 AND 1000000',
    "case_status ILIKE '%certified%'",
    'job_title_clean ILIKE $1',
  ];
  const params: (string | number)[] = [`%${job.toUpperCase()}%`];

  if (company) {
    params.push(`%${company.toUpperCase()}%`);
    conditions.push(`employer_name_clean ILIKE $${params.length}`);
  }
  if (city) {
    params.push(`%${city.toUpperCase()}%`);
    conditions.push(`worksite_city ILIKE $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const salaryParam = params.length + 1;

  try {
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_records,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY annual_salary)) as p25,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY annual_salary)) as median,
        ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY annual_salary)) as p75,
        ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY annual_salary)) as p90,
        ROUND(AVG(CASE WHEN annual_salary <= $${salaryParam} THEN 1.0 ELSE 0 END) * 100) as percentile
      FROM lca_records
      WHERE ${where}
    `, [...params, salary]);

    const stats = statsResult.rows[0];

    if (parseInt(stats.total_records) < 3) {
      return NextResponse.json({
        error: 'Not enough data found for this combination. Try broadening your search — remove the company or city filter.'
      }, { status: 404 });
    }

    const topCompaniesResult = await query(`
      SELECT employer_name_clean, employer_slug,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY annual_salary)) as median_salary
      FROM lca_records
      WHERE job_title_clean ILIKE $1
      AND annual_salary BETWEEN 30000 AND 1000000
      AND case_status ILIKE '%certified%'
      GROUP BY employer_name_clean, employer_slug
      HAVING COUNT(*) >= 5
      ORDER BY median_salary DESC
      LIMIT 5
    `, [`%${job.toUpperCase()}%`]);

    return NextResponse.json({
      percentile: parseInt(stats.percentile),
      median: parseFloat(stats.median),
      p25: parseFloat(stats.p25),
      p75: parseFloat(stats.p75),
      p90: parseFloat(stats.p90),
      total_records: parseInt(stats.total_records),
      your_salary: salary,
      company,
      job,
      city,
      top_companies: topCompaniesResult.rows,
    });

  } catch (e) {
    console.error('calculator route error:', e);
    return NextResponse.json({ error: 'Something went wrong while calculating. Please try again.' }, { status: 500 });
  }
}
