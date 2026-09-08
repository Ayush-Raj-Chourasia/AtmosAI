'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import GoogleIcon from '@/components/ui/GoogleIcon';
import WeatherFilterBar from '@/components/dashboard/WeatherFilterBar';
import DemoScenarioBar from '@/components/dashboard/DemoScenarioBar';
import LiveTelemetryWidget from '@/components/dashboard/LiveTelemetryWidget';
import LiveSurveillanceTicker from '@/components/dashboard/LiveSurveillanceTicker';
import EventIntelligenceDrawer, { WeatherEventDetail } from '@/components/dashboard/EventIntelligenceDrawer';
import CitizenReportModal from '@/components/modals/CitizenReportModal';
import { getLocalEvents } from '@/lib/mockApiStore';
import { getIncidentConfig } from '@/lib/incidents';
import { ArrowUpRight } from 'lucide-react';

// Dynamically import Leaflet Map to prevent SSR window errors
const IndiaWeatherMap = dynamic(() => import('@/components/map/IndiaWeatherMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[520px] bg-[#12141A] rounded-3xl flex flex-col items-center justify-center text-[#8b8e97] text-xs">
      <GoogleIcon name="radar" size={28} className="animate-spin mb-2 text-[#FF5A1F]" />
      <span className="font-mono">Initializing National Meteorological GIS Radar...</span>
    </div>
  ),
});

export default function DashboardPage() {
  const [allEvents, setAllEvents] = useState<WeatherEventDetail[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<WeatherEventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WeatherEventDetail | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedState, setSelectedState] = useState('All India');
  const [minConfidence, setMinConfidence] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Check server route handler first
      const res = await fetch('/api/v1/events');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setAllEvents(json.data);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Use local store
    const local = getLocalEvents();
    setAllEvents(local as WeatherEventDetail[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Apply filters
  useEffect(() => {
    let result = [...allEvents];

    if (selectedCategory !== 'ALL') {
      result = result.filter((e) => e.event_type.toUpperCase() === selectedCategory.toUpperCase());
    }

    if (selectedState !== 'All India') {
      result = result.filter((e) => e.state?.toLowerCase() === selectedState.toLowerCase());
    }

    if (selectedStatus !== 'ALL') {
      result = result.filter((e) => e.status?.toUpperCase() === selectedStatus.toUpperCase());
    }

    if (minConfidence > 0) {
      result = result.filter((e) => (e.confidence_score || 0) * 100 >= minConfidence);
    }

    setFilteredEvents(result);
    setLoading(false);
  }, [allEvents, selectedCategory, selectedState, minConfidence, selectedStatus]);

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#12141A] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#F7F4EC]/90 backdrop-blur-xl border-b border-[#12141A]/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#12141A] text-[#F7F4EC]">
              <span className="h-2 w-2 rounded-full bg-[#FF5A1F] group-hover:scale-125 transition-transform" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[18px] tracking-tight text-[#12141A]">
                  Weather Nexus
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#FF5A1F]">
                  by AtmosAI
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#1F8A70] bg-[#1F8A70]/10 px-2 py-0.5 rounded-full border border-[#1F8A70]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-ping" />
                  RADAR LIVE
                </span>
              </div>
              <p className="text-[11px] text-[#565b68] hidden sm:block font-mono">
                National Weather Big Data Analytics &amp; Multi-Source Verification Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden md:flex items-center gap-1 px-3.5 py-2 rounded-full border border-[#12141A]/20 text-xs font-semibold text-[#12141A] hover:bg-black/5 transition-colors"
          >
            Landing Overview
            <ArrowUpRight size={13} />
          </Link>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 rounded-full bg-[#FF5A1F] hover:bg-[#ff7038] text-white font-semibold text-xs transition-all shadow-md shadow-[#FF5A1F]/20 flex items-center gap-1.5 cursor-pointer"
          >
            <GoogleIcon name="campaign" size={16} />
            <span>Submit Observation</span>
          </button>

          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-full bg-[#12141A] hover:bg-[#1E2430] text-[#F7F4EC] font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
          >
            <GoogleIcon name="admin_panel_settings" size={16} className="text-[#FF9166]" />
            <span className="hidden sm:inline">Admin Console</span>
          </Link>
        </div>
      </header>

      {/* Main Command Operations Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl w-full mx-auto">
        {/* Simulator Bar */}
        <DemoScenarioBar onScenarioTriggered={loadEvents} />

        {/* Live Multi-Source Surveillance Ticker */}
        <LiveSurveillanceTicker />

        {/* Real-time Meteorological Ground Telemetry */}
        <LiveTelemetryWidget />

        {/* Filter Controls */}
        <WeatherFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedState={selectedState}
          onSelectState={setSelectedState}
          minConfidence={minConfidence}
          onConfidenceChange={setMinConfidence}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />

        {/* GIS Map & Verified Incidents Feed Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
          {/* Leaflet India GIS Map */}
          <div className="lg:col-span-8 min-h-[520px] rounded-3xl overflow-hidden border border-[#12141A]/10 shadow-lg">
            <IndiaWeatherMap
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
              selectedEventId={selectedEvent?.id}
            />
          </div>

          {/* Real-time Verified Incidents Feed */}
          <div className="lg:col-span-4 bg-[#12141A] text-[#F7F4EC] border border-white/10 rounded-3xl p-5 flex flex-col min-h-[520px] shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <GoogleIcon name="radar" size={18} className="text-[#FF5A1F]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#F7F4EC] font-mono">
                  Corroborated Incidents ({filteredEvents.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#8b8e97] font-mono">National Grid</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pt-3.5 custom-scrollbar pr-1">
              {loading ? (
                <div className="text-center py-16 text-[#8b8e97] text-xs">
                  <GoogleIcon name="sync" size={24} className="animate-spin mb-2 mx-auto text-[#FF5A1F]" />
                  Corroborating Doppler radar &amp; citizen signals...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16 text-[#8b8e97] text-xs space-y-2">
                  <GoogleIcon name="check_circle" size={32} className="mx-auto text-[#1F8A70]" />
                  <p className="font-medium text-[#F7F4EC]">No severe events matching current filters.</p>
                  <p className="text-[11px] text-[#8b8e97]">
                    Click one of the scenario buttons in the bar above to inject a real-time event simulation!
                  </p>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const cfg = getIncidentConfig(evt.event_type);
                  const isSelected = selectedEvent?.id === evt.id;
                  const conf = Math.round((evt.confidence_score || 0) * 100);

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/15 border-[#FF5A1F] shadow-lg shadow-[#FF5A1F]/10 scale-[1.01]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30 shrink-0">
                            <GoogleIcon name={cfg.icon} size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#B7BAC2]">
                              {evt.event_type}
                            </span>
                            <h4 className="font-bold text-xs text-[#F7F4EC] mt-1 leading-snug">
                              {evt.title}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-[#1FBF9B]">
                            {conf}%
                          </span>
                          <span className="block text-[10px] text-[#8b8e97] font-mono">Confidence</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#8b8e97] mt-2.5 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/10 text-[11px] text-[#8b8e97]">
                        <span className="font-medium text-[#B7BAC2]">{evt.city}, {evt.state}</span>
                        <span className="text-[#FF9166] font-semibold flex items-center gap-1 hover:underline">
                          Inspect Evidence &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Event Intelligence Drawer */}
      <EventIntelligenceDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Citizen Report Modal */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportSubmitted={loadEvents}
      />
    </div>
  );
}
