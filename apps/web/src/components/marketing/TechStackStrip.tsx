const STACK = [
  { group: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Leaflet'] },
  { group: 'Backend', items: ['NestJS', 'FastAPI', 'REST APIs'] },
  { group: 'AI / ML', items: ['Python', 'PyTorch', 'scikit-learn', 'Hugging Face', 'Gemini'] },
  { group: 'Data', items: ['PostgreSQL', 'PostGIS', 'Redis'] },
  { group: 'Realtime & Ops', items: ['Server-Sent Events', 'BullMQ', 'Docker'] },
];

export default function TechStackStrip() {
  return (
    <section className="bg-[#F7F4EC] py-16 border-y border-[#12141A]/10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-[12px] font-mono uppercase tracking-wider text-[#565b68]">
          Technology stack
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {STACK.map((s) => (
            <div key={s.group}>
              <p className="text-[13px] font-semibold text-[#12141A]">{s.group}</p>
              <ul className="mt-3 space-y-1.5">
                {s.items.map((item) => (
                  <li key={item} className="font-mono text-[12.5px] text-[#565b68]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
