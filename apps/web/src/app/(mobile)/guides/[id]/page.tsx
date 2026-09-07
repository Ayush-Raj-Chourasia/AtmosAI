'use client';

import { use } from 'react';
import { ChevronLeft, Share2, CheckCircle2, AlertCircle, Phone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { GUIDES, getIconNameByType } from '@n-weis/shared';

export default function GuideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const guideId = resolvedParams.id;

  const guideData = GUIDES.find((g) => g.id === guideId) || GUIDES[0];
  const iconName = getIconNameByType(guideData.disaster_type);

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#12141A] flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-[#F7F4EC]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#12141A]/10 px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/guides"
            className="p-1.5 -ml-1.5 text-[#12141A] hover:text-[#FF5A1F] transition-colors rounded-full hover:bg-black/5"
            title="Back to Guides"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-base font-bold font-display text-[#12141A]">Emergency Standard Protocol</h1>
            <p className="text-[11px] text-[#565b68] font-mono">Disaster SOP &bull; {guideData.disaster_type.toUpperCase()}</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-semibold text-[#12141A] hover:text-[#FF5A1F] transition-colors border border-[#12141A]/15 px-3 py-1.5 rounded-full"
        >
          Live Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-6 pb-28">
        {/* Hero Card */}
        <section className="bg-[#12141A] text-[#F7F4EC] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0">
              <GoogleIcon name={iconName} size={32} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-[#B7BAC2]">
                {guideData.disaster_type} PROTOCOL
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display mt-1 text-white leading-tight">
                {guideData.title}
              </h2>
              <p className="text-xs text-[#B7BAC2] mt-1">{guideData.description}</p>
            </div>
          </div>
        </section>

        {/* Formatted Guide Body */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#12141A]/10 shadow-sm space-y-6">
          <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-[#33363f]">
            {guideData.content.split('## ').filter(Boolean).map((section, idx) => {
              const [heading, ...lines] = section.split('\n');
              return (
                <div key={idx} className="pb-5 border-b border-[#12141A]/10 last:border-0 last:pb-0">
                  <h3 className="font-display font-bold text-base text-[#12141A] mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#1F8A70]" />
                    {heading}
                  </h3>
                  <ul className="space-y-2 text-[#565b68]">
                    {lines.filter((l) => l.trim().startsWith('-')).map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] mt-1.5 shrink-0" />
                        <span>{item.replace(/^-\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Emergency Helplines */}
        <section className="bg-white rounded-3xl p-6 border border-[#12141A]/10 shadow-sm space-y-3">
          <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-[#12141A]">
            Official Indian Emergency Help Desks
          </h3>
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="bg-[#F7F4EC]/60 p-3.5 rounded-2xl border border-[#12141A]/10">
              <span className="text-[#565b68] block text-[11px]">Emergency Response (ERSS)</span>
              <span className="text-base font-bold font-mono text-[#12141A] mt-0.5 block">112</span>
            </div>
            <div className="bg-[#F7F4EC]/60 p-3.5 rounded-2xl border border-[#12141A]/10">
              <span className="text-[#565b68] block text-[11px]">NDMA Disaster Relief</span>
              <span className="text-base font-bold font-mono text-[#FF5A1F] mt-0.5 block">1078</span>
            </div>
            <div className="bg-[#F7F4EC]/60 p-3.5 rounded-2xl border border-[#12141A]/10">
              <span className="text-[#565b68] block text-[11px]">IMD Meteorological Hotline</span>
              <span className="text-base font-bold font-mono text-[#1F8A70] mt-0.5 block">1800-180-1717</span>
            </div>
          </div>
        </section>

        <div className="pt-2">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#12141A] hover:text-[#FF5A1F] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Browse All Severe Weather Protocols</span>
          </Link>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <BottomNav />
      </nav>
    </div>
  );
}
