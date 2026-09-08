'use client';

import {
  Layers,
  Database,
  ShieldCheck,
  GitMerge,
  SlidersHorizontal,
  Compass,
  Building,
  Globe2,
  Lock,
  Workflow,
  Sparkles,
  Share2,
} from 'lucide-react';

const CHALLENGES = [
  {
    icon: Database,
    challenge: 'API / Data Limitations',
    desc: 'Restricted access or temporarily unavailable sources',
    strategy: 'Multiple Independent Sources',
    solution: 'Aggregates IMD APIs, open weather datasets, radar feeds, and ground citizen inputs simultaneously.',
  },
  {
    icon: ShieldCheck,
    challenge: 'Fake / Misleading Reports',
    desc: 'False rumors or manipulated disaster footage on social media',
    strategy: 'AI Verification + Source Credibility',
    solution: 'Cross-source corroboration, reverse perceptual image hashing, and weighted credibility scoring.',
  },
  {
    icon: GitMerge,
    challenge: 'Duplicate Events',
    desc: 'Same weather incident reported multiple times by different observers',
    strategy: 'Semantic + Spatial-Temporal Clustering',
    solution: 'Jaccard semantic similarity and Haversine distance clustering automatically detect and merge duplicates.',
  },
  {
    icon: SlidersHorizontal,
    challenge: 'AI False Positives',
    desc: 'Incorrect automated event classification or exaggerated severity',
    strategy: 'Confidence Score + Human Verification',
    solution: 'Deterministic 7-factor numerical thresholds combined with human admin review for critical dispatches.',
  },
];

const ROADMAP = [
  {
    step: '01',
    phase: 'PROTOTYPE',
    highlight: 'CURRENT STAGE',
    desc: 'Validate selected weather hazard events with local ground truth & multi-source corroboration.',
  },
  {
    step: '02',
    phase: 'REGIONAL PILOT',
    highlight: 'NEXT 6 MONTHS',
    desc: 'Deploy in high-vulnerability pilot sectors (Assam Brahmaputra basin, coastal Gujarat, Delhi-NCR).',
  },
  {
    step: '03',
    phase: 'MULTI-STATE',
    highlight: 'SCALE PHASE',
    desc: 'Expand with direct real-time state disaster management authority (SDMA / DDMA) integration.',
  },
  {
    step: '04',
    phase: 'NATIONAL INTELLIGENCE',
    highlight: 'PAN-INDIA',
    desc: 'Pan-India decision-support platform for national agencies (NDRF, NDMA, CWC, IMD).',
  },
];

const ADVANTAGES = [
  {
    icon: Layers,
    title: 'Modular Architecture',
    desc: 'Easily extensible to new sensor types, satellite bands, and municipal IoT nodes.',
  },
  {
    icon: Share2,
    title: 'API-Based Integration',
    desc: 'Flexible and scalable REST & OASIS CAP v1.2 endpoints for instant disaster agency handoff.',
  },
  {
    icon: Globe2,
    title: 'Sustainable & Scalable',
    desc: 'Engineered to scale from individual municipal wards to pan-India national surveillance.',
  },
  {
    icon: Sparkles,
    title: 'Open-Source Components',
    desc: 'Built on proven, transparent, and cost-effective open technologies (PostGIS, NestJS, Next.js).',
  },
];

export default function FeasibilitySection() {
  return (
    <section id="feasibility" className="bg-[#F7F4EC] py-20 sm:py-28 border-t border-[#12141A]/10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 space-y-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#FF5A1F]">
              Feasibility and Viability
            </span>
            <h2 className="font-display mt-4 text-[32px] leading-tight tracking-tight text-[#12141A] sm:text-[40px]">
              Built for real-world deployment challenges.
            </h2>
          </div>
          <p className="max-w-md text-[14.5px] leading-relaxed text-[#565b68]">
            Meteorological operations face hostile noise, missing APIs, and false rumors.
            Here is our strategic architecture to overcome them.
          </p>
        </div>

        {/* Challenges vs Strategies Table / Grid */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#565b68] mb-6">
            Challenges &amp; Risks &rarr; Our Counter-Strategies
          </h3>
          <div className="grid gap-5 md:grid-cols-2">
            {CHALLENGES.map((c) => (
              <div
                key={c.challenge}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-[#12141A]/10 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center">
                      <c.icon size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#12141A]">{c.challenge}</h4>
                      <p className="text-xs text-[#8b8e97]">{c.desc}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#12141A]/10">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1F8A70] block mb-1">
                      Strategy: {c.strategy}
                    </span>
                    <p className="text-xs text-[#565b68] leading-relaxed">
                      {c.solution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Viability Deployment Roadmap */}
        <div className="rounded-3xl border border-[#12141A]/10 bg-white p-6 sm:p-8">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#FF5A1F] block mb-2">
            Viability Roadmap
          </span>
          <h3 className="text-xl font-bold font-display text-[#12141A] mb-8">
            From Prototype Validation to Pan-India Weather Intelligence
          </h3>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROADMAP.map((r, i) => (
              <div key={r.phase} className="relative bg-[#F7F4EC]/60 rounded-2xl p-5 border border-[#12141A]/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#FF5A1F]">{r.step}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#12141A] text-white">
                    {r.highlight}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#12141A] mb-1.5">{r.phase}</h4>
                <p className="text-xs text-[#565b68] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Core Advantages */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#1F8A70] block mb-2">
            Strategic Advantages
          </span>
          <h3 className="text-xl font-bold font-display text-[#12141A] mb-6">
            Why Weather Nexus succeeds in national deployment
          </h3>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((adv) => (
              <div
                key={adv.title}
                className="bg-white rounded-3xl p-6 border border-[#12141A]/10 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#12141A] text-[#F7F4EC] flex items-center justify-center mb-4">
                  <adv.icon size={18} />
                </div>
                <h4 className="font-bold text-sm text-[#12141A]">{adv.title}</h4>
                <p className="mt-2 text-xs text-[#565b68] leading-relaxed">{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
