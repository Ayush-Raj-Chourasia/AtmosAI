'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import L from 'leaflet';
import { useZone } from '@/components/providers/ZoneProvider';
import { renderToString } from 'react-dom/server';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getIncidentIconName, getIncidentColorClass } from '@/lib/incidents';

// Fix Leaflet default icon issue
// We are replacing this with custom icons anyway, but good to keep for fallbacks if needed
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

type Incident = {
    id: string;
    lat: number;
    lng: number;
    type: string;
    severity: 'low' | 'medium' | 'high';
    status: string;
    city?: string;
};

// Indonesia center coordinates
const INDONESIA_CENTER: [number, number] = [-2.5489, 118.0149];
const INDONESIA_ZOOM = 5;

// Helper to create custom markers
const createIncidentIcon = (type: string, severity: string) => {
    // 1. Get Icon Name & Color Class from Central Config
    const iconName = getIncidentIconName(type);
    const colorClass = getIncidentColorClass(type, 'mapMarker'); // returns e.g. 'bg-blue-500'

    // 2. Render Icon to HTML using GoogleIcon
    // Note: We use renderToString to convert the React component to an HTML string
    const iconHtml = renderToString(<GoogleIcon name={iconName} size={20} className="text-white" />);

    // 3. Create DivIcon
    // We add a 'pulse' effect for high severity
    const isHighSeverity = severity === 'high';

    return L.divIcon({
        className: 'custom-div-icon', // We'll need to ensure this class doesn't override too much or is empty
        html: `
            <div class="${colorClass} w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg relative ${isHighSeverity ? 'animate-pulse' : ''}">
                ${iconHtml}
                ${isHighSeverity ? `<span class="absolute -top-1 -right-1 flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>` : ''}
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20], // Center anchor
        popupAnchor: [0, -20]
    });
};

/* 
  NOTE: For L.divIcon to work with Tailwind classes properly, 
  Leaflet's default styles shouldn't interfere too much. 
  Usually divIcon creates a simple div.
  The 'animate-pulse' might not work perfectly inside the map pane due to transforming, 
  but standard transitions usually do.
*/

const createClusterCustomIcon = (cluster: any) => {
    return L.divIcon({
        html: `<div class="flex items-center justify-center w-full h-full bg-slate-600 text-white font-bold rounded-full border-2 border-white shadow-md text-sm">
            ${cluster.getChildCount()}
        </div>`,
        className: 'custom-cluster-icon',
        iconSize: L.point(40, 40, true),
    });
};

// Indonesia bounds for fitBounds
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
    [-11, 95],   // Southwest corner (south Sumatra/Java, west of Sumatra)
    [6, 141]     // Northeast corner (north Kalimantan, Papua)
];

// Inner component to handle map updates based on context
function MapUpdater({ zoomLevel = 13 }: { zoomLevel?: number }) {
    const map = useMap();
    const { selectedZone } = useZone();

    useEffect(() => {
        if (selectedZone) {
            map.flyTo([selectedZone.lat, selectedZone.lng], zoomLevel);
        } else {
            // Fit to Indonesia bounds to show entire country
            map.fitBounds(INDONESIA_BOUNDS, { padding: [20, 20] });
        }
    }, [selectedZone, map, zoomLevel]);

    return null;
}

interface IncidentMapProps {
    interactive?: boolean;
    zoomLevel?: number;
    dragging?: boolean;
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    doubleClickZoom?: boolean;
    touchZoom?: boolean;
    showZoneBoundary?: boolean;
}

export default function IncidentMap({
    interactive = true,
    zoomLevel = 13,
    dragging,
    zoomControl,
    scrollWheelZoom,
    doubleClickZoom,
    touchZoom,
    showZoneBoundary = true
}: IncidentMapProps) {
    // Default granular props to the value of 'interactive' if not explicitly provided
    const isDragging = dragging ?? interactive;
    const isZoomControl = zoomControl ?? interactive;
    const isScrollWheelZoom = scrollWheelZoom ?? interactive;
    const isDoubleClickZoom = doubleClickZoom ?? interactive;
    const isTouchZoom = touchZoom ?? interactive;

    const [isMounted, setIsMounted] = useState(false);
    const { selectedZone } = useZone();

    // Fetch incidents
    const { data: incidents } = useQuery({
        queryKey: ['map-incidents-leaflet', selectedZone?.id || 'all'],
        queryFn: async () => {
            if (selectedZone) {
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error('Failed to fetch map incidents');
                return res.json() as Promise<Incident[]>;
            } else {
                // Fetch all Indonesia incidents (bounded by Indonesia coordinates)
                const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-11&maxLat=6&minLng=95&maxLng=141`);
                if (!res.ok) throw new Error('Failed to fetch map incidents');
                return res.json() as Promise<Incident[]>;
            }
        }
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Loading Map...</div>;

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer 
                center={INDONESIA_CENTER}
                zoom={INDONESIA_ZOOM}
                scrollWheelZoom={isScrollWheelZoom}
                dragging={isDragging}
                zoomControl={isZoomControl}
                doubleClickZoom={isDoubleClickZoom}
                touchZoom={isTouchZoom}
                boxZoom={interactive}
                keyboard={interactive} 
                className="w-full h-full"
                attributionControl={false}
                maxBounds={interactive ? [[-15, 90], [10, 145]] : undefined} // Indonesia bounds
                minZoom={4}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater zoomLevel={zoomLevel} />
                
                {/* Zone Boundary Circle */}
                {showZoneBoundary && selectedZone && (
                    <Circle
                        center={[selectedZone.lat, selectedZone.lng]}
                        radius={selectedZone.radius_m}
                        pathOptions={{
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.08,
                            weight: 2,
                            dashArray: '8, 4',
                        }}
                    />
                )}

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                    iconCreateFunction={createClusterCustomIcon}
                >
                    {incidents?.filter(inc => ['monitor', 'alert'].includes(inc.status)).map((inc) => (
                        <Marker
                            key={inc.id}
                            position={[inc.lat, inc.lng]}
                            icon={createIncidentIcon(inc.type, inc.severity)}
                        >
                            <Popup>
                                <div className="text-xs">
                                    <strong className="capitalize text-sm block mb-1">{inc.type.replace('_', ' ')}</strong>
                                    <span className="text-slate-500 mb-2 block">{inc.city}</span>

                                    <div className="flex gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${inc.status === 'alert' ? 'bg-red-100 text-red-700' :
                                                inc.status === 'resolved' ? 'bg-slate-100 text-slate-600' :
                                                    'bg-amber-100 text-amber-700'
                                            }`}>
                                            {inc.status}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-100 text-slate-600">
                                            {inc.severity}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-blue-600 underline cursor-pointer">
                                        <a href={`/incidents/${inc.id}`}>View Details</a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
