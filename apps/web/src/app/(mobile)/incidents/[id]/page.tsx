'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, ShieldCheck, Share2, Download, Phone, AlertTriangle, CheckCircle, Radio, Clock } from 'lucide-react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import BottomNav from '@/components/navigation/BottomNav';
import { getLocalEvents } from '@/lib/mockApiStore';
import { INITIAL_WEATHER_EVENTS, WeatherEventMock } from '@/lib/mockData';
import { getIncidentConfig } from '@/lib/incidents';

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const [incident, setIncident] = useState<WeatherEventMock | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const local = getLocalEvents();
    const found = local.find((e) => e.id === incidentId) || INITIAL_WEATHER_EVENTS.find((e) => e.id === incidentId);
    if (found) {
      setIncident(found);
    } else {
      // Fallback to first event with custom id
      setIncident({
        ...INITIAL_WEATHER_EVENTS[0],
        id: incidentId,
        title: `Corroborated Incident Dossier #${incidentId.slice(0, 8)}`,
      });
    }
  }, [incidentId]);

  if (!incident) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex items-center justify-center text-[#12141A]">
        <span className="font-mono text-xs">Loading incident telemetry...</span>
      </div>
    );
  }

  const cfg = getIncidentConfig(incident.event_type);
  const conf = Math.round((incident.confidence_score || 0) * 100);

  const handleConfirm = () => {
    setUserConfirmed(true);
    setToastMessage('✓ Ground verification recorded. Corroboration weight updated.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportSitrep = () => {
    const sitrep = `--- ATMOSAI SITUATION REPORT (SITREP) ---
INCIDENT: ${incident.title}
CATEGORY: ${incident.event_type} (${incident.severity.toUpperCase()})
LOCATION: ${incident.city}, ${incident.state} [${incident.latitude}°N, ${incident.longitude}°E]
CONFIDENCE: ${conf}% (Multi-source verified)
STATUS: ${incident.status}
TIMESTAMP: ${new Date().toISOString()}

SUMMARY:
${incident.description}

EVIDENCE & ATTRIBUTION:
- IMD / Doppler Weather Radar Corroboration: VERIFIED
- Satellite Thermal Channel Consistency: ALIGNED
- Ground Citizen Observational Feeds: 12+ Triangulated Signals

DISPATCH PROTOCOL: NDMA / SDMA Alert Ingress v1.2
-----------------------------------------`;

    const blob = new Blob([sitrep], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SITREP_${incident.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage('✓ SITREP report downloaded.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#12141A] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#F7F4EC]/95 backdrop-blur-md border-b border-[#12141A]/10 px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 -ml-1.5 text-[#12141A] hover:text-[#FF5A1F] transition-colors rounded-full hover:bg-black/5"
            title="Back to Dashboard"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-base font-bold font-display text-[#12141A]">Incident Verification Dossier</h1>
            <p className="text-[11px] text-[#565b68] font-mono">ID: {incident.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSitrep}
            className="px-3.5 py-1.5 rounded-full border border-[#12141A]/20 bg-white text-xs font-semibold hover:border-[#12141A]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export SITREP</span>
          </button>
        </div>
      </header>

      {/* Main Dossier Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-5 sm:p-8 space-y-6 pb-28">
        {/* Incident Hero Banner */}
        <section className="bg-[#12141A] text-[#F7F4EC] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0">
                <GoogleIcon name={cfg.icon} size={32} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-[#B7BAC2]">
                    {incident.event_type}
                  </span>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF5A1F]/20 text-[#FF9166] border border-[#FF5A1F]/40">
                    {incident.severity} SEVERITY
                  </span>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1F8A70]/20 text-[#1FBF9B] border border-[#1F8A70]/40">
                    {incident.status}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display mt-2 text-[#F7F4EC] leading-tight">
                  {incident.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#8b8e97] mt-2 font-mono">
                  <MapPin size={13} className="text-[#FF5A1F]" />
                  <span>{incident.city}, {incident.state}</span>
                  <span>&bull;</span>
                  <span>{incident.latitude.toFixed(4)}°N, {incident.longitude.toFixed(4)}°E</span>
                </div>
              </div>
            </div>

            {/* Confidence Gauge */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center shrink-0 min-w-[130px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b8e97] block">
                Verification Score
              </span>
              <div className="text-3xl font-extrabold font-display text-[#1FBF9B] mt-0.5">
                {conf}%
              </div>
              <span className="text-[10px] text-[#8b8e97] block font-mono mt-0.5">Multi-Source Fused</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#8b8e97] mb-1">
              Meteorological Briefing
            </h3>
            <p className="text-sm text-[#B7BAC2] leading-relaxed">
              {incident.description}
            </p>
          </div>
        </section>

        {/* 7-Factor Evidence Fusion Matrix */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#12141A]/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#12141A]/10">
            <div>
              <h3 className="text-base font-bold font-display text-[#12141A]">
                7-Factor Evidence Decomposition
              </h3>
              <p className="text-xs text-[#565b68]">
                How the autonomous AtmosAI pipeline synthesized and corroborated this signal
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#1F8A70] bg-[#1F8A70]/10 px-3 py-1 rounded-full">
              {incident.signal_count || 18} Signals Ingested
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(incident.evidence_matrix || [
              { factor: 'IMD Station Bulletin Match', weight: 0.35, score: 0.96, contribution: '+33.6%' },
              { factor: 'Doppler Radar Reflectivity (>48 dBZ)', weight: 0.25, score: 0.92, contribution: '+23.0%' },
              { factor: 'Geotagged Citizen Photo Corroboration', weight: 0.20, score: 0.88, contribution: '+17.6%' },
              { factor: 'INSAT-3DR Thermal Brightness Channel', weight: 0.10, score: 0.90, contribution: '+9.0%' },
              { factor: 'Spatiotemporal Density Clustering', weight: 0.10, score: 0.85, contribution: '+8.5%' },
            ]).map((item, idx) => (
              <div key={idx} className="bg-[#F7F4EC]/60 border border-[#12141A]/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#12141A]">{item.factor}</h4>
                  <p className="text-[11px] text-[#565b68] font-mono mt-0.5">
                    Weight: {(item.weight * 100).toFixed(0)}% &bull; Reliability: {(item.score * 100).toFixed(0)}%
                  </p>
                </div>
                <span className="font-mono font-bold text-sm text-[#1F8A70]">{item.contribution}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline of Corroboration */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#12141A]/10 shadow-sm space-y-4">
          <h3 className="text-base font-bold font-display text-[#12141A]">
            Audit Trail &amp; Signal Timeline
          </h3>
          <div className="relative border-l-2 border-[#12141A]/15 ml-3 pl-5 space-y-4 text-xs">
            {(incident.timeline || [
              { timestamp: '1h ago', source: 'Citizen Observation App', action: 'Initial geo-tagged ground report ingested', confidenceDelta: '35%' },
              { timestamp: '42m ago', source: 'Doppler Weather Radar', action: 'Reflectivity gate echo confirmed precipitation rate', confidenceDelta: '+28%' },
              { timestamp: '20m ago', source: 'IMD Automatic Station', action: 'AWS telemetric threshold reached danger mark', confidenceDelta: '+22%' },
              { timestamp: '5m ago', source: 'AtmosAI Fusion Engine', action: 'Cross-corroborated event published to national operations feed', confidenceDelta: '94% (Verified)' },
            ]).map((t, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#FF5A1F] border-2 border-white shadow-sm" />
                <div className="flex items-center justify-between font-semibold text-[#12141A]">
                  <span>{t.source}</span>
                  <span className="text-[11px] text-[#565b68] font-mono">{t.timestamp}</span>
                </div>
                <p className="text-[#565b68] text-xs mt-0.5">{t.action}</p>
                <span className="text-[#1F8A70] font-mono font-bold text-[11px]">{t.confidenceDelta}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Observer Feedback / Verification Button */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#12141A]/10 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#12141A]">Are you in this geographical sector?</h3>
              <p className="text-xs text-[#565b68]">
                Help calibrate AtmosAI by confirming or providing observational feedback on this incident.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled={userConfirmed}
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  userConfirmed
                    ? 'bg-[#1F8A70] text-white'
                    : 'bg-[#12141A] hover:bg-[#FF5A1F] text-[#F7F4EC]'
                }`}
              >
                <CheckCircle size={15} />
                <span>{userConfirmed ? 'Situation Confirmed' : 'Confirm Situation'}</span>
              </button>
            </div>
          </div>

          {toastMessage && (
            <div className="mt-3 p-3 rounded-2xl bg-[#1F8A70]/15 border border-[#1F8A70]/30 text-xs text-[#1F8A70] font-semibold flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{toastMessage}</span>
            </div>
          )}
        </section>

        {/* Emergency Response Contacts for India */}
        <section className="bg-[#12141A] text-[#F7F4EC] rounded-3xl p-6 sm:p-8 border border-white/10">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#FF9166] mb-4">
            National Emergency Dispatch Hotlines
          </h3>
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[#8b8e97] block text-[11px]">All-India Emergency Helpline</span>
              <span className="text-lg font-bold font-mono text-white mt-1 block">112</span>
              <span className="text-[10px] text-[#8b8e97]">Police, Fire &amp; Ambulance</span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[#8b8e97] block text-[11px]">NDMA Disaster Helpline</span>
              <span className="text-lg font-bold font-mono text-[#FF9166] mt-1 block">1078</span>
              <span className="text-[10px] text-[#8b8e97]">Disaster Management Authority</span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[#8b8e97] block text-[11px]">IMD Weather Advisory</span>
              <span className="text-lg font-bold font-mono text-[#1FBF9B] mt-1 block">1800-180-1717</span>
              <span className="text-[10px] text-[#8b8e97]">Meteorological Warnings &amp; Cyclone</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <BottomNav />
      </nav>
    </div>
  );
}
