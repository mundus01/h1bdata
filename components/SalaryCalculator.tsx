'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CalcResult {
  percentile: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  total_records: number;
  your_salary: number;
  company: string;
  job: string;
  city: string;
  top_companies: Array<{ employer_name_clean: string; employer_slug: string; median_salary: number }>;
}

export default function SalaryCalculator() {
  const [company, setCompany] = useState('');
  const [job, setJob] = useState('');
  const [city, setCity] = useState('');
  const [salary, setSalary] = useState('');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job || !salary) { setError('Please enter at least a job title and your salary.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const params = new URLSearchParams({ company, job, city, salary });
      const res = await fetch('/api/calculator?' + params.toString());
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  function getLabel(p: number) {
    if (p >= 90) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (p >= 75) return { label: 'Above Average', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (p >= 50) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (p >= 25) return { label: 'Below Average', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'Low', color: 'text-red-600', bg: 'bg-red-50' };
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="calc-company" className="block text-sm font-medium text-slate-700 mb-1">Company Name (optional)</label>
            <input id="calc-company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Microsoft" className="w-full px-4 py-3 rounded-lg border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="calc-job" className="block text-sm font-medium text-slate-700 mb-1">Job Title (required)</label>
            <input id="calc-job" value={job} onChange={e => setJob(e.target.value)} placeholder="e.g. Software Engineer" className="w-full px-4 py-3 rounded-lg border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label htmlFor="calc-city" className="block text-sm font-medium text-slate-700 mb-1">City (optional)</label>
            <input id="calc-city" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. San Francisco" className="w-full px-4 py-3 rounded-lg border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="calc-salary" className="block text-sm font-medium text-slate-700 mb-1">Your Offered Salary (required)</label>
            <input id="calc-salary" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. 150000" type="number" min="0" className="w-full px-4 py-3 rounded-lg border border-gray-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-lg transition-colors disabled:opacity-50">
          {loading ? 'Calculating...' : 'Check My Salary'}
        </button>
      </form>

      {result && (
        <div className="space-y-6 mt-8">
          <div className={'rounded-xl border border-gray-100 p-8 text-center ' + getLabel(result.percentile).bg}>
            <div className="text-6xl font-extrabold font-mono text-slate-900 mb-2">{result.percentile}th</div>
            <div className="text-xl font-semibold text-slate-700 mb-1">Percentile</div>
            <div className={'text-lg font-bold mb-3 ' + getLabel(result.percentile).color}>{getLabel(result.percentile).label}</div>
            <p className="text-slate-600">Your offer of <strong className="font-mono text-emerald-600">${parseInt(result.your_salary.toString()).toLocaleString()}</strong> is higher than <strong>{result.percentile}%</strong> of H1B workers in similar roles.</p>
            <p className="text-slate-400 text-sm mt-2 font-mono">Based on {result.total_records.toLocaleString()} real DOL filings</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Salary Distribution</h2>
            <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
              <span>P25: ${Math.round(result.p25 / 1000)}K</span>
              <span>Median: ${Math.round(result.median / 1000)}K</span>
              <span>P75: ${Math.round(result.p75 / 1000)}K</span>
              <span>P90: ${Math.round(result.p90 / 1000)}K</span>
            </div>
            <div className="relative h-8 bg-slate-100 rounded-full mb-4">
              <div className="absolute h-8 bg-blue-200 rounded-full" style={{ left: '0%', width: (result.p75 / result.p90 * 100) + '%' }} />
              <div className="absolute h-8 bg-blue-400 rounded-full" style={{ left: (result.p25 / result.p90 * 100) + '%', width: ((result.p75 - result.p25) / result.p90 * 100) + '%' }} />
              <div className="absolute w-1 h-8 bg-blue-900 rounded-full" style={{ left: (result.median / result.p90 * 100) + '%' }} />
              <div className="absolute w-3 h-8 bg-emerald-400 rounded-full border-2 border-emerald-600" style={{ left: Math.min(95, result.your_salary / result.p90 * 100) + '%' }} />
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{label:'25th',value:result.p25},{label:'Median',value:result.median},{label:'75th',value:result.p75},{label:'90th',value:result.p90}].map(item => (
                <div key={item.label} className="text-center bg-slate-50 rounded-xl p-3">
                  <div className="text-lg font-bold font-mono text-emerald-600">${Math.round(item.value/1000)}K</div>
                  <div className="text-xs text-slate-500">{item.label} Percentile</div>
                </div>
              ))}
            </div>
          </div>
          {result.top_companies.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Top Paying Companies for This Role</h2>
              <div className="space-y-1">
                {result.top_companies.map((co, i) => (
                  <div key={i} className="flex justify-between items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <Link href={'/company/' + co.employer_slug} className="text-blue-600 hover:text-blue-700 text-sm font-medium">{co.employer_name_clean}</Link>
                    <span className="font-mono text-emerald-600 font-semibold text-sm">${Math.round(co.median_salary/1000)}K median</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
