import Link from 'next/link';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Companies', href: '/companies' },
      { label: 'Job Titles', href: '/jobs' },
      { label: 'Locations', href: '/locations' },
      { label: 'Top Sponsors', href: '/top-sponsors/2025' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { label: 'Salary Calculator', href: '/salary-calculator' },
      { label: 'Top Paying Companies', href: '/top-paying-companies/2025' },
      { label: 'Top Paying Jobs', href: '/top-paying-jobs/2025' },
      { label: 'Top Cities', href: '/top-cities/2025' },
    ],
  },
  {
    title: 'Years',
    links: [
      { label: 'FY2025', href: '/top-sponsors/2025' },
      { label: 'FY2024', href: '/top-sponsors/2024' },
      { label: 'FY2023', href: '/top-sponsors/2023' },
      { label: 'FY2022', href: '/top-sponsors/2022' },
      { label: 'FY2021', href: '/top-sponsors/2021' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'About the Data', href: '/about' },
      { label: 'DOL Source', href: 'https://www.dol.gov/agencies/eta/foreign-labor/performance' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#0A1628] text-slate-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-1">
              <span className="text-2xl font-extrabold text-blue-500">H1B</span>
              <span className="text-2xl font-extrabold text-white">Data</span>
            </Link>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              The most comprehensive H1B salary database.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => {
                  const external = link.href.startsWith('http');
                  return (
                    <li key={link.label}>
                      {external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} H1BData.us — Not affiliated with USCIS or DOL.</p>
          <p>Data sourced from US Department of Labor LCA Disclosure Data.</p>
        </div>
      </div>
    </footer>
  );
}
