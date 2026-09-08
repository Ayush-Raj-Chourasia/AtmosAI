'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getIncidentIconName, getIncidentColorClass, getIncidentConfig } from '@/lib/incidents';
import { WeatherEventDetail } from '../dashboard/EventIntelligenceDrawer';

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
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
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

// Custom Marker Generator
const createWeatherMarkerIcon = (type: string, severity: string, isSelected: boolean) => {
  const iconName = getIncidentIconName(type);
  const colorClass = getIncidentColorClass(type, 'mapMarker');
  const iconHtml = renderToString(<GoogleIcon name={iconName} size={20} className="text-white" />);
  const isHighSeverity = severity === 'high' || severity === 'critical';

  return L.divIcon({
    className: 'custom-weather-icon',
    html: `
      <div class="${colorClass} w-10 h-10 rounded-2xl flex items-center justify-center border-2 ${
      isSelected ? 'border-amber-400 scale-125' : 'border-white'
    } shadow-xl relative transition-transform ${isHighSeverity ? 'animate-pulse' : ''}">
        ${iconHtml}
        ${
          isHighSeverity
            ? `<span class="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white"></span>
              </span>`
            : ''
        }
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
};

export default function IndiaWeatherMap({ events, onSelectEvent, selectedEventId }: IndiaWeatherMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <GoogleIcon name="map" size={24} className="animate-spin mr-2" />
        Initializing India National Meteorological GIS...
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
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

        {/* Marker Clusters */}
        <MarkerClusterGroup chunkedLoading>
          {events.map(evt => {
            const isSelected = selectedEventId === evt.id;
            const icon = createWeatherMarkerIcon(evt.event_type, evt.severity, isSelected);
            const cfg = getIncidentConfig(evt.event_type);

            return (
              <React.Fragment key={evt.id}>
                {/* Geodesic Buffer Zone */}
                <Circle
                  center={[evt.latitude, evt.longitude]}
                  radius={evt.severity === 'critical' ? 12000 : 6000}
                  pathOptions={{
                    color: evt.severity === 'critical' ? '#ef4444' : '#3b82f6',
                    fillColor: evt.severity === 'critical' ? '#ef4444' : '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 1.5,
                  }}
                />

                {/* Event Marker */}
                <Marker
                  position={[evt.latitude, evt.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => onSelectEvent(evt),
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-2 text-slate-900 min-w-[200px]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase mb-1">
                        <GoogleIcon name={cfg.icon} size={16} />
                        {evt.event_type}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                      <div className="text-xs text-slate-600 mt-1">
                        Confidence: <strong className="text-emerald-600">{Math.round((evt.confidence_score || 0) * 100)}%</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {evt.city}, {evt.state}
                      </div>
                      <button
                        onClick={() => onSelectEvent(evt)}
                        className="mt-2 w-full text-center py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Inspect Evidence →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
