'use client';

import { useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { useZone } from '@/components/providers/ZoneProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">Loading map...</div>
});

type AddZoneDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function AddZoneDialog({ isOpen, onClose }: AddZoneDialogProps) {
    const { addZone } = useZone();
    const { t } = useLanguage();
    const [label, setLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    if (!isOpen) return null;

    const handleGetLocation = () => {
        setIsLoading(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLoading(false);
            }, (error) => {
                console.error(error);
                setIsLoading(false);
                alert('Could not get location. Using default mock.');
                // Fallback to a mock location (e.g. Monas)
                setCoords({ lat: -6.1751, lng: 106.8650 });
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label || !coords) return;

        setIsLoading(true);
        await addZone({
            label,
            lat: coords.lat,
            lng: coords.lng,
            radius_m: 50000 // Default 50km for city-wide coverage
        });
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">{t('map.filter.addZone')}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('map.addZone.label')}</label>
                        <input 
                            type="text" 
                            placeholder={t('map.addZone.placeholder')} 
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('map.addZone.location')}</label>

                        {!coords ? (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleGetLocation}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                                    <span>{t('map.addZone.useCurrentLocation')}</span>
                                </button>

                                <div className="text-center text-xs text-slate-400 font-medium">{t('map.addZone.orSearch')}</div>

                                <div className="rounded-xl border border-slate-200 p-1">
                                    <MapPicker
                                        onLocationSelect={(lat, lng) => setCoords({ lat, lng })}
                                    />
                                </div>
                            </div>
                        ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                        <span className="text-sm font-medium flex items-center gap-2">
                                            <MapPin size={14} />
                                            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                                        </span>
                                        <button type="button" onClick={() => setCoords(null)} className="text-xs underline">{t('map.addZone.change')}</button>
                                    </div>
                                    {/* Allow refining location via map even after selection */}
                                    <div className="rounded-xl border border-slate-200 p-1 bg-slate-50 grayscale opacity-90 pointer-events-none">
                                        <div className="h-[100px] w-full flex items-center justify-center text-xs text-slate-400 italic">
                                            {t('map.addZone.locationSelected')}
                                        </div>
                                    </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={!label || !coords || isLoading}
                            className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? t('map.addZone.saving') : t('map.addZone.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
