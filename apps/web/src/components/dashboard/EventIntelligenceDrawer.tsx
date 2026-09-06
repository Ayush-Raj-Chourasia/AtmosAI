'use client';

import React from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getIncidentConfig } from '@/lib/incidents';

export interface WeatherEventDetail {
  id: string;
  event_type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  confidence_score: number;
  first_detected_at: string;
  last_updated_at: string;
  verified_at?: string | null;
  signal_count: number;
  source_breakdown?: {
    imd: number;
    weather_api: number;
    news: number;
    social_media: number;
    citizen: number;
    public_dataset: number;
  };
  ai_reasoning?: string | null;
  evidence_summary?: string[];
  evidence?: Array<{
    id: string;
    source_type: string;
    source_name: string;
    supporting_text: string;
    media_url?: string | null;
    credibility_weight: number;
  }>;
}

interface EventIntelligenceDrawerProps {
  event: WeatherEventDetail | null;
  onClose: () => void;
}

export default function EventIntelligenceDrawer({ event, onClose }: EventIntelligenceDrawerProps) {
  if (!event) return null;

  const config = getIncidentConfig(event.event_type);
  const confidencePercent = Math.round((event.confidence_score || 0) * 100);

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 text-white shadow-2xl z-50 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Drawer Header */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/20 border border-blue-500/30 text-blue-400">
            <GoogleIcon name={config.icon} size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {event.status}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {event.severity} SEVERITY
              </span>
            </div>
            <h2 className="text-lg font-bold mt-1 text-slate-100">{event.title}</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <GoogleIcon name="close" size={20} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Confidence Score Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-850/80 rounded-2xl p-4 border border-slate-750">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Verification Confidence</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-0.5">
                {confidencePercent}%
              </div>
              <p className="text-xs text-slate-400 mt-1">Multi-factor algorithmic corroboration</p>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${confidencePercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white">{confidencePercent}%</span>
            </div>
          </div>
        </div>

        {/* Multi-Source Corroboration Breakdown */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <GoogleIcon name="verified" size={16} className="text-blue-400" />
            Independent Corroboration Vectors
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex items-center gap-2">
              <GoogleIcon name="domain" size={18} className="text-amber-400" />
              <div>
                <div className="font-semibold text-slate-200">IMD Official</div>
                <div className="text-slate-400">{event.source_breakdown?.imd ? '✓ Verified Alert' : 'Awaiting met feed'}</div>
              </div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex items-center gap-2">
              <GoogleIcon name="newspaper" size={18} className="text-blue-400" />
              <div>
                <div className="font-semibold text-slate-200">News Reports</div>
                <div className="text-slate-400">{event.source_breakdown?.news || 0} article(s)</div>
              </div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex items-center gap-2">
              <GoogleIcon name="group" size={18} className="text-emerald-400" />
              <div>
                <div className="font-semibold text-slate-200">Citizens</div>
                <div className="text-slate-400">{event.source_breakdown?.citizen || 0} ground report(s)</div>
              </div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex items-center gap-2">
              <GoogleIcon name="share" size={18} className="text-purple-400" />
              <div>
                <div className="font-semibold text-slate-200">Social Media</div>
                <div className="text-slate-400">{event.source_breakdown?.social_media || 0} #IMD post(s)</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Reasoning Narrative */}
        {event.ai_reasoning && (
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3.5 text-xs text-blue-200 leading-relaxed">
            <div className="font-semibold text-blue-400 mb-1 flex items-center gap-1.5">
              <GoogleIcon name="psychology" size={16} />
              AI Intelligence Synthesis
            </div>
            {event.ai_reasoning}
          </div>
        )}

        {/* Evidence Points */}
        {event.evidence_summary && event.evidence_summary.length > 0 && (
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Corroborating Evidence</h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {event.evidence_summary.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-800/40 p-2 rounded-lg border border-slate-750">
                  <GoogleIcon name="check_circle" size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chronological Timeline */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">Event Timeline</h3>
          <div className="space-y-3 relative border-l-2 border-slate-800 ml-2 pl-4 text-xs">
            <div className="relative">
              <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-900" />
              <div className="font-semibold text-slate-200">First Detected</div>
              <div className="text-slate-400 text-[11px]">{formatTime(event.first_detected_at)}</div>
            </div>
            <div className="relative">
              <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-slate-900" />
              <div className="font-semibold text-slate-200">Multi-source Corroboration</div>
              <div className="text-slate-400 text-[11px]">{formatTime(event.last_updated_at)}</div>
            </div>
            {event.verified_at && (
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                <div className="font-semibold text-emerald-400">Verified by N-WEIS</div>
                <div className="text-slate-400 text-[11px]">{formatTime(event.verified_at)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Location & GPS metadata */}
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-750 flex items-center justify-between text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-[11px]">Location</span>
            <span className="font-semibold">{event.city}, {event.state}</span>
          </div>
          <div className="text-right font-mono text-[11px] text-slate-400">
            {event.latitude.toFixed(4)}°N, {event.longitude.toFixed(4)}°E
          </div>
        </div>
      </div>
    </div>
  );
}
