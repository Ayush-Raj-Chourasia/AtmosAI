import { AlertTriangle, Copy, Radio, ShieldQuestion } from 'lucide-react';

const SOURCES = [
  { label: 'IMD bulletins & AWS/ARG feeds', detail: 'Authoritative, but siloed by station and format.' },
  { label: 'News & RSS coverage', detail: 'Fast, but often late to remote districts.' },
  { label: 'Social media (#IMD & weather tags)', detail: 'Immediate, but mixed with noise and hoaxes.' },
  { label: 'Citizen ground reports', detail: 'Hyper-local, but hard to verify one by one.' },
];

const FAULTS = [
  {
    icon: Copy,
    title: 'Duplicated',
    body: 'The same cloudburst gets logged nine times under nine slightly different names and locations.',
  },
  {
    icon: ShieldQuestion,
    title: 'Unverified',
    body: 'A recycled photo from an old cyclone resurfaces and spreads as if it just happened.',
  },
  {
    icon: Radio,
    title: 'Scattered',
    body: 'Every source keeps its own record. No single place shows what is actually happening right now.',
  },
];

export default function ProblemSection() {
  return (
    <section id="problem" className="bg-[#12141A] text-[#F7F4EC] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#FF9166]">
              The problem
            </span>
            <h2 className="font-display mt-4 text-[32px] leading-tight tracking-tight sm:text-[40px]">
              India already has plenty of weather data. What it lacks is one trustworthy
              version of the truth.
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-[#B7BAC2]">
              During disasters, decisions cannot wait for someone to manually cross-check
              five different feeds. IMD, DDMAs and first responders need a single, defensible
              answer to &ldquo;is this really happening, and how sure are we?&rdquo;
            </p>

            <ul className="mt-10 space-y-5">
              {FAULTS.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#FF9166]">
                    <f.icon size={17} />
                  </div>
                  <div>
                    <p className="font-semibold text-[15px]">{f.title}</p>
                    <p className="text-[14px] leading-relaxed text-[#B7BAC2]">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-wider text-[#B7BAC2]">
              <AlertTriangle size={14} className="text-[#FF9166]" />
              Four sources, zero coordination
            </div>
            <div className="mt-6 space-y-4">
              {SOURCES.map((s, i) => (
                <div
                  key={s.label}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#12141A] p-4"
                >
                  <span className="font-mono text-[12px] text-[#565b68] pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[14.5px] font-medium text-[#F7F4EC]">{s.label}</p>
                    <p className="mt-1 text-[13px] text-[#8b8e97]">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
