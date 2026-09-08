import {
  Building2,
  Siren,
  Users,
  Landmark,
  Radio,
  Newspaper,
  HeartHandshake,
  TrendingUp,
  Leaf,
  Cpu,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

const AUDIENCES = [
  {
    icon: Building2,
    title: 'Disaster Management Authorities',
    body: 'Faster event verification & situational awareness across national and state operations centers.',
  },
  {
    icon: Siren,
    title: 'Emergency Responders',
    body: 'Prioritize critical incidents and deployment routes using real-time verified intelligence.',
  },
  {
    icon: Users,
    title: 'Citizens & Communities',
    body: 'Hyper-local awareness of emerging weather events with direct crowdsourced reporting channels.',
  },
  {
    icon: Landmark,
    title: 'Local Administration',
    body: 'Data-driven response, ward-level drainage management, and municipal resource allocation.',
  },
  {
    icon: Radio,
    title: 'IMD / Weather Stakeholders',
    body: 'Unified multi-source event intelligence bridging satellite/radar models with ground truth.',
  },
  {
    icon: Newspaper,
    title: 'Media & Public Information Teams',
    body: 'Reliable, evidence-backed event information preventing sensationalized disaster rumors.',
  },
];

const BENEFITS = [
  {
    icon: HeartHandshake,
    title: 'Social Benefits',
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    points: ['Faster response times', 'Safer communities', 'Reliable crisis information', 'Inclusive reporting channels'],
  },
  {
    icon: TrendingUp,
    title: 'Economic Benefits',
    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    points: ['Reduced response costs', 'Lower economic disruption', 'Critical infrastructure protection', 'Better resource allocation'],
  },
  {
    icon: Leaf,
    title: 'Environmental Benefits',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    points: ['Real-time hazard mapping', 'Granular event intelligence', 'Data-driven drainage planning', 'Long-term resilience planning'],
  },
  {
    icon: Cpu,
    title: 'Technological Benefits',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    points: ['Multi-source data integration', 'AI-powered verification & NLP', 'Scalable & adaptable pipeline', 'Interoperable with existing systems'],
  },
  {
    icon: ShieldCheck,
    title: 'Governance Benefits',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    points: ['Evidence-based decisions', 'Inter-agency coordination', 'Greater audit transparency', 'Policy and planning support'],
  },
  {
    icon: ShieldAlert,
    title: 'Resilience Benefits',
    color: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
    points: ['Pre-disaster preparedness', 'Faster recovery support', 'Stronger local communities', 'A more climate-resilient India'],
  },
];

export default function ImpactSection() {
  return (
    <section id="impact" className="bg-[#12141A] text-[#F7F4EC] py-20 sm:py-28 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 space-y-20">
        {/* Target Audience */}
        <div>
          <div className="max-w-2xl">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#1FBF9B]">
              Potential Impact on Target Audience
            </span>
            <h2 className="font-display mt-4 text-[32px] leading-tight tracking-tight sm:text-[40px]">
              One verified layer, operational for all stakeholders.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#1FBF9B]">
                  <a.icon size={18} />
                </div>
                <h3 className="mt-4 text-[15.5px] font-semibold text-[#F7F4EC]">{a.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#B7BAC2]">{a.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits of the Solution */}
        <div>
          <div className="max-w-2xl">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#FF9166]">
              Benefits of the Solution
            </span>
            <h2 className="font-display mt-4 text-[32px] leading-tight tracking-tight sm:text-[40px]">
              Measurable national advantages across 6 dimensions.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${b.color}`}>
                  <b.icon size={18} />
                </div>
                <h3 className="mt-4 text-[15.5px] font-semibold text-[#F7F4EC]">{b.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {b.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-[13px] text-[#B7BAC2]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
