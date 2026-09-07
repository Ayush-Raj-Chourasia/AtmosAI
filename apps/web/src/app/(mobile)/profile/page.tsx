'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, FileText, CheckCircle, ShieldCheck, Bell, ChevronRight, Settings, Radio, MapPin, ArrowUpRight } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import GoogleIcon from '@/components/ui/GoogleIcon';

export default function ProfilePage() {
  const [stationName, setStationName] = useState('Kamrup Metro Field Observer');
  const [stationSector, setStationSector] = useState('Guwahati Urban Cluster, Assam');

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#12141A] flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-[#F7F4EC]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#12141A]/10 px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 -ml-1.5 text-[#12141A] hover:text-[#FF5A1F] transition-colors rounded-full hover:bg-black/5"
            title="Back to Dashboard"
          >
            <GoogleIcon name="arrow_back" size={20} />
          </Link>
          <div>
            <h1 className="text-base font-bold font-display text-[#12141A]">Observer Station Telemetry</h1>
            <p className="text-[11px] text-[#565b68] font-mono">AtmosAI National Ground Network</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-[#12141A] hover:text-[#FF5A1F] transition-colors border border-[#12141A]/15 px-3 py-1.5 rounded-full"
        >
          Landing Page
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-6 pb-28">
        {/* User / Station Card */}
        <section className="bg-[#12141A] text-[#F7F4EC] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5A1F] to-[#FF9166] flex items-center justify-center text-white shadow-lg">
                <User size={30} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1F8A70]/20 text-[#1FBF9B] border border-[#1F8A70]/40">
                    CERTIFIED VOLUNTEER
                  </span>
                  <span className="text-[10px] font-mono text-[#8b8e97]">STATION-ID: IND-9042</span>
                </div>
                <h2 className="text-xl font-bold font-display mt-1 text-white">{stationName}</h2>
                <div className="flex items-center gap-1.5 text-xs text-[#B7BAC2] mt-1">
                  <MapPin size={13} className="text-[#FF5A1F]" />
                  <span>{stationSector}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center sm:text-right">
              <span className="text-[10px] font-mono text-[#8b8e97] uppercase tracking-wider block">
                Reputation Score
              </span>
              <span className="text-2xl font-bold font-mono text-[#1FBF9B]">98.4 / 100</span>
            </div>
          </div>
        </section>

        {/* Telemetric Contribution Stats */}
        <section className="bg-white rounded-3xl p-6 border border-[#12141A]/10 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#12141A] font-display">
            Signal Ingestion &amp; Impact Overview
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#F7F4EC]/60 border border-[#12141A]/10 rounded-2xl p-4">
              <FileText size={20} className="mx-auto text-[#12141A] mb-1" />
              <div className="text-2xl font-bold font-display text-[#12141A]">24</div>
              <div className="text-[11px] text-[#565b68] font-mono">Observations</div>
            </div>
            <div className="bg-[#F7F4EC]/60 border border-[#12141A]/10 rounded-2xl p-4">
              <CheckCircle size={20} className="mx-auto text-[#1F8A70] mb-1" />
              <div className="text-2xl font-bold font-display text-[#1F8A70]">21</div>
              <div className="text-[11px] text-[#565b68] font-mono">Corroborated</div>
            </div>
            <div className="bg-[#F7F4EC]/60 border border-[#12141A]/10 rounded-2xl p-4">
              <ShieldCheck size={20} className="mx-auto text-[#FF5A1F] mb-1" />
              <div className="text-2xl font-bold font-display text-[#FF5A1F]">0</div>
              <div className="text-[11px] text-[#565b68] font-mono">Quarantined</div>
            </div>
          </div>
        </section>

        {/* Navigation & Preferences List */}
        <section className="bg-white rounded-3xl border border-[#12141A]/10 overflow-hidden shadow-sm divide-y divide-[#12141A]/10">
          <Link
            href="/dashboard"
            className="flex items-center justify-between p-5 hover:bg-[#F7F4EC]/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#12141A] text-white flex items-center justify-center">
                <Radio size={18} className="text-[#FF5A1F]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#12141A]">National Operations Radar</h4>
                <p className="text-xs text-[#565b68]">View real-time verified weather incidents and GIS map</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#8b8e97]" />
          </Link>

          <Link
            href="/settings"
            className="flex items-center justify-between p-5 hover:bg-[#F7F4EC]/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#12141A] text-white flex items-center justify-center">
                <Settings size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#12141A]">System Preferences &amp; Languages</h4>
                <p className="text-xs text-[#565b68]">Configure English/Hindi, alert radius, and SSE stream</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#8b8e97]" />
          </Link>

          <Link
            href="/admin"
            className="flex items-center justify-between p-5 hover:bg-[#F7F4EC]/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#12141A] text-white flex items-center justify-center">
                <GoogleIcon name="admin_panel_settings" size={20} className="text-[#1FBF9B]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#12141A]">AtmosAI Operations Console</h4>
                <p className="text-xs text-[#565b68]">Inspect AI agent reasoning traces, ground truth &amp; health</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#8b8e97]" />
          </Link>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <BottomNav />
      </nav>
    </div>
  );
}
