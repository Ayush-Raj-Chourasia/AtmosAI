'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import GoogleIcon from '@/components/ui/GoogleIcon';
import WeatherFilterBar from '@/components/dashboard/WeatherFilterBar';
import DemoScenarioBar from '@/components/dashboard/DemoScenarioBar';
import EventIntelligenceDrawer, { WeatherEventDetail } from '@/components/dashboard/EventIntelligenceDrawer';
import CitizenReportModal from '@/components/modals/CitizenReportModal';
import { useIncidentDataStream } from '@/hooks/useIncidentDataStream';
import { API_BASE_URL } from '@/lib/config';
import { getIncidentConfig } from '@/lib/incidents';

// Dynamically import Leaflet Map to prevent SSR window errors
const IndiaWeatherMap = dynamic(() => import('@/components/map/IndiaWeatherMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-slate-900/60 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
      <GoogleIcon name="map" size={24} className="animate-spin mr-2" />
      Loading India National Meteorological GIS...
    </div>
  ),
});

export default function DashboardPage() {
  useIncidentDataStream();

  const [events, setEvents] = useState<WeatherEventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WeatherEventDetail | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedState, setSelectedState] = useState('All India');
  const [minConfidence, setMinConfidence] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Fetch events from API
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('event_type', selectedCategory);
      if (selectedState !== 'All India') params.append('state', selectedState);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (minConfidence > 0) params.append('min_confidence', (minConfidence / 100).toString());

      const res = await fetch(`${API_BASE_URL}/api/v1/events?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch weather events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedState, minConfidence, selectedStatus]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-850 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GoogleIcon name="cloud" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                N-WEIS
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                  SIH26069
                </span>
              </h1>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              National Weather Event Intelligence System &bull; Ministry of Earth Sciences / IMD
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <GoogleIcon name="campaign" size={16} />
            <span className="hidden sm:inline">Citizen Report</span>
          </button>

          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium text-xs transition-all flex items-center gap-1.5"
          >
            <GoogleIcon name="admin_panel_settings" size={16} className="text-amber-400" />
            <span className="hidden sm:inline">Admin Panel</span>
          </Link>
        </div>
      </header>

      {/* Main Operations Body */}
      <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Judge Demo Control Panel */}
        <DemoScenarioBar onScenarioTriggered={fetchEvents} />

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

        {/* GIS Map & Intelligence Feed Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[560px]">
          {/* Leaflet India GIS Map */}
          <div className="lg:col-span-2 min-h-[500px]">
            <IndiaWeatherMap
              events={events}
              onSelectEvent={setSelectedEvent}
              selectedEventId={selectedEvent?.id}
            />
          </div>

          {/* Real-time Verified Incidents Feed */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[500px] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GoogleIcon name="radar" size={18} className="text-blue-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Verified Weather Events ({events.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">All India Feed</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 custom-scrollbar">
              {loading ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <GoogleIcon name="sync" size={24} className="animate-spin mb-2 mx-auto text-slate-400" />
                  Corroborating multi-source observations...
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                  <GoogleIcon name="check_circle" size={32} className="mx-auto text-slate-600" />
                  <p>No severe events matching current filters.</p>
                  <p className="text-[11px] text-slate-400">
                    Click <strong>&quot;Guwahati Flood (94%)&quot;</strong> in the simulator bar above to inject a demo scenario!
                  </p>
                </div>
              ) : (
                events.map(evt => {
                  const cfg = getIncidentConfig(evt.event_type);
                  const isSelected = selectedEvent?.id === evt.id;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
                          : 'bg-slate-850/60 hover:bg-slate-800/80 border-slate-750'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-blue-400 border border-slate-700">
                            <GoogleIcon name={cfg.icon} size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                              {evt.event_type}
                            </span>
                            <h4 className="font-bold text-xs text-slate-200 mt-0.5">{evt.title}</h4>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400">
                            {Math.round((evt.confidence_score || 0) * 100)}%
                          </span>
                          <span className="block text-[10px] text-slate-400">Confidence</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                        {evt.description || 'Continuous multi-source meteorological observation.'}
                      </p>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span>{evt.city}, {evt.state}</span>
                        <span className="text-blue-400 font-semibold flex items-center gap-1 hover:underline">
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
        onReportSubmitted={fetchEvents}
      />
    </div>
  );
}
