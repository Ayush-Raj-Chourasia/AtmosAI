'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, Settings, Filter } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import BottomNav from '@/components/navigation/BottomNav';
import { useState } from 'react';
import { useZone } from '@/components/providers/ZoneProvider';

const IncidentMap = dynamic(() => import('@/components/map/IncidentMap'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Loading Map...</div>
});

export default function MapPage() {
    const { t } = useLanguage();
    const { zones, selectedZone, setSelectedZoneId } = useZone();
    const [showFilters, setShowFilters] = useState(false);

    return (
        <>
            <div className="shrink-0 bg-white z-20 relative border-b border-slate-100">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-900">{t('navigation.map')}</h1>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 -mr-2 transition-colors ${showFilters ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Filter size={20} />
                        </button>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 space-y-4 pb-2">
                            {/* Place Filter */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">{t('map.filter.location')}</label>
                                <select
                                    value={selectedZone?.id || 'all'}
                                    onChange={(e) => {
                                        setSelectedZoneId(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">{t('map.filter.allIndonesia')}</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>{zone.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 relative bg-slate-100 overflow-hidden">
                <IncidentMap />
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </>
    );
}
