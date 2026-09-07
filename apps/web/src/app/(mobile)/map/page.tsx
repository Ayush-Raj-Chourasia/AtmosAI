'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, Filter, Layers, Radar } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import GoogleIcon from '@/components/ui/GoogleIcon';
import EventIntelligenceDrawer, { WeatherEventDetail } from '@/components/dashboard/EventIntelligenceDrawer';
import { getLocalEvents } from '@/lib/mockApiStore';
import { WEATHER_TAXONOMY } from '@n-weis/shared';

const IndiaWeatherMap = dynamic(() => import('@/components/map/IndiaWeatherMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-[#12141A] flex flex-col items-center justify-center text-[#8b8e97] text-xs">
      <Radar size={28} className="animate-spin mb-2 text-[#FF5A1F]" />
      <span className="font-mono">Loading India National Meteorological GIS...</span>
    </div>
  ),
});

export default function MapPage() {
  const [events, setEvents] = useState<WeatherEventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WeatherEventDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const local = getLocalEvents();
    setEvents(local as WeatherEventDetail[]);
  }, []);

  const filteredEvents = selectedCategory === 'ALL'
    ? events
    : events.filter((e) => e.event_type === selectedCategory);

  return (
    <div className="flex flex-col h-screen w-full bg-[#F7F4EC] text-[#12141A] relative overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[#F7F4EC]/95 backdrop-blur-md z-30 border-b border-[#12141A]/10 px-5 py-3.5 flex items-center justify-between">
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
              <h1 className="text-base font-bold font-display text-[#12141A]">National Weather GIS Radar</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1F8A70]/15 text-[#1F8A70] font-bold border border-[#1F8A70]/30">
                {filteredEvents.length} Active Nodes
              </span>
            </div>
            <p className="text-[11px] text-[#565b68] font-mono">India Doppler Radar, CWC &amp; Satellite Overlay</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
              showFilters
                ? 'bg-[#12141A] text-[#F7F4EC] border-[#12141A]'
                : 'bg-white text-[#12141A] border-[#12141A]/15 hover:border-[#12141A]/30'
            }`}
          >
            <Filter size={14} />
            <span>Filter Hazards</span>
          </button>
        </div>
      </header>

      {/* Filter drawer overlay */}
      {showFilters && (
        <div className="shrink-0 bg-[#12141A] text-[#F7F4EC] px-5 py-3 border-b border-white/10 z-20 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs pb-1">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-[#FF5A1F] text-white'
                  : 'bg-white/10 text-[#B7BAC2] hover:bg-white/20'
              }`}
            >
              All Hazards ({events.length})
            </button>
            {WEATHER_TAXONOMY.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#FF5A1F] text-white font-semibold'
                    : 'bg-white/10 text-[#B7BAC2] hover:bg-white/20'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GIS Map Canvas */}
      <div className="flex-1 relative w-full h-full bg-[#0b1120]">
        <IndiaWeatherMap
          events={filteredEvents}
          onSelectEvent={setSelectedEvent}
          selectedEventId={selectedEvent?.id}
        />

        {/* Floating Map Legend */}
        <div className="absolute top-4 left-4 z-20 bg-[#12141A]/90 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl text-xs text-[#F7F4EC] shadow-xl pointer-events-auto hidden sm:block">
          <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] text-[#FF9166] uppercase mb-2">
            <Layers size={13} />
            Radar Layer Legend
          </div>
          <div className="space-y-1.5 text-[11px] text-[#B7BAC2]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>Critical Hazard Buffer (12km)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Standard Monitoring Buffer (6km)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Active Corroboration Pin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Drawer */}
      <EventIntelligenceDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Bottom Nav */}
      <nav className="shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <BottomNav />
      </nav>
    </div>
  );
}
