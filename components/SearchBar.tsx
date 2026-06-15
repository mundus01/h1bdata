'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion {
  name: string;
  slug: string;
  count: number;
}

function SuggestionList({ suggestions, onSelect }: { suggestions: Suggestion[]; onSelect: (s: Suggestion) => void }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-64 overflow-y-auto">
      {suggestions.map((s) => (
        <button
          key={s.slug}
          type="button"
          onClick={() => onSelect(s)}
          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex justify-between items-center border-b border-gray-100 last:border-0"
        >
          <span className="text-sm font-medium text-slate-800 truncate">{s.name}</span>
          <span className="text-xs text-slate-400 font-mono ml-2 shrink-0">{parseInt(s.count.toString()).toLocaleString()} filings</span>
        </button>
      ))}
    </div>
  );
}

export default function SearchBar() {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [job, setJob] = useState('');
  const [city, setCity] = useState('');
  const [companySuggestions, setCompanySuggestions] = useState<Suggestion[]>([]);
  const [jobSuggestions, setJobSuggestions] = useState<Suggestion[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<Suggestion[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});

  async function fetchSuggestions(q: string, type: string, setter: (s: Suggestion[]) => void) {
    if (q.length < 2) { setter([]); return; }
    clearTimeout(debounceRefs.current[type]);
    debounceRefs.current[type] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
        if (!res.ok) { setter([]); return; }
        const data = await res.json();
        setter(Array.isArray(data) ? data : []);
      } catch {
        setter([]);
      }
    }, 200);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (company) params.set('company', company);
    if (job) params.set('job', job);
    if (city) params.set('city', city);
    router.push('/search?' + params.toString());
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-3 shadow-lg text-left">
      <div className="relative flex-1">
        <input
          aria-label="Company name"
          value={company}
          onChange={e => { setCompany(e.target.value); fetchSuggestions(e.target.value, 'company', setCompanySuggestions); }}
          onFocus={() => setActiveField('company')}
          onBlur={() => setTimeout(() => setActiveField(null), 200)}
          placeholder="Company name (e.g. Google)"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {activeField === 'company' && (
          <SuggestionList
            suggestions={companySuggestions}
            onSelect={s => { setCompany(s.name); setCompanySuggestions([]); }}
          />
        )}
      </div>

      <div className="relative flex-1">
        <input
          aria-label="Job title"
          value={job}
          onChange={e => { setJob(e.target.value); fetchSuggestions(e.target.value, 'job', setJobSuggestions); }}
          onFocus={() => setActiveField('job')}
          onBlur={() => setTimeout(() => setActiveField(null), 200)}
          placeholder="Job title (e.g. Software Engineer)"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {activeField === 'job' && (
          <SuggestionList
            suggestions={jobSuggestions}
            onSelect={s => { setJob(s.name); setJobSuggestions([]); }}
          />
        )}
      </div>

      <div className="relative flex-1">
        <input
          aria-label="City or state"
          value={city}
          onChange={e => { setCity(e.target.value); fetchSuggestions(e.target.value, 'city', setCitySuggestions); }}
          onFocus={() => setActiveField('city')}
          onBlur={() => setTimeout(() => setActiveField(null), 200)}
          placeholder="City or state"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {activeField === 'city' && (
          <SuggestionList
            suggestions={citySuggestions}
            onSelect={s => { setCity(s.name); setCitySuggestions([]); }}
          />
        )}
      </div>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
      >
        Search
      </button>
    </form>
  );
}
