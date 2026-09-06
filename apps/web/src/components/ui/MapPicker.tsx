'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Loader2 } from 'lucide-react';

// Fix Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const iconUrl = (markerIcon as any).src || (markerIcon as unknown as string);
const shadowUrl = (markerShadow as any).src || (markerShadow as unknown as string);

const customIcon = L.icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

type MapPickerProps = {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
};

// Component to handle map clicks and drag
function LocationMarker({ position, setPosition, onLocationSelect }: any) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} icon={customIcon}></Marker>
    );
}

// Component to update view when search changes
function MapUpdater({ center }: { center: { lat: number; lng: number } | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 13);
        }
    }, [center, map]);
    return null;
}

export default function MapPicker({ initialLat = -6.2088, initialLng = 106.8456, onLocationSelect }: MapPickerProps) {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const selectLocation = (lat: number, lng: number) => {
        const newPos = { lat, lng };
        setPosition(newPos);
        onLocationSelect(lat, lng);
        setSearchResults([]); // Clear search results
    };

    return (
        <div className="space-y-3">
             {/* Search Bar */}
            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search location (e.g. Monas, Jakarta)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch(e);
                        }
                    }}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                {isSearching && <Loader2 size={16} className="absolute right-3 top-2.5 text-slate-400 animate-spin" />}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
                <ul className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto absolute z-[1000] w-full max-w-xs">
                    {searchResults.map((result: any) => (
                        <li 
                            key={result.place_id} 
                            onClick={() => selectLocation(parseFloat(result.lat), parseFloat(result.lon))}
                            className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 truncate"
                        >
                            {result.display_name}
                        </li>
                    ))}
                </ul>
            )}

            {/* Map */}
            <div className="h-[200px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer 
                    center={[initialLat, initialLng]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <LocationMarker 
                        position={position} 
                        setPosition={setPosition} 
                        onLocationSelect={onLocationSelect} 
                    />
                    <MapUpdater center={position} />
                </MapContainer>
                
                {/* Map Overlay Hint */}
                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-[1000]">
                    <span className="bg-white/90 backdrop-blur text-[10px] px-2 py-1 rounded-full shadow-sm text-slate-600">
                        Click on map to pin location
                    </span>
                </div>
            </div>
        </div>
    );
}
