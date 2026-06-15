import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16">
      <div className="text-center px-4">
        <div className="text-8xl font-extrabold font-mono text-blue-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-8">
          We couldn&apos;t find that company, job title, or location in our database.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Search H1B Data
          </Link>
          <Link href="/top-sponsors/2025" className="bg-white text-slate-700 px-6 py-3 rounded-lg font-semibold border border-gray-200 hover:border-blue-300 transition-colors">
            Top H1B Sponsors
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          <Link href="/companies" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-300 transition-all text-sm text-blue-600 font-medium">
            Browse Companies
          </Link>
          <Link href="/jobs" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-300 transition-all text-sm text-blue-600 font-medium">
            Browse Job Titles
          </Link>
          <Link href="/top-cities/2025" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-300 transition-all text-sm text-blue-600 font-medium">
            Browse Cities
          </Link>
        </div>
      </div>
    </div>
  );
}