import { query } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 86400;

async function getTopSponsors(year: string) {
  const yearFilter = year === 'all' ? '' : `AND fiscal_year = ${parseInt(year)}`;
  const result = await query(`
    SELECT 
      employer_name_clean, employer_slug,
      COUNT(*) as filings,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY annual_salary)) as median_salary,
      ROUND(AVG(CASE WHEN case_status ILIKE '%certified%' THEN 1.0 ELSE 0 END) * 100, 1) as approval_rate
    FROM lca_records
    WHERE annual_salary BETWEEN 30000 AND 1000000
    ${yearFilter}
    GROUP BY employer_name_clean, employer_slug
    ORDER BY filings DESC
    LIMIT 100
  `);
  return result.rows;
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return {
    title: `Top 100 H1B Sponsors ${year} — Most H1B Filings | H1B Data`,
    description: `The top 100 H1B visa sponsors in ${year} ranked by number of LCA filings. See median salaries and approval rates.`,
    alternates: { canonical: `/top-sponsors/${year}` },
  };
}

export default async function TopSponsorsPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const sponsors = await getTopSponsors(year);
  const years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
          <div className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-200">Top H1B Sponsors {year}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Top 100 H1B Sponsors — FY{year}
          </h1>
          <p className="text-slate-300 mt-2">Ranked by number of LCA filings.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Year selector */}
        <div className="flex gap-2 flex-wrap mb-6">
          {years.map(y => (
            <Link
              key={y}
              href={`/top-sponsors/${y}`}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                y.toString() === year
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="sticky top-16 z-10 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">#</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Company</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">H1B Filings</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Median Salary</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {sponsors.map((company: { employer_slug: string; employer_name_clean: string; filings: string; median_salary: number | null; approval_rate: number }, i: number) => (
                  <tr key={company.employer_slug} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/company/${company.employer_slug}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {company.employer_name_clean}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      {parseInt(company.filings).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      {company.median_salary
                        ? `$${Math.round(company.median_salary / 1000)}K`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-mono font-medium ${
                        company.approval_rate >= 90
                          ? 'bg-emerald-100 text-emerald-700'
                          : company.approval_rate >= 70
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {company.approval_rate}%
                      </span>
                    </td>
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