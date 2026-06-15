import { query } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

async function getCompanyData(slug: string) {
    const result = await query(`
      SELECT 
        employer_name_clean,
        employer_slug,
        total_filings,
        median_salary,
        p25_salary,
        p75_salary,
        avg_salary,
        approval_rate,
        first_year,
        last_year
      FROM company_stats
      WHERE employer_slug = $1
    `, [slug]);
  
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async function getTopJobs(slug: string) {
    const result = await query(`
      SELECT job_title_clean, job_title_slug, filings, median_salary
      FROM company_job_stats
      WHERE employer_slug = $1
      ORDER BY filings DESC
      LIMIT 10
    `, [slug]);
    return result.rows;
  }

  async function getTopCities(slug: string) {
    const result = await query(`
      SELECT worksite_city, worksite_state, filings, median_salary
      FROM company_city_stats
      WHERE employer_slug = $1
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
      WHERE employer_slug = $1
      GROUP BY fiscal_year
      ORDER BY fiscal_year
    `, [slug]);
    return result.rows;
  }

async function getRecentRecords(slug: string) {
  const result = await query(`
    SELECT job_title_clean, worksite_city, worksite_state,
      annual_salary, wage_level, fiscal_year, case_status
    FROM lca_records
    WHERE employer_slug = $1
    AND annual_salary IS NOT NULL
    ORDER BY fiscal_year DESC, annual_salary DESC
    LIMIT 20
  `, [slug]);
  return result.rows;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyData(slug);
  if (!company) return { title: 'Company Not Found', robots: { index: false } };
  return {
    title: `${company.employer_name_clean} H1B Salary ${company.last_year} — ${parseInt(company.total_filings).toLocaleString()} Records, Median $${Math.round(company.median_salary / 1000)}K | H1B Data`,
    description: `Search ${parseInt(company.total_filings).toLocaleString()} H1B filings from ${company.employer_name_clean}. Median salary $${Math.round(company.median_salary / 1000)}K. See salaries by job title, city, and year.`,
    alternates: { canonical: `/company/${slug}` },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [company, topJobs, topCities, yearlyTrend, recentRecords] = await Promise.all([
    getCompanyData(slug),
    getTopJobs(slug),
    getTopCities(slug),
    getYearlyTrend(slug),
    getRecentRecords(slug),
  ]);

  if (!company) notFound();

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Dataset",
              "name": `${company.employer_name_clean} H1B Salary Data`,
              "description": `H1B LCA filing data for ${company.employer_name_clean} from the US Department of Labor. ${company.total_filings} filings, median salary $${Math.round(company.median_salary / 1000)}K.`,
              "url": `https://h1bdata.us/company/${slug}`,
              "creator": { "@type": "Organization", "name": "H1BData.us" },
              "temporalCoverage": `${company.first_year}/${company.last_year}`,
              "spatialCoverage": "United States",
              "license": "https://www.dol.gov/agencies/eta/foreign-labor/performance"
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://h1bdata.us" },
                { "@type": "ListItem", "position": 2, "name": "Companies", "item": "https://h1bdata.us/companies" },
                { "@type": "ListItem", "position": 3, "name": company.employer_name_clean, "item": `https://h1bdata.us/company/${slug}` }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": `What is ${company.employer_name_clean}'s median H1B salary?`,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `${company.employer_name_clean} paid a median H1B salary of $${Math.round(company.median_salary / 1000).toLocaleString()}K based on ${parseInt(company.total_filings).toLocaleString()} certified LCA filings.`
                  }
                },
                {
                  "@type": "Question",
                  "name": `Does ${company.employer_name_clean} sponsor H1B visas?`,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `Yes, ${company.employer_name_clean} has sponsored ${parseInt(company.total_filings).toLocaleString()} H1B visas between FY${company.first_year} and FY${company.last_year} with an approval rate of ${company.approval_rate}%.`
                  }
                }
              ]
            }
          ])
        }}
      />

      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">→</span>
            <Link href="/companies" className="hover:text-white">Companies</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-200">{company.employer_name_clean}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            {company.employer_name_clean} H1B Salary Data
          </h1>
          <p className="text-slate-300">
            FY{company.first_year} – FY{company.last_year} • Official DOL LCA Disclosure Data
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-emerald-600">
              ${Math.round(company.median_salary / 1000)}K
            </div>
            <div className="text-sm text-slate-500 mt-1">Median Salary</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {parseInt(company.total_filings).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 mt-1">Total Filings</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {company.approval_rate}%
            </div>
            <div className="text-sm text-slate-500 mt-1">Approval Rate</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-xl font-extrabold font-mono text-emerald-600">
              ${Math.round(company.p25_salary / 1000)}K–${Math.round(company.p75_salary / 1000)}K
            </div>
            <div className="text-sm text-slate-500 mt-1">Middle 50%</div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Job Titles */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top Job Titles</h2>
          <div className="space-y-1">
            {topJobs.map((job: { job_title_slug: string; job_title_clean: string; filings: string; median_salary: number }) => (
              <div key={job.job_title_slug} className="flex justify-between items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <Link href={`/job/${job.job_title_slug}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium truncate max-w-[60%]">
                  {job.job_title_clean}
                </Link>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-emerald-600">
                    ${Math.round(job.median_salary / 1000)}K
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {parseInt(job.filings).toLocaleString()} filings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top Locations</h2>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Year-over-Year Trend</h2>
          <div className="space-y-2">
            {yearlyTrend.map((year: { fiscal_year: number; filings: string; median_salary: number }) => (
              <div key={year.fiscal_year} className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-mono w-12">FY{year.fiscal_year}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-6 relative">
                  <div
                    className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, (year.median_salary / 250000) * 100)}%` }}
                  >
                    <span className="text-xs text-white font-mono font-medium">
                      ${Math.round(year.median_salary / 1000)}K
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono w-16 text-right">
                  {parseInt(year.filings).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Records */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Filings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Job Title</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">City</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Salary</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Year</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((record: { job_title_clean: string; worksite_city: string; worksite_state: string; annual_salary: string; fiscal_year: number }, i: number) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 text-slate-700 truncate max-w-[120px]">{record.job_title_clean}</td>
                    <td className="px-3 py-2 text-slate-500">{record.worksite_city}, {record.worksite_state}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">
                      ${parseInt(record.annual_salary).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400">FY{record.fiscal_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}