import { query } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 86400;

async function getTopPayingCompanies(year: string) {
  const yearFilter = year === 'all' ? '' : `AND fiscal_year = ${parseInt(year)}`;
  const result = await query(`
    SELECT 
      employer_name_clean, employer_slug,
      COUNT(*) as filings,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY annual_salary)) as median_salary,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY annual_salary)) as p75_salary,
      ROUND(AVG(annual_salary)) as avg_salary
    FROM lca_records
    WHERE annual_salary BETWEEN 30000 AND 1000000
    AND case_status ILIKE '%certified%'
    ${yearFilter}
    GROUP BY employer_name_clean, employer_slug
    HAVING COUNT(*) >= 10
    ORDER BY median_salary DESC
    LIMIT 100
  `);
  return result.rows;
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return {
    title: `Top 100 Highest Paying H1B Companies ${year} | H1BData.us`,
    description: `The top 100 highest paying H1B sponsors in ${year} ranked by median salary.`,
    alternates: { canonical: `/top-paying-companies/${year}` },
  };
}

export default async function TopPayingCompaniesPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const companies = await getTopPayingCompanies(year);
  const years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Top 100 Highest Paying H1B Companies</h1>
          <p className="text-slate-300 mt-2">Ranked by median salary • Minimum 10 filings • FY{year}</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 flex-wrap mb-6">
          {years.map(y => (
            <Link key={y} href={`/top-paying-companies/${y}`}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                y.toString() === year ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-gray-200 hover:border-blue-300'
              }`}>
              {y}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="sticky top-16 z-10 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">#</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Company</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Median Salary</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">75th Percentile</th>
                  <th className="sticky top-16 z-10 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Filings</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company: { employer_slug: string; employer_name_clean: string; median_salary: number; p75_salary: number; filings: string }, i: number) => (
                  <tr key={company.employer_slug} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/company/${company.employer_slug}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {company.employer_name_clean}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      ${Math.round(company.median_salary / 1000)}K
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      ${Math.round(company.p75_salary / 1000)}K
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {parseInt(company.filings).toLocaleString()}
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