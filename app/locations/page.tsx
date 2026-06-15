import { query } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata = {
  title: 'H1B Salaries by Location — Browse Cities | H1BData.us',
  description: 'Browse H1B salary data by city. See filing counts, median salaries, and top employers for every U.S. city with H1B sponsorship.',
  alternates: { canonical: '/locations' },
};

async function getCities() {
  const result = await query(`
    SELECT
      worksite_city, worksite_state, worksite_city_slug,
      total_filings as filings,
      distinct_employers as employers,
      median_salary
    FROM city_stats
    ORDER BY total_filings DESC
    LIMIT 300
  `);
  return result.rows;
}

export default async function LocationsPage() {
  const cities = await getCities();

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-12">
          <div className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">→</span>
            <span className="text-slate-200">Locations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Browse H1B Salaries by Location</h1>
          <p className="text-slate-300 mt-2">Filing counts and median salaries for every U.S. city with H1B sponsorship.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="sticky top-16 bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">City</th>
                  <th className="sticky top-16 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">H1B Filings</th>
                  <th className="sticky top-16 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Employers</th>
                  <th className="sticky top-16 bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Median Salary</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city: { worksite_city_slug: string; worksite_city: string; worksite_state: string; filings: string; employers: string; median_salary: number | null }) => (
                  <tr key={city.worksite_city_slug} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/location/${city.worksite_city_slug}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {city.worksite_city}{city.worksite_state ? `, ${city.worksite_state}` : ''}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {parseInt(city.filings).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {parseInt(city.employers).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      {city.median_salary ? `$${Math.round(city.median_salary / 1000)}K` : '—'}
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
