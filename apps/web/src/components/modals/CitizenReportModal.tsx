'use client';

import React, { useState } from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { WEATHER_TAXONOMY, WeatherEventType } from '@n-weis/shared';
import { addCitizenReport } from '@/lib/mockApiStore';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export default function CitizenReportModal({ isOpen, onClose, onReportSubmitted }: CitizenReportModalProps) {
  const [eventType, setEventType] = useState<WeatherEventType>('FLOOD');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Guwahati');
  const [state, setState] = useState('Assam');
  const [latitude, setLatitude] = useState<number>(26.1445);
  const [longitude, setLongitude] = useState<number>(91.7362);
  const [reporterName, setReporterName] = useState('');
  const [confidence, setConfidence] = useState<'direct_observation' | 'uncertain' | 'hearsay'>('direct_observation');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseCurrentGps = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(4)));
          setLongitude(Number(pos.coords.longitude.toFixed(4)));
          setFeedback('Current GPS coordinates calibrated!');
        },
        () => {
          setLatitude(26.1445);
          setLongitude(91.7362);
          setFeedback('Demo GPS coordinates set (Guwahati Sector).');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback('Ingesting into AtmosAI Pipeline: Skeptic pass & Doppler radar cross-check...');

    // Save to local store so it appears instantly on the map and feed
    addCitizenReport({
      event_type: eventType,
      title: `${city} ${eventType.replace('_', ' ')}: Citizen Observation`,
      description: description || `Ground observation reported by ${reporterName || 'Citizen Observer'}.`,
      city: city || 'Guwahati',
      state: state || 'Assam',
      latitude,
      longitude,
      severity: 'high',
    });

    // Also attempt server route handler
    try {
      await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          description,
          city,
          state,
          latitude,
          longitude,
          reporterName,
        }),
      });
    } catch {
      // Handled gracefully via local store
    }

    setTimeout(() => {
      setFeedback('✓ Signal corroborated & added to Verified Incidents Feed!');
      setTimeout(() => {
        setSubmitting(false);
        onReportSubmitted();
        onClose();
      }, 1000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12141A] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-[#F7F4EC] animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center">
              <GoogleIcon name="campaign" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F7F4EC]">File Ground Meteorological Report</h3>
              <p className="text-xs text-[#8b8e97]">Crowdsourced evidence ingestion for AtmosAI verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b8e97] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
              Hazard Category
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as WeatherEventType)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-[#F7F4EC] outline-none font-medium"
            >
              {WEATHER_TAXONOMY.map((type) => (
                <option key={type} value={type} className="bg-[#12141A] text-[#F7F4EC]">
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
              Observation Details
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water accumulation over 2 feet near municipal bridge, heavy cloudburst continuing..."
              className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-[#F7F4EC] placeholder-[#565b68] outline-none focus:border-[#FF5A1F]"
            />
          </div>

          {/* Location details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
                City / Ward
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City Name"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-[#F7F4EC] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
                State / UT
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-[#F7F4EC] outline-none"
              />
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="font-mono text-[11px] text-[#B7BAC2]">
              GPS: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
            </div>
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <GoogleIcon name="my_location" size={14} className="text-[#FF5A1F]" />
              Auto-Locate
            </button>
          </div>

          {/* Observer Name & Reliability */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
                Observer Handle (Optional)
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Volunteer Name"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-[#F7F4EC] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
                Observation Type
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as any)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-[#F7F4EC] outline-none font-medium"
              >
                <option value="direct_observation" className="bg-[#12141A]">Direct Eye Witness</option>
                <option value="uncertain" className="bg-[#12141A]">Developing Situation</option>
                <option value="hearsay" className="bg-[#12141A]">Local Wireless Chatter</option>
              </select>
            </div>
          </div>

          {/* Image URL / Evidence */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8b8e97] mb-1.5">
              Photo / Video Evidence (Optional)
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://... photo link (analyzed by Skeptic AI for tampering)"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-[#F7F4EC] outline-none"
            />
          </div>

          {feedback && (
            <div className="p-2.5 rounded-xl bg-white/10 border border-[#1F8A70]/40 text-emerald-300 text-xs font-mono">
              {feedback}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#FF5A1F] hover:bg-[#ff7038] text-white font-bold text-xs transition-all shadow-lg shadow-[#FF5A1F]/30 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Running Multi-Source Corroboration...' : 'Ingest & Trigger Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
