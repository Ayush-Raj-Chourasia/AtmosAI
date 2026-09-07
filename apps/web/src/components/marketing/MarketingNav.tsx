'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#pipeline', label: 'How it verifies' },
  { href: '#platform', label: 'Platform' },
  { href: '#impact', label: 'Impact' },
];

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[#F7F4EC]/90 backdrop-blur-md border-b border-[#12141A]/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#12141A] text-[#F7F4EC]">
            <span className="h-2 w-2 rounded-full bg-[#FF5A1F] group-hover:scale-125 transition-transform" />
          </span>
          <span className="font-display text-[17px] tracking-tight text-[#12141A]">
            AtmosAI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] font-medium text-[#33363f] hover:text-[#12141A] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/admin"
            className="text-[13.5px] font-medium text-[#33363f] hover:text-[#12141A] transition-colors"
          >
            Admin
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#12141A] px-4 py-2 text-[13.5px] font-semibold text-[#F7F4EC] hover:bg-[#FF5A1F] transition-colors"
          >
            Live dashboard
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 -mr-2 text-[#12141A]"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#12141A]/10 bg-[#F7F4EC] px-5 pb-6 pt-2">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 text-[15px] font-medium text-[#12141A] border-b border-[#12141A]/10"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="py-3 text-[15px] font-medium text-[#12141A] border-b border-[#12141A]/10"
            >
              Admin panel
            </Link>
          </nav>
          <Link
            href="/dashboard"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-[#12141A] px-4 py-3 text-[15px] font-semibold text-[#F7F4EC]"
          >
            Live dashboard
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </header>
  );
}
