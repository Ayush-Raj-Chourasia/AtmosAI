import {
  Radar,
  ShieldCheck,
  Layers,
  FileWarning,
  Satellite,
  FileOutput,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Radar,
    title: 'Live GIS command view',
    body: 'Sub-second updates over Server-Sent Events, plotted on an interactive India map with Doppler radar overlays.',
  },
  {
    icon: ShieldCheck,
    title: '7-factor confidence fusion',
    body: 'Source reliability, AI relevance, media presence, spatial proximity, freshness, corroboration and IMD synergy — combined into one score.',
  },
  {
    icon: Layers,
    title: '3-layer deduplication',
    body: 'Exact-ID matching, semantic overlap and spatiotemporal clustering collapse duplicate reports into a single event.',
  },
  {
    icon: FileWarning,
    title: 'Misinformation quarantine',
    body: 'Sensationalist text and recycled disaster photos are flagged and isolated before they reach a verified feed.',
  },
  {
    icon: Satellite,
    title: 'Official sensor alignment',
    body: 'Field reports are checked against IMD AWS/ARG stations and CWC river gauges for independent corroboration.',
  },
  {
    icon: FileOutput,
    title: 'SITREP & CAP export',
    body: 'One click generates an NDMA/IMD-style situation report or an OASIS CAP v1.2 alert, ready to route onward.',
  },
];

export default function PlatformSection() {
  return (
    <section id="platform" className="bg-[#F1ECE0] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#FF5A1F]">
              Platform
            </span>
            <h2 className="font-display mt-4 text-[32px] leading-tight tracking-tight text-[#12141A] sm:text-[40px]">
              Built for the operations room, not just the demo.
            </h2>
          </div>
          <p className="max-w-sm text-[14.5px] leading-relaxed text-[#565b68]">
            Every capability below ships in the current prototype and is exercised by an
            automated test suite covering the fusion, dedup and lifecycle logic.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[#12141A]/10 bg-[#12141A]/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#F1ECE0] p-7 hover:bg-white transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] text-[#F7F4EC]">
                <f.icon size={18} />
              </div>
              <h3 className="mt-5 text-[15.5px] font-semibold text-[#12141A]">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#565b68]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
