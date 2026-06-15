export default function Loading() {
  return (
    <div>
      <div className="bg-[#0A1628]">
        <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-8 w-64 bg-white/10 rounded mb-3" />
          <div className="h-4 w-80 bg-white/10 rounded" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 shadow-sm" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
