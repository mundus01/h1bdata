import { query } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

async function getLocationData(slug: string) {
    const result = await query(`
      SELECT 
        worksite_city,
        worksite_state,
        worksite_city_slug,
        total_filings,
        distinct_employers as total_employers,
        p25_salary,
        median_salary,
        p75_salary,
        first_year,
        last_year
      FROM city_stats
      WHERE worksite_city_slug = $1
    `, [slug]);
  
    if (result.rows.length === 0) return null;
    if (parseInt(result.rows[0].total_filings) < 5) return null;
    return result.rows[0];
  }

  async function getTopEmployers(slug: string) {
    const result = await query(`
      SELECT cs.employer_name_clean, ccs.employer_slug, ccs.filings, ccs.median_salary
      FROM company_city_stats ccs
      JOIN company_stats cs ON cs.employer_slug = ccs.employer_slug
      WHERE ccs.worksite_city_slug = $1
      ORDER BY ccs.filings DESC
      LIMIT 10
    `, [slug]);
    return result.rows;
  }

  async function getTopJobs(slug: string) {
    const result = await query(`
      SELECT js.job_title_clean, cjs.job_title_slug,
      SUM(cjs.filings) as filings,
      ROUND(AVG(cjs.median_salary)) as median_salary
      FROM company_job_stats cjs
      JOIN job_stats js ON js.job_title_slug = cjs.job_title_slug
      WHERE cjs.employer_slug IN (
        SELECT employer_slug FROM company_city_stats 
        WHERE worksite_city_slug = $1
      )
      GROUP BY js.job_title_clean, cjs.job_title_slug
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
      WHERE worksite_city_slug = $1
      GROUP BY fiscal_year
      ORDER BY fiscal_year
    `, [slug]);
    return result.rows;
  }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = await getLocationData(slug);
  if (!location) return { title: 'Location Not Found', robots: { index: false } };
  return {
    title: `H1B Salary in ${location.worksite_city}, ${location.worksite_state} — Median $${Math.round(location.median_salary / 1000)}K, ${parseInt(location.total_filings).toLocaleString()} Records | H1B Data`,
    description: `${parseInt(location.total_filings).toLocaleString()} H1B filings in ${location.worksite_city}, ${location.worksite_state}. Median salary $${Math.round(location.median_salary / 1000)}K. Top employers and job titles.`,
    alternates: { canonical: `/location/${slug}` },
  };
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [location, topEmployers, topJobs, yearlyTrend] = await Promise.all([
    getLocationData(slug),
    getTopEmployers(slug),
    getTopJobs(slug),
    getYearlyTrend(slug),
  ]);

  if (!location) notFound();

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
              "name": `H1B Salary Data in ${location.worksite_city}, ${location.worksite_state}`,
              "description": `H1B salary data for ${location.worksite_city}, ${location.worksite_state}. ${parseInt(location.total_filings).toLocaleString()} filings from ${parseInt(location.total_employers).toLocaleString()} employers. Median salary $${Math.round(location.median_salary / 1000)}K.`,
              "url": `https://h1bdata.us/location/${slug}`,
              "creator": { "@type": "Organization", "name": "H1BData.us" },
              "spatialCoverage": `${location.worksite_city}, ${location.worksite_state}`
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://h1bdata.us" },
                { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://h1bdata.us/locations" },
                { "@type": "ListItem", "position": 3, "name": `${location.worksite_city}, ${location.worksite_state}`, "item": `https://h1bdata.us/location/${slug}` }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": `What is the average H1B salary in ${location.worksite_city}?`,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `The median H1B salary in ${location.worksite_city}, ${location.worksite_state} is $${Math.round(location.median_salary / 1000)}K based on ${parseInt(location.total_filings).toLocaleString()} certified LCA filings.`
                  }
                },
                {
                  "@type": "Question",
                  "name": `Which companies sponsor H1B visas in ${location.worksite_city}?`,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `There are ${parseInt(location.total_employers).toLocaleString()} companies that have sponsored H1B visas in ${location.worksite_city}, ${location.worksite_state}.`
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
            <Link href="/locations" className="hover:text-white">Locations</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-200">{location.worksite_city}, {location.worksite_state}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            H1B Salaries in {location.worksite_city}, {location.worksite_state}
          </h1>
          <p className="text-slate-300">
            FY{location.first_year} – FY{location.last_year} • {parseInt(location.total_employers).toLocaleString()} employers • Official DOL Data
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-emerald-600">
              ${Math.round(location.median_salary / 1000)}K
            </div>
            <div className="text-sm text-slate-500 mt-1">Median Salary</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {parseInt(location.total_filings).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 mt-1">Total Filings</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {parseInt(location.total_employers).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 mt-1">Employers</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-xl font-extrabold font-mono text-emerald-600">
              ${Math.round(location.p25_salary / 1000)}K–${Math.round(location.p75_salary / 1000)}K
            </div>
            <div className="text-sm text-slate-500 mt-1">Middle 50%</div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Employers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top Employers</h2>
          <div className="space-y-1">
            {topEmployers.map((emp: { employer_slug: string; employer_name_clean: string; filings: string; median_salary: number }) => (
              <div key={emp.employer_slug} className="flex justify-between items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <Link href={`/company/${emp.employer_slug}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium truncate max-w-[60%]">
                  {emp.employer_name_clean}
                </Link>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-emerald-600">
                    ${Math.round(emp.median_salary / 1000)}K
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {parseInt(emp.filings).toLocaleString()} filings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Jobs */}
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

        {/* Yearly Trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            H1B Filings in {location.worksite_city} by Year
          </h2>
          <div className="space-y-2">
            {yearlyTrend.map((year: { fiscal_year: number; filings: string; median_salary: number }) => (
              <div key={year.fiscal_year} className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-mono w-12">FY{year.fiscal_year}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-7 relative">
                  <div
                    className="bg-blue-600 h-7 rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${Math.min(100, (year.median_salary / 300000) * 100)}%` }}
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