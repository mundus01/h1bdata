import { query } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 86400;

async function getTopCities(year: string) {
  const yearFilter = year === 'all' ? '' : `AND fiscal_year = ${parseInt(year)}`;
  const result = await query(`
    SELECT 
      INITCAP(MAX(worksite_city)) as worksite_city,
      MAX(worksite_state) as worksite_state,
      worksite_city_slug,
      COUNT(*) as filings,
      COUNT(DISTINCT employer_slug) as employers,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY annual_salary)) as median_salary
    FROM lca_records
    WHERE annual_salary BETWEEN 30000 AND 1000000
    AND case_status ILIKE '%certified%'
    AND worksite_city_slug IS NOT NULL
    ${yearFilter}
    GROUP BY worksite_city_slug
    HAVING COUNT(*) >= 10
    ORDER BY filings DESC
    LIMIT 100
  `);
  return result.rows;
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return {
    title: `Top 100 Cities for H1B Jobs ${year} | H1BData.us`,
    description: `The top 100 cities with the most H1B filings in ${year}. See median salaries and top employers by city.`,
    alternates: { canonical: `/top-cities/${year}` },
  };
}

export default async function TopCitiesPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const cities = await getTopCities(year);
  const years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Top 100 Cities for H1B Jobs</h1>
          <p className="text-slate-300 mt-2">Ranked by filing volume • FY{year}</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 flex-wrap mb-6">
          {years.map(y => (
            <Link key={y} href={`/top-cities/${y}`}
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
                  <th className="sticky top-16 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">#</th>
                  <th className="sticky top-16 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">City</th>
                  <th className="sticky top-16 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">H1B Filings</th>
                  <th className="sticky top-16 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Median Salary</th>
                  <th className="sticky top-16 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Employers</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city: { worksite_city_slug: string; worksite_city: string; worksite_state: string; filings: string; employers: string; median_salary: number | null }, i: number) => (
                  <tr key={city.worksite_city_slug} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/location/${city.worksite_city_slug}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {city.worksite_city}{city.worksite_state ? `, ${city.worksite_state}` : ''}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      {parseInt(city.filings).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      {city.median_salary ? `$${Math.round(city.median_salary / 1000)}K` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {parseInt(city.employers).toLocaleString()}
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