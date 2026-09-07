'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Filter, ShieldCheck, MapPin, AlertTriangle, ArrowUpRight } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getLocalEvents } from '@/lib/mockApiStore';
import { WEATHER_TAXONOMY } from '@n-weis/shared';
import { getIncidentConfig } from '@/lib/incidents';

export default function AlertsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const local = getLocalEvents();
    setEvents(local);
  }, []);

  const filtered = events.filter((inc) => {
    if (typeFilter !== 'ALL' && inc.event_type !== typeFilter) return false;
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    return true;
  });

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
            <ChevronLeft size={22} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-display text-[#12141A]">National Weather Bulletins</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F] font-bold border border-[#FF5A1F]/30">
                {filtered.length} Active Warnings
              </span>
            </div>
            <p className="text-[11px] text-[#565b68] font-mono">Corroborated Meteorological Incident Advisories</p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-full border transition-colors cursor-pointer ${
            showFilters
              ? 'bg-[#12141A] text-white border-[#12141A]'
              : 'bg-white text-[#12141A] border-[#12141A]/15 hover:border-[#12141A]/30'
          }`}
        >
          <Filter size={18} />
        </button>
      </header>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="bg-[#12141A] text-[#F7F4EC] p-5 border-b border-white/10 space-y-3 animate-in slide-in-from-top-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] block mb-2">
              Hazard Classification
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                  typeFilter === 'ALL' ? 'bg-[#FF5A1F] text-white' : 'bg-white/10 text-[#B7BAC2]'
                }`}
              >
                All Hazards
              </button>
              {WEATHER_TAXONOMY.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    typeFilter === type ? 'bg-[#FF5A1F] text-white font-semibold' : 'bg-white/10 text-[#B7BAC2]'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] block mb-2">
              Severity Level
            </span>
            <div className="flex gap-2">
              {['ALL', 'critical', 'high', 'medium'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    severityFilter === sev ? 'bg-white text-[#12141A] font-bold' : 'bg-white/10 text-[#B7BAC2]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content list */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-5 sm:p-8 space-y-4 pb-28">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#12141A]/10 p-8">
            <ShieldCheck size={36} className="mx-auto text-[#1F8A70] mb-3" />
            <h3 className="font-bold text-sm text-[#12141A]">No active alerts matching your filter criteria.</h3>
            <p className="text-xs text-[#565b68] mt-1">
              National meteorological sectors are monitored continuously across IMD AWS and Doppler radar.
            </p>
          </div>
        ) : (
          filtered.map((inc) => {
            const cfg = getIncidentConfig(inc.event_type);
            const conf = Math.round((inc.confidence_score || 0) * 100);

            return (
              <Link key={inc.id} href={`/incidents/${inc.id}`} className="block group">
                <div className="bg-white rounded-3xl border border-[#12141A]/10 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#12141A]/30 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#12141A] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <GoogleIcon name={cfg.icon} size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#12141A]/5 text-[#12141A]">
                            {inc.event_type}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              inc.severity === 'critical'
                                ? 'bg-red-500/15 text-red-700'
                                : 'bg-amber-500/15 text-amber-800'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <h3 className="font-bold font-display text-base text-[#12141A] mt-1 group-hover:text-[#FF5A1F] transition-colors">
                          {inc.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-extrabold text-[#1F8A70]">
                        {conf}%
                      </div>
                      <span className="text-[10px] text-[#565b68] font-mono block">Certainty</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#565b68] mt-3 leading-relaxed line-clamp-2">
                    {inc.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#12141A]/10 text-xs text-[#565b68]">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#FF5A1F]" />
                      <span>{inc.city}, {inc.state}</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-[#12141A] group-hover:text-[#FF5A1F] transition-colors">
                      <span>Examine Evidence Dossier</span>
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <BottomNav />
      </nav>
    </div>
  );
}
