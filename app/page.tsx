import { query } from '@/lib/db';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

export const revalidate = 86400;

export const metadata = {
  alternates: { canonical: '/' },
};

async function getStats() {
  const [total, companies, jobs, cities] = await Promise.all([
    query('SELECT SUM(total_filings) as count FROM company_stats'),
    query('SELECT COUNT(*) as count FROM company_stats'),
    query('SELECT COUNT(*) as count FROM job_stats'),
    query('SELECT COUNT(*) as count FROM city_stats'),
  ]);

  return {
    total: parseInt(total.rows[0].count).toLocaleString(),
    companies: parseInt(companies.rows[0].count).toLocaleString(),
    jobs: parseInt(jobs.rows[0].count).toLocaleString(),
    cities: parseInt(cities.rows[0].count).toLocaleString(),
  };
}

async function getTopCompanies() {
  const result = await query(`
    SELECT employer_name_clean, employer_slug, total_filings, avg_salary
    FROM company_stats
    ORDER BY total_filings DESC
    LIMIT 12
  `);
  return result.rows;
}

async function getTopJobs() {
  const result = await query(`
    SELECT job_title_clean, job_title_slug, total_filings, avg_salary
    FROM job_stats
    ORDER BY total_filings DESC
    LIMIT 12
  `);
  return result.rows;
}

export default async function HomePage() {
  const [stats, topCompanies, topJobs] = await Promise.all([
    getStats(),
    getTopCompanies(),
    getTopJobs(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            H1B Salary Database
          </h1>
          <p className="text-slate-300 text-base sm:text-lg mb-8">
            Search <span className="font-mono text-emerald-400">{stats.total}</span> certified H1B records from the US Department of Labor
          </p>
          <SearchBar />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 sm:-mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Certified Records', value: stats.total },
            { label: 'Companies', value: stats.companies },
            { label: 'Job Titles', value: stats.jobs },
            { label: 'Cities', value: stats.cities },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="text-2xl font-extrabold font-mono text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Companies */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Top H1B Sponsors</h2>
          <Link href="/top-sponsors/2025" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topCompanies.map((company: { employer_slug: string; employer_name_clean: string; total_filings: string; avg_salary: number }) => (
            <Link
              key={company.employer_slug}
              href={`/company/${company.employer_slug}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-slate-900 mb-2 truncate">
                {company.employer_name_clean}
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-slate-500">{parseInt(company.total_filings).toLocaleString()} filings</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  ${Math.round(company.avg_salary / 1000)}K avg
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Jobs */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Top H1B Job Titles</h2>
          <Link href="/jobs" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topJobs.map((job: { job_title_slug: string; job_title_clean: string; total_filings: string; avg_salary: number }) => (
            <Link
              key={job.job_title_slug}
              href={`/job/${job.job_title_slug}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-slate-900 mb-2 truncate">
                {job.job_title_clean}
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-slate-500">{parseInt(job.total_filings).toLocaleString()} filings</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  ${Math.round(job.avg_salary / 1000)}K avg
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}