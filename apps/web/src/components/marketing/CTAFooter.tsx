import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function CTAFooter() {
  return (
    <>
      <section className="bg-[#F7F4EC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="rounded-3xl bg-[#FF5A1F] px-8 py-14 text-center sm:px-16">
            <h2 className="font-display text-[30px] leading-tight tracking-tight text-[#12141A] sm:text-[40px]">
              See the pipeline turn raw reports into a verified event, live.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#3a1c0d]">
              Trigger a demo scenario on the dashboard and watch ingestion, deduplication and
              confidence scoring run end to end.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#12141A] px-6 py-3.5 text-[15px] font-semibold text-[#F7F4EC] hover:bg-white hover:text-[#12141A] transition-colors"
              >
                Open live dashboard
                <ArrowUpRight size={16} />
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-[#12141A]/30 px-6 py-3.5 text-[15px] font-semibold text-[#12141A] hover:border-[#12141A] transition-colors"
              >
                Open admin panel
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#12141A] text-[#B7BAC2]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F4EC] text-[#12141A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
                </span>
                <div className="flex flex-col">
                  <span className="font-display text-[16px] text-[#F7F4EC]">Weather Nexus</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#FF5A1F]">by Team AtmosAI</span>
                </div>
              </div>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed">
                National Weather Big Data Analytics Platform, engineered by Team AtmosAI.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[13px] sm:grid-cols-3">
              <div>
                <p className="font-mono uppercase tracking-wider text-[11px] text-[#6c6f78]">
                  Focus
                </p>
                <p className="mt-2">Weather event verification</p>
                <p className="mt-1">Disaster management</p>
              </div>
              <div>
                <p className="font-mono uppercase tracking-wider text-[11px] text-[#6c6f78]">
                  Data sources
                </p>
                <p className="mt-2">IMD bulletins &amp; sensors</p>
                <p className="mt-1">News, social, citizen reports</p>
              </div>
              <div>
                <p className="font-mono uppercase tracking-wider text-[11px] text-[#6c6f78]">
                  Product
                </p>
                <Link href="/dashboard" className="mt-2 block hover:text-[#F7F4EC]">
                  Live dashboard
                </Link>
                <Link href="/admin" className="mt-1 block hover:text-[#F7F4EC]">
                  Admin panel
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-[12px] text-[#6c6f78]">
            This build runs on locally seeded and simulated demo scenarios alongside the same
            verification pipeline used for live ingested signals.
          </div>
        </div>
      </footer>
    </>
  );
}
