'use client';

import React, { useState } from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { WEATHER_TAXONOMY, WeatherEventType, SeverityLevel } from '@n-weis/shared';
import { API_BASE_URL } from '@/lib/config';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export default function CitizenReportModal({ isOpen, onClose, onReportSubmitted }: CitizenReportModalProps) {
  const [eventType, setEventType] = useState<WeatherEventType>('FLOOD');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Assam');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [reporterName, setReporterName] = useState('');
  const [confidence, setConfidence] = useState<'direct_observation' | 'uncertain' | 'hearsay'>('direct_observation');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseCurrentGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLatitude(Number(pos.coords.latitude.toFixed(5)));
          setLongitude(Number(pos.coords.longitude.toFixed(5)));
          setFeedback('Current GPS coordinates captured!');
        },
        err => {
          // Fallback to Guwahati default coordinates for convenient testing
          setLatitude(26.1445);
          setLongitude(91.7362);
          setFeedback('Demo GPS coordinates set (Guwahati, Assam).');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        text: description,
        latitude: latitude ?? 26.1445,
        longitude: longitude ?? 91.7362,
        city_hint: city || 'Guwahati',
        state_hint: state || 'Assam',
        event_type: eventType,
        confidence,
        reporter_name: reporterName || 'Anonymous Citizen',
        photos: photoUrl ? [photoUrl] : [],
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/citizen/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback(data.message || 'Report submitted and ingested!');
        setTimeout(() => {
          onReportSubmitted();
          onClose();
        }, 1200);
      } else {
        setFeedback('Failed to submit report.');
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 text-white">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <GoogleIcon name="campaign" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">Submit Citizen Weather Report</h3>
              <p className="text-xs text-slate-400">Ground-level meteorological observation for IMD</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Weather Category */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Weather Hazard Category</label>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value as WeatherEventType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
            >
              {WEATHER_TAXONOMY.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Observation Details</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe road water levels, wind damage, rainfall intensity, submerged landmarks..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none resize-none placeholder:text-slate-500"
            />
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">City / District</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Guwahati"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="e.g. Assam"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
              />
            </div>
          </div>

          {/* GPS Coordinate Button */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-750 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-300">Geo-Location Coordinates</div>
              <div className="text-[11px] text-slate-400">
                {latitude !== null && longitude !== null ? `${latitude}°N, ${longitude}°E` : 'Not captured yet'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center gap-1.5"
            >
              <GoogleIcon name="my_location" size={16} />
              Capture GPS
            </button>
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Photo / Video Evidence URL</label>
            <input
              type="text"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="https://... (or leave blank for demo photo)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
            />
          </div>

          {/* Observer Confidence */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Observation Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'direct_observation', label: 'Direct Observation' },
                { id: 'uncertain', label: 'Uncertain' },
                { id: 'hearsay', label: 'Hearsay / Social' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setConfidence(opt.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-center border font-medium transition-all ${
                    confidence === opt.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400 border border-emerald-500/30">
              {feedback}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
