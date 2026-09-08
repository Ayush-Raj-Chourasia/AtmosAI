'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getIncidentIconName, getIncidentConfig } from '@/lib/incidents';
import { WeatherEventDetail } from '../dashboard/EventIntelligenceDrawer';
import { Radio, ShieldAlert } from 'lucide-react';

// Fix Leaflet default icon URL
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// India Geographic Center & Bounds
const INDIA_CENTER: [number, number] = [21.5937, 79.9629];
const INDIA_ZOOM = 5;
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],
  [37.5, 97.5],
];

interface IndiaWeatherMapProps {
  events: WeatherEventDetail[];
  onSelectEvent: (event: WeatherEventDetail) => void;
  selectedEventId?: string | null;
}

// Color schemes per event type
const getEventTheme = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'FLOOD':
      return { bg: 'bg-[#0284c7]', border: 'border-[#38bdf8]', ring: 'bg-[#0284c7]', text: 'text-[#38bdf8]' };
    case 'HEATWAVE':
      return { bg: 'bg-[#ea580c]', border: 'border-[#fb923c]', ring: 'bg-[#ea580c]', text: 'text-[#fb923c]' };
    case 'THUNDERSTORM':
      return { bg: 'bg-[#7c3aed]', border: 'border-[#a78bfa]', ring: 'bg-[#7c3aed]', text: 'text-[#a78bfa]' };
    case 'STRONG_WIND':
    case 'CYCLONE':
      return { bg: 'bg-[#dc2626]', border: 'border-[#f87171]', ring: 'bg-[#dc2626]', text: 'text-[#f87171]' };
    case 'RAINFALL':
      return { bg: 'bg-[#059669]', border: 'border-[#34d399]', ring: 'bg-[#059669]', text: 'text-[#34d399]' };
    case 'DUST_STORM':
    case 'FOG':
      return { bg: 'bg-[#d97706]', border: 'border-[#fbbf24]', ring: 'bg-[#d97706]', text: 'text-[#fbbf24]' };
    default:
      return { bg: 'bg-[#FF5A1F]', border: 'border-[#ff8c5a]', ring: 'bg-[#FF5A1F]', text: 'text-[#FF5A1F]' };
  }
};

// Tactical High-Visibility Radar Blip Marker Generator
const createWeatherMarkerIcon = (evt: WeatherEventDetail, isSelected: boolean) => {
  const iconName = getIncidentIconName(evt.event_type);
  const theme = getEventTheme(evt.event_type);
  const iconHtml = renderToString(<GoogleIcon name={iconName} size={18} className="text-white" />);
  const confidence = Math.round((evt.confidence_score || 0) * 100);
  const isCritical = evt.severity === 'critical' || evt.severity === 'high';

  return L.divIcon({
    className: 'custom-weather-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
        <!-- Floating Tactical HUD Label -->
        <div style="position: absolute; top: -26px; white-space: nowrap; padding: 2px 7px; border-radius: 6px; background: rgba(18, 20, 26, 0.94); color: #F7F4EC; font-family: monospace; font-size: 10px; font-weight: 700; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 5px; backdrop-filter: blur(4px);">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
          <span>${evt.city || 'India'}</span>
          <span style="color: #FF5A1F; font-size: 9px;">${confidence}%</span>
        </div>

        <!-- Radar Pulse Waves (Radiating Rings) -->
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${isCritical ? '#ef4444' : '#38bdf8'}; opacity: 0.8; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${isCritical ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.25)'};"></div>

        <!-- Central High-Impact Marker Tile -->
        <div class="${theme.bg} ${isSelected ? 'scale-125 ring-2 ring-amber-400' : ''}" style="width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); position: relative; z-index: 10; transition: transform 0.2s;">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -26],
  });
};

export default function IndiaWeatherMap({ events, onSelectEvent, selectedEventId }: IndiaWeatherMapProps) {
  const [mounted, setMounted] = useState(false);
  const [radarSweepAngle, setRadarSweepAngle] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Continuous rotating radar sweep
  useEffect(() => {
    const sweep = setInterval(() => {
      setRadarSweepAngle((prev) => (prev + 3) % 360);
    }, 50);
    return () => clearInterval(sweep);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[520px] bg-[#0b1120] flex flex-col items-center justify-center text-slate-400 text-xs">
        <GoogleIcon name="radar" size={28} className="animate-spin mb-2 text-[#FF5A1F]" />
        <span className="font-mono">Initializing National Meteorological GIS Radar...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[520px] relative rounded-3xl overflow-hidden border border-[#12141A]/10 shadow-xl bg-[#0b1120]">
      {/* Live Tactical Radar HUD Overlay */}
      <div className="absolute top-3.5 right-3.5 z-[1000] pointer-events-none flex flex-col items-end gap-1.5">
        <div className="bg-[#12141A]/90 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] text-[#F7F4EC] uppercase tracking-wider">
                DWR Doppler Radar
              </span>
              <span className="text-[9px] font-mono text-[#10b981] bg-[#10b981]/15 px-1.5 py-0.2 rounded border border-[#10b981]/30 font-semibold">
                ACTIVE SWEEP
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#8b8e97]">
              Composite Reflectivity • 32 S-Band Stations Synced
            </p>
          </div>
        </div>
      </div>

      {/* Map Scale & Sensor Telemetry Overlay */}
      <div className="absolute bottom-3.5 left-3.5 z-[1000] pointer-events-none hidden sm:flex items-center gap-2 bg-[#12141A]/90 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 text-[10px] font-mono text-[#F7F4EC] shadow-lg">
        <Radio size={12} className="text-[#FF5A1F] animate-pulse" />
        <span>Surveillance Grid: <strong>{events.length} Corroborated Hazards</strong> Across India</span>
      </div>

      <MapContainer
        center={INDIA_CENTER}
        zoom={INDIA_ZOOM}
        minZoom={4}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={0.8}
        className="w-full h-full z-10"
        style={{ height: '100%', minHeight: '520px', background: '#0b1120' }}
      >
        {/* Dark Modern Basemap for National Operations Centers (Zero Watermark / No API Key) */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        {/* Individual High-Visibility Tactical Weather Markers across India */}
        {events.map((evt) => {
          const isSelected = selectedEventId === evt.id;
          const icon = createWeatherMarkerIcon(evt, isSelected);
          const cfg = getIncidentConfig(evt.event_type);
          const isCritical = evt.severity === 'critical' || evt.severity === 'high';

          return (
            <React.Fragment key={evt.id}>
              {/* Geodesic Hazard Impact Perimeter Circle */}
              <Circle
                center={[evt.latitude, evt.longitude]}
                radius={isCritical ? 35000 : 18000}
                pathOptions={{
                  color: isCritical ? '#ef4444' : '#38bdf8',
                  fillColor: isCritical ? '#ef4444' : '#38bdf8',
                  fillOpacity: isCritical ? 0.22 : 0.12,
                  weight: isSelected ? 2.5 : 1.5,
                  dashArray: isCritical ? '6, 4' : undefined,
                }}
              />

              {/* Tactical Marker Blip */}
              <Marker
                position={[evt.latitude, evt.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectEvent(evt),
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-3 text-[#12141A] min-w-[220px]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#FF5A1F] uppercase font-mono">
                        <GoogleIcon name={cfg.icon} size={15} />
                        {evt.event_type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1F8A70]/10 text-[#1F8A70] border border-[#1F8A70]/20">
                        {Math.round((evt.confidence_score || 0) * 100)}% Conf
                      </span>
                    </div>

                    <h4 className="font-bold text-[13px] text-[#12141A] leading-snug">{evt.title}</h4>
                    
                    <p className="text-[11px] text-[#565b68] mt-1 line-clamp-2">
                      {evt.description || 'Verified multi-source weather incident cluster.'}
                    </p>

                    <div className="text-[10.5px] font-mono text-[#565b68] mt-2 pt-2 border-t border-black/5 flex items-center justify-between">
                      <span>{evt.city}, {evt.state}</span>
                      <span className="text-[#FF5A1F] font-semibold">{evt.signal_count} signals</span>
                    </div>

                    <button
                      onClick={() => onSelectEvent(evt)}
                      className="mt-2.5 w-full text-center py-1.5 rounded-xl bg-[#12141A] hover:bg-[#1E2430] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      Inspect Evidence Dossier →
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
