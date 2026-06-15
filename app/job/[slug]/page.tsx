import { query } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

async function getJobData(slug: string) {
    const result = await query(`
      SELECT 
        job_title_clean,
        job_title_slug,
        total_filings,
        distinct_employers as total_employers,
        p10_salary,
        p25_salary,
        median_salary,
        p75_salary,
        p90_salary,
        avg_salary,
        first_year,
        last_year
      FROM job_stats
      WHERE job_title_slug = $1
    `, [slug]);
  
    if (result.rows.length === 0) return null;
    if (parseInt(result.rows[0].total_filings) < 5) return null;
    return result.rows[0];
  }

  async function getTopCompanies(slug: string) {
    const result = await query(`
      SELECT cs.employer_name_clean, cjs.employer_slug, cjs.filings, cjs.median_salary
      FROM company_job_stats cjs
      JOIN company_stats cs ON cs.employer_slug = cjs.employer_slug
      WHERE cjs.job_title_slug = $1
      ORDER BY cjs.median_salary DESC
      LIMIT 10
    `, [slug]);
    return result.rows;
  }
  async function getTopCities(slug: string) {
    const result = await query(`
      SELECT ccs.worksite_city, ccs.worksite_state,
      SUM(ccs.filings) as filings,
      ROUND(AVG(ccs.median_salary)) as median_salary
      FROM company_city_stats ccs
      WHERE ccs.employer_slug IN (
        SELECT employer_slug FROM company_job_stats
        WHERE job_title_slug = $1
      )
      GROUP BY ccs.worksite_city, ccs.worksite_state
      ORDER BY filings DESC
      LIMIT 10
    `, [slug]);
    return result.rows;
  }

  async function getYearlyTrend(slug: string) {
    const result = await query(`
      SELECT fiscal_year, SUM(filings) as filings,
      ROUND(AVG(median_salary)) as median_salary
      FROM yearly_stats
      WHERE job_title_slug = $1
      GROUP BY fiscal_year
      ORDER BY fiscal_year
    `, [slug]);
    return result.rows;
  }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobData(slug);
  if (!job) return { title: 'Job Not Found', robots: { index: false } };
  return {
    title: `${job.job_title_clean} H1B Salary ${job.last_year} — Median $${Math.round(job.median_salary / 1000)}K, ${parseInt(job.total_filings).toLocaleString()} Records | H1B Data`,
    description: `${parseInt(job.total_filings).toLocaleString()} H1B filings for ${job.job_title_clean}. Median salary $${Math.round(job.median_salary / 1000)}K. Top employers, cities, and year-over-year trends.`,
    alternates: { canonical: `/job/${slug}` },
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [job, topCompanies, topCities, yearlyTrend] = await Promise.all([
    getJobData(slug),
    getTopCompanies(slug),
    getTopCities(slug),
    getYearlyTrend(slug),
  ]);

  if (!job) notFound();

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">→</span>
            <Link href="/jobs" className="hover:text-white">Job Titles</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-200">{job.job_title_clean}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            {job.job_title_clean} H1B Salary Data
          </h1>
          <p className="text-slate-300">
            FY{job.first_year} – FY{job.last_year} • {parseInt(job.total_employers).toLocaleString()} employers • Official DOL Data
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-emerald-600">
              ${Math.round(job.median_salary / 1000)}K
            </div>
            <div className="text-sm text-slate-500 mt-1">Median Salary</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {parseInt(job.total_filings).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 mt-1">Total Filings</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-xl font-extrabold font-mono text-emerald-600">
              ${Math.round(job.p25_salary / 1000)}K–${Math.round(job.p75_salary / 1000)}K
            </div>
            <div className="text-sm text-slate-500 mt-1">Middle 50%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {parseInt(job.total_employers).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 mt-1">Employers</div>
          </div>
        </div>

        {/* Salary Range Bar */}
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
            <span>P10: ${Math.round(job.p10_salary / 1000)}K</span>
            <span>P25: ${Math.round(job.p25_salary / 1000)}K</span>
            <span>Median: ${Math.round(job.median_salary / 1000)}K</span>
            <span>P75: ${Math.round(job.p75_salary / 1000)}K</span>
            <span>P90: ${Math.round(job.p90_salary / 1000)}K</span>
          </div>
          <div className="relative h-4 bg-slate-100 rounded-full">
            <div
              className="absolute h-4 bg-blue-200 rounded-full"
              style={{
                left: `${(job.p10_salary / job.p90_salary) * 100}%`,
                width: `${((job.p90_salary - job.p10_salary) / job.p90_salary) * 100}%`
              }}
            />
            <div
              className="absolute h-4 bg-blue-600 rounded-full"
              style={{
                left: `${(job.p25_salary / job.p90_salary) * 100}%`,
                width: `${((job.p75_salary - job.p25_salary) / job.p90_salary) * 100}%`
              }}
            />
            <div
              className="absolute w-1 h-4 bg-emerald-600 rounded-full"
              style={{ left: `${(job.median_salary / job.p90_salary) * 100}%` }}
            />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Companies */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top Paying Companies</h2>
          <div className="space-y-1">
            {topCompanies.map((company: { employer_slug: string; employer_name_clean: string; filings: string; median_salary: number }) => (
              <div key={company.employer_slug} className="flex justify-between items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <Link href={`/company/${company.employer_slug}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium truncate max-w-[60%]">
                  {company.employer_name_clean}
                </Link>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-emerald-600">
                    ${Math.round(company.median_salary / 1000)}K
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {parseInt(company.filings).toLocaleString()} filings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top Cities</h2>
          <div className="space-y-1">
            {topCities.map((city: { worksite_city: string; worksite_state: string; filings: string; median_salary: number | null }, i: number) => (
              <div key={i} className="flex justify-between items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-slate-700">
                  {city.worksite_city}{city.worksite_state ? `, ${city.worksite_state}` : ''}
                </span>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-emerald-600">
                    {city.median_salary ? `$${Math.round(city.median_salary / 1000)}K` : 'N/A'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {parseInt(city.filings).toLocaleString()} filings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Yearly Trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {job.job_title_clean} Salary Trend by Year
          </h2>
          <div className="space-y-2">
            {yearlyTrend.map((year: { fiscal_year: number; filings: string; median_salary: number }) => (
              <div key={year.fiscal_year} className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-mono w-12">FY{year.fiscal_year}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-7 relative">
                  <div
                    className="bg-blue-600 h-7 rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${Math.min(100, (year.median_salary / 250000) * 100)}%` }}
                  >
                    <span className="text-xs text-white font-mono font-medium">
                      ${Math.round(year.median_salary / 1000)}K
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono w-20 text-right">
                  {parseInt(year.filings).toLocaleString()} filings
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}