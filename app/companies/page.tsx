import { query } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 86400;

async function getCompanies(letter: string) {
  // Whitelist the letter so it can never reach SQL as anything but A–Z.
  const safeLetter = /^[A-Z]$/.test(letter) ? letter : null;

  const result = await query(`
    SELECT
      employer_name_clean, employer_slug,
      total_filings as filings,
      median_salary,
      last_year
    FROM company_stats
    WHERE ($1::text IS NULL OR employer_name_clean ILIKE $1)
    ORDER BY total_filings DESC
    LIMIT 200
  `, [safeLetter ? `${safeLetter}%` : null]);
  return result.rows;
}

export const metadata = {
  title: 'H1B Sponsor Companies — Browse All H1B Employers | H1BData.us',
  description: 'Browse all H1B sponsor companies. See filing counts, median salaries, and approval rates for every H1B employer.',
  alternates: { canonical: '/companies' },
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string }>;
}) {
  const { letter = 'ALL' } = await searchParams;
  const companies = await getCompanies(letter);
  const alphabet = ['ALL', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Browse H1B Sponsor Companies</h1>
          <p className="text-slate-300 mt-2">Filing counts and median salaries for every H1B employer.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Alphabet Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {alphabet.map(l => (
            <Link
              key={l}
              href={`/companies?letter=${l}`}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                letter === l
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {l}
            </Link>
          ))}
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="bg-slate-50 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Company</th>
                  <th className="bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">H1B Filings</th>
                  <th className="bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Median Salary</th>
                  <th className="bg-slate-50 text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Latest Year</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company: { employer_slug: string; employer_name_clean: string; filings: string; median_salary: number | null; last_year: number }) => (
                  <tr key={company.employer_slug} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/company/${company.employer_slug}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {company.employer_name_clean}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {parseInt(company.filings).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      {company.median_salary ? `$${Math.round(company.median_salary / 1000)}K` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      FY{company.last_year}
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