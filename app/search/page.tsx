import { query } from '@/lib/db';
import Link from 'next/link';

export const metadata = {
  title: 'Search H1B Salary Records | H1BData.us',
  description: 'Search certified H1B salary filings by company, job title, and city.',
  robots: { index: false, follow: true },
};

async function searchRecords(company: string, job: string, city: string) {
  const conditions = ["annual_salary BETWEEN 30000 AND 1000000", "case_status ILIKE '%certified%'"];
  const params: string[] = [];
  let idx = 1;

  if (company) {
    conditions.push(`employer_name_clean ILIKE $${idx++}`);
    params.push(`%${company.toUpperCase()}%`);
  }
  if (job) {
    conditions.push(`job_title_clean ILIKE $${idx++}`);
    params.push(`%${job.toUpperCase()}%`);
  }
  if (city) {
    conditions.push(`(worksite_city ILIKE $${idx} OR worksite_state ILIKE $${idx++})`);
    params.push(`%${city}%`);
  }

  const where = conditions.join(' AND ');

  const results = await query(`
    SELECT 
      employer_name_clean, employer_slug,
      job_title_clean, job_title_slug,
      worksite_city, worksite_state,
      annual_salary, wage_level, fiscal_year,
      case_status
    FROM lca_records
    WHERE ${where}
    ORDER BY fiscal_year DESC, annual_salary DESC
    LIMIT 50
  `, params);

  const stats = await query(`
    SELECT 
      COUNT(*) as total,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY annual_salary)) as median_salary,
      ROUND(AVG(annual_salary)) as avg_salary
    FROM lca_records
    WHERE ${where}
  `, params);

  return { results: results.rows as SearchRecord[], stats: stats.rows[0] as SearchStats | null };
}

interface SearchRecord {
  employer_name_clean: string;
  employer_slug: string;
  job_title_clean: string;
  job_title_slug: string;
  worksite_city: string;
  worksite_state: string;
  annual_salary: string;
  wage_level: string | null;
  fiscal_year: number;
  case_status: string;
}

interface SearchStats {
  total: string;
  median_salary: number | null;
  avg_salary: number | null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; job?: string; city?: string }>;
}) {
  const { company = '', job = '', city = '' } = await searchParams;
  const hasSearch = company || job || city;

  let data: { results: SearchRecord[]; stats: SearchStats | null } = { results: [], stats: null };
  if (hasSearch) {
    data = await searchRecords(company, job, city);
  }

  return (
    <>
      {/* Search Form */}
      <section className="bg-[#0A1628] py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-4">Search H1B Salary Records</h1>
          <form action="/search" method="GET" className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-3 shadow-sm">
            <input
              name="company"
              defaultValue={company}
              placeholder="Company name"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="job"
              defaultValue={job}
              placeholder="Job title"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="city"
              defaultValue={city}
              placeholder="City or state"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!hasSearch ? (
          <div className="text-center py-16 text-slate-400">
            Enter a company, job title, or city above to search
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {data.stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="text-2xl font-extrabold font-mono text-slate-900">
                    {parseInt(data.stats.total).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Matching records</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="text-2xl font-extrabold font-mono text-emerald-600">
                    {data.stats.median_salary ? `$${Math.round(data.stats.median_salary / 1000)}K` : '—'}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Median salary</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="text-2xl font-extrabold font-mono text-emerald-600">
                    {data.stats.avg_salary ? `$${Math.round(data.stats.avg_salary / 1000)}K` : '—'}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Average salary</div>
                </div>
              </div>
            )}

            {/* Active filters */}
            {(company || job || city) && (
              <div className="flex flex-wrap gap-2 mb-6 text-sm">
                {company && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">Company: {company}</span>}
                {job && <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">Job: {job}</span>}
                {city && <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">City: {city}</span>}
              </div>
            )}

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Employer</th>
                      <th className="bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Job Title</th>
                      <th className="bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
                      <th className="bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Salary</th>
                      <th className="bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Level</th>
                      <th className="bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((record: SearchRecord, i: number) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/company/${record.employer_slug}`} className="text-blue-600 hover:text-blue-700 font-medium">
                            {record.employer_name_clean}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/job/${record.job_title_slug}`} className="text-blue-600 hover:text-blue-700">
                            {record.job_title_clean}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {record.worksite_city}{record.worksite_state ? `, ${record.worksite_state}` : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                          ${parseInt(record.annual_salary).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">
                          {record.wage_level || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">
                          FY{record.fiscal_year}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.results.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No results found. Try broader search terms.
                </div>
              )}

              {data.results.length === 50 && (
                <div className="text-center py-4 text-sm text-slate-400 border-t border-gray-100">
                  Showing top 50 results. Narrow your search for more specific results.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}