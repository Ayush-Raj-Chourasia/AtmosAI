'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ChevronLeft, Globe, Bell, Radio, Shield, MapPin, Zap, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [radius, setRadius] = useState('25');
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(true);
  const [highConfidenceOnly, setHighConfidenceOnly] = useState(false);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F4EC] text-[#12141A]">
      {/* Header */}
      <header className="px-6 py-5 bg-[#F7F4EC]/90 backdrop-blur-md border-b border-[#12141A]/10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[#12141A] hover:text-[#FF5A1F] transition-colors p-1.5 -ml-2 rounded-full hover:bg-black/5"
            title="Back to Dashboard"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-lg font-bold font-display text-[#12141A]">{t('settings.title')}</h1>
            <p className="text-[11px] text-[#565b68] font-mono">Weather Nexus &bull; Team AtmosAI</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-[#12141A] hover:text-[#FF5A1F] transition-colors flex items-center gap-1 border border-[#12141A]/15 px-3 py-1.5 rounded-full"
        >
          Landing Page
          <ArrowUpRight size={13} />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-6">
        {/* Language Section */}
        <section className="bg-white rounded-3xl border border-[#12141A]/10 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#12141A]/10">
            <div className="w-8 h-8 rounded-xl bg-[#12141A] text-white flex items-center justify-center">
              <Globe size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#12141A]">{t('settings.language')}</h2>
              <p className="text-xs text-[#565b68]">{t('settings.selectLanguage')}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={`py-3 px-4 rounded-2xl text-sm font-medium transition-all text-left border ${
                language === 'en'
                  ? 'bg-[#12141A] text-[#F7F4EC] border-[#12141A] shadow-md'
                  : 'bg-[#F7F4EC]/60 text-[#33363f] border-[#12141A]/10 hover:border-[#12141A]/30'
              }`}
            >
              <span className="block font-bold">English</span>
              <span className="text-xs opacity-75 font-mono">National Standard</span>
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`py-3 px-4 rounded-2xl text-sm font-medium transition-all text-left border ${
                language === 'hi'
                  ? 'bg-[#12141A] text-[#F7F4EC] border-[#12141A] shadow-md'
                  : 'bg-[#F7F4EC]/60 text-[#33363f] border-[#12141A]/10 hover:border-[#12141A]/30'
              }`}
            >
              <span className="block font-bold">हिन्दी</span>
              <span className="text-xs opacity-75 font-mono">भारतीय राजभाषा</span>
            </button>
          </div>
        </section>

        {/* Operational Radius */}
        <section className="bg-white rounded-3xl border border-[#12141A]/10 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#12141A]/10">
            <div className="w-8 h-8 rounded-xl bg-[#12141A] text-[#FF5A1F] flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#12141A]">Local Surveillance Radius</h2>
              <p className="text-xs text-[#565b68]">Triangulate meteorological signals near your coordinate</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between text-xs font-mono font-medium text-[#565b68]">
              <span>5 km (Immediate Ward)</span>
              <span className="font-bold text-[#FF5A1F]">{radius === 'all' ? 'All India' : `${radius} km`}</span>
              <span>100 km (District)</span>
            </div>
            <div className="flex gap-2">
              {['5', '15', '25', '50', '100', 'all'].map((val) => (
                <button
                  key={val}
                  onClick={() => setRadius(val)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    radius === val
                      ? 'bg-[#12141A] text-[#F7F4EC] border-[#12141A]'
                      : 'bg-[#F7F4EC]/40 text-[#565b68] border-[#12141A]/10 hover:border-[#12141A]/30'
                  }`}
                >
                  {val === 'all' ? 'All India' : `${val} km`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Real-time Streaming & Telemetry */}
        <section className="bg-white rounded-3xl border border-[#12141A]/10 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#12141A]/10">
            <div className="w-8 h-8 rounded-xl bg-[#12141A] text-[#1F8A70] flex items-center justify-center">
              <Radio size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#12141A]">Live Telemetry & Pipeline Sync</h2>
              <p className="text-xs text-[#565b68]">Configure data ingress and real-time event updates</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[#12141A]">Server-Sent Events (SSE) Stream</p>
                <p className="text-xs text-[#565b68]">Stream verified weather anomalies within &lt;1 second</p>
              </div>
              <button
                onClick={() => setLiveStreamEnabled(!liveStreamEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  liveStreamEnabled ? 'bg-[#1F8A70]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    liveStreamEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[#12141A]/10">
              <div>
                <p className="text-sm font-medium text-[#12141A]">High Confidence Quarantine Filter</p>
                <p className="text-xs text-[#565b68]">Only notify when cross-corroboration score exceeds 85%</p>
              </div>
              <button
                onClick={() => setHighConfidenceOnly(!highConfidenceOnly)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  highConfidenceOnly ? 'bg-[#FF5A1F]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    highConfidenceOnly ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[#12141A]/10">
              <div>
                <p className="text-sm font-medium text-[#12141A]">Low-Bandwidth Disaster Mode</p>
                <p className="text-xs text-[#565b68]">Compress GIS radar tiles and prioritize text SITREPs</p>
              </div>
              <button
                onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  lowBandwidthMode ? 'bg-[#12141A]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    lowBandwidthMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Back navigation CTA */}
        <div className="pt-2 flex justify-between items-center text-xs text-[#565b68]">
          <Link href="/dashboard" className="font-semibold text-[#12141A] hover:underline">
            &larr; Return to Live Operations Dashboard
          </Link>
          <span className="font-mono">Weather Nexus v1.0 &bull; Team AtmosAI</span>
        </div>
      </main>
    </div>
  );
}
