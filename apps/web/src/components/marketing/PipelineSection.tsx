const STEPS = [
  {
    n: '01',
    title: 'Ingest',
    body: 'Pull raw signals from IMD bulletins, news RSS, social posts tagged #IMD, and citizen reports with GPS + photos.',
  },
  {
    n: '02',
    title: 'Normalize & geolocate',
    body: 'Standardize timestamps to UTC and units across sources, then pin every report to a real city, district and state.',
  },
  {
    n: '03',
    title: 'Classify & screen',
    body: 'An AI classifier sorts each report into one of 8 hazard types, while a skeptic pass quarantines hoaxes and recycled disaster media.',
  },
  {
    n: '04',
    title: 'Deduplicate & cluster',
    body: 'Exact-match, semantic similarity and space/time proximity merge near-identical reports of the same event.',
  },
  {
    n: '05',
    title: 'Fuse & score',
    body: 'Independent evidence is combined into one event with a confidence score that decays over time unless something new confirms it.',
  },
];

export default function PipelineSection() {
  return (
    <section id="pipeline" className="bg-[#F7F4EC] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="text-[12px] font-mono uppercase tracking-wider text-[#1F8A70]">
            How verification works
          </span>
          <h2 className="font-display mt-4 text-[32px] leading-tight tracking-tight text-[#12141A] sm:text-[40px]">
            Five steps between a raw post and a verified event.
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-[#33363f]">
            Every incident on the map has an audit trail behind it: what was said, where it
            came from, and why the system trusts it.
          </p>
        </div>

        <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative pl-0">
              <div className="flex items-center gap-3">
                <span className="font-display text-[22px] text-[#12141A]/25">{s.n}</span>
                {i < STEPS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-[#12141A]/10 lg:block" />
                )}
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#12141A]">{s.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#565b68]">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-3xl border border-[#12141A]/10 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-wider text-[#565b68]">
                Confidence decay, in one line
              </p>
              <p className="font-display mt-2 text-[20px] text-[#12141A] sm:text-[22px]">
                Confidence(t) = Base &times; 0.5<sup>Δt / half-life</sup>
              </p>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-[#565b68]">
              A thunderstorm alert fades in ~45 minutes without new corroboration; a flood stays
              elevated for hours. Stale alerts age out instead of lingering as false comfort or
              false alarm.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
