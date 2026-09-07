import Link from 'next/link';
import { ArrowUpRight, Play } from 'lucide-react';

const STATS = [
  { value: '8', label: 'hazard categories' },
  { value: '7-factor', label: 'confidence fusion' },
  { value: '3-layer', label: 'deduplication' },
  { value: '<1s', label: 'live updates via SSE' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F7F4EC]">
      {/* decorative radar motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] sm:-right-24 sm:-top-24"
      >
        <div className="absolute inset-0 rounded-full border border-[#12141A]/10" />
        <div className="absolute inset-[60px] rounded-full border border-[#12141A]/10" />
        <div className="absolute inset-[120px] rounded-full border border-[#12141A]/10" />
        <div className="absolute inset-[180px] rounded-full border border-[#12141A]/10" />
        <div className="absolute inset-0 animate-radar-sweep origin-center">
          <div className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top bg-gradient-to-b from-[#FF5A1F]/70 to-transparent" />
        </div>
        <span className="absolute left-[22%] top-[38%] h-2 w-2 rounded-full bg-[#1F8A70]" />
        <span className="absolute left-[64%] top-[58%] h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
        <span className="absolute left-[48%] top-[22%] h-1.5 w-1.5 rounded-full bg-[#1F8A70]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="animate-drift-up inline-flex items-center gap-2 rounded-full border border-[#12141A]/15 bg-white/60 px-3 py-1 text-[12px] font-mono uppercase tracking-wider text-[#565b68]">
          National weather intelligence, for India
        </div>

        <h1
          className="animate-drift-up font-display mt-6 max-w-3xl text-[40px] leading-[1.08] tracking-tight text-[#12141A] sm:text-[58px]"
          style={{ animationDelay: '80ms' }}
        >
          One flood gets reported nine different ways.
          <span className="block text-[#565b68]">We turn it into one verified signal.</span>
        </h1>

        <p
          className="animate-drift-up mt-6 max-w-xl text-[16px] leading-relaxed text-[#33363f] sm:text-[18px]"
          style={{ animationDelay: '140ms' }}
        >
          AtmosAI pulls in IMD bulletins, news, social posts and citizen reports, cross-checks
          them against each other, screens out hoaxes and duplicates, and gives every weather
          event a confidence score before it ever reaches a dashboard.
        </p>

        <div
          className="animate-drift-up mt-9 flex flex-wrap items-center gap-4"
          style={{ animationDelay: '200ms' }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[#12141A] px-6 py-3.5 text-[15px] font-semibold text-[#F7F4EC] hover:bg-[#FF5A1F] transition-colors"
          >
            View live dashboard
            <ArrowUpRight size={16} />
          </Link>
          <a
            href="#pipeline"
            className="inline-flex items-center gap-2 rounded-full border border-[#12141A]/20 px-6 py-3.5 text-[15px] font-semibold text-[#12141A] hover:border-[#12141A]/40 transition-colors"
          >
            <Play size={14} />
            See how verification works
          </a>
        </div>

        <dl
          className="animate-drift-up mt-16 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[#12141A]/10 pt-8 sm:grid-cols-4"
          style={{ animationDelay: '260ms' }}
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="font-display text-[26px] text-[#12141A] sm:text-[30px]">{s.value}</dt>
              <dd className="mt-1 text-[13px] text-[#565b68]">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
