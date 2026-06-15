import type { Metadata } from 'next';
import SalaryCalculator from '@/components/SalaryCalculator';

export const metadata: Metadata = {
  title: 'H1B Salary Calculator — Is My Offer Fair? | H1BData.us',
  description: 'Compare your job offer against millions of real H1B salary filings from the US Department of Labor. See your percentile, the median, and top-paying companies for your role.',
  alternates: { canonical: '/salary-calculator' },
};

export default function SalaryCalculatorPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3">Is My H1B Offer Fair?</h1>
          <p className="text-slate-300 text-base sm:text-lg">
            Compare your salary against millions of real H1B filings from the US Department of Labor.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10 -mt-8 relative z-10">
        <SalaryCalculator />
      </div>
    </>
  );
}
