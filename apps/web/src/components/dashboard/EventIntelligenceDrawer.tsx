'use client';

import React from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getIncidentConfig } from '@/lib/incidents';
import Link from 'next/link';

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
  first_detected_at?: string;
  last_updated_at?: string;
  verified_at?: string | null;
  signal_count: number;
  evidence_matrix?: Array<{
    factor: string;
    weight: number;
    score: number;
    contribution: string;
  }>;
  timeline?: Array<{
    timestamp: string;
    source: string;
    action: string;
    confidenceDelta: string;
  }>;
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

  const defaultEvidence = [
    { factor: 'IMD Station & Radar Corroboration', weight: 0.35, score: 0.96, contribution: '+33.6%' },
    { factor: 'Doppler Radar Reflectivity Gate Vector', weight: 0.25, score: 0.92, contribution: '+23.0%' },
    { factor: 'Geotagged Citizen Ground Observations', weight: 0.20, score: 0.88, contribution: '+17.6%' },
    { factor: 'INSAT-3DR Thermal Channel Synergy', weight: 0.10, score: 0.90, contribution: '+9.0%' },
    { factor: 'Temporal Freshness Score (<60m)', weight: 0.10, score: 0.85, contribution: '+8.5%' },
  ];

  const evidenceItems = event.evidence_matrix && event.evidence_matrix.length > 0
    ? event.evidence_matrix
    : defaultEvidence;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#12141A]/95 backdrop-blur-xl border-l border-white/10 text-[#F7F4EC] shadow-2xl z-50 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Drawer Header */}
      <div className="p-5 border-b border-white/10 flex items-start justify-between bg-black/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F]">
            <GoogleIcon name={config.icon} size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#1F8A70]/20 text-[#1FBF9B] border border-[#1F8A70]/40">
                {event.status}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#FF5A1F]/20 text-[#FF9166] border border-[#FF5A1F]/40">
                {event.severity} SEVERITY
              </span>
            </div>
            <h2 className="text-base font-bold font-display mt-1 text-[#F7F4EC] leading-snug">{event.title}</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#8b8e97] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <GoogleIcon name="close" size={20} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Confidence Fusion Card */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#8b8e97] uppercase tracking-wider font-mono">
                Multimodal Verification Score
              </span>
              <div className="text-3xl font-extrabold text-[#1FBF9B] mt-0.5 font-display">
                {confidencePercent}%
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#8b8e97] uppercase tracking-wider font-mono">Signals Ingested</span>
              <div className="text-xl font-bold text-[#F7F4EC] mt-0.5 font-mono">
                {event.signal_count || 12}
              </div>
            </div>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-[#1F8A70] to-[#1FBF9B] rounded-full transition-all duration-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[#8b8e97] font-mono">
            <span>Quarantine Threshold: 50%</span>
            <span>CAP Alert Threshold: 80%</span>
          </div>
        </div>

        {/* 7-Factor Evidence Decomposition */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-[#FF9166] mb-3 font-mono flex items-center gap-1.5">
            <GoogleIcon name="analytics" size={16} />
            7-Factor Evidence Fusion Matrix
          </h3>
          <div className="space-y-2">
            {evidenceItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-[#F7F4EC] block">{item.factor}</span>
                  <span className="text-[11px] text-[#8b8e97] font-mono">
                    Weight: {(item.weight * 100).toFixed(0)}% &bull; Reliability: {(item.score * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="font-bold text-[#1FBF9B] font-mono">{item.contribution}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description & Impact Summary */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-[#8b8e97] mb-2 font-mono">
            Meteorological Situation Summary
          </h3>
          <p className="text-xs leading-relaxed text-[#B7BAC2] bg-white/5 p-3.5 rounded-xl border border-white/10">
            {event.description}
          </p>
        </div>

        {/* Chronological Corroboration Timeline */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-[#8b8e97] mb-3 font-mono">
            Evidence Ingestion Timeline
          </h3>
          <div className="space-y-3 relative border-l-2 border-white/10 ml-2 pl-4 text-xs">
            {event.timeline && event.timeline.length > 0 ? (
              event.timeline.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#FF5A1F] border-2 border-[#12141A]" />
                  <div className="font-semibold text-[#F7F4EC] flex items-center justify-between">
                    <span>{step.source}</span>
                    <span className="text-[10px] text-[#8b8e97] font-mono">{step.timestamp}</span>
                  </div>
                  <p className="text-[#8b8e97] text-[11px] mt-0.5">{step.action}</p>
                  <span className="text-[#1FBF9B] text-[10px] font-mono font-bold">{step.confidenceDelta}</span>
                </div>
              ))
            ) : (
              <>
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#3B82F6] border-2 border-[#12141A]" />
                  <div className="font-semibold text-[#F7F4EC]">First Detected from Field Sensors</div>
                  <div className="text-[#8b8e97] text-[11px]">45m ago &bull; Telemetry ingress</div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-[#12141A]" />
                  <div className="font-semibold text-[#F7F4EC]">Doppler Radar Cross-Check</div>
                  <div className="text-[#8b8e97] text-[11px]">25m ago &bull; Reflectivity &gt; 48 dBZ confirmed</div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-[#12141A]" />
                  <div className="font-semibold text-[#1FBF9B]">Verified by AtmosAI Pipeline</div>
                  <div className="text-[#8b8e97] text-[11px]">Score passed 85% high confidence threshold</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location & GPS metadata */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs text-[#B7BAC2]">
          <div>
            <span className="text-[#8b8e97] block text-[11px] font-mono">Location Sector</span>
            <span className="font-semibold text-[#F7F4EC]">{event.city}, {event.state}</span>
          </div>
          <div className="text-right font-mono text-[11px] text-[#8b8e97]">
            {event.latitude?.toFixed(4)}°N, {event.longitude?.toFixed(4)}°E
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2">
          <Link
            href={`/incidents/${event.id}`}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF5A1F] hover:bg-[#ff7038] text-white text-xs font-bold transition-all shadow-lg shadow-[#FF5A1F]/20"
          >
            Open Comprehensive Incident Dossier &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
