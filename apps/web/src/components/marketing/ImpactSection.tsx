import { Building2, Siren, Users } from 'lucide-react';

const AUDIENCES = [
  {
    icon: Building2,
    title: 'Disaster management authorities',
    body: 'Faster event verification and situational awareness across states, without waiting on manual cross-checks.',
  },
  {
    icon: Siren,
    title: 'Emergency responders',
    body: 'Prioritize incidents using real-time, evidence-backed intelligence instead of unverified chatter.',
  },
  {
    icon: Users,
    title: 'Citizens & communities',
    body: 'Better, localized awareness of weather events as they develop, sourced from people on the ground.',
  },
];

export default function ImpactSection() {
  return (
    <section id="impact" className="bg-[#12141A] text-[#F7F4EC] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <span className="text-[12px] font-mono uppercase tracking-wider text-[#1FBF9B]">
          Impact
        </span>
        <h2 className="font-display mt-4 max-w-2xl text-[32px] leading-tight tracking-tight sm:text-[40px]">
          One verified layer, useful to everyone who has to act on it.
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-3xl border border-white/10 p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#1FBF9B]">
                <a.icon size={18} />
              </div>
              <h3 className="mt-5 text-[16px] font-semibold">{a.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#B7BAC2]">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
