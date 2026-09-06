'use client';

import { useRef } from 'react';
import { Maximize2, Map } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/components/providers/LanguageProvider';

// Dynamically import the map to avoid SSR issues with Leaflet
const IncidentMap = dynamic(
    () => import('@/components/map/IncidentMap'),
    { ssr: false }
);

import Link from 'next/link';

// ...

export default function LiveMapSnippet() {
    const { t } = useLanguage();

    return (
        <section className="mt-8 px-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                    {/* <Map size={18} className="text-slate-400" /> */}
                    {t('dashboard.liveRadius.title')}
                </h3>
                <Link href="/map" className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline">
                    {t('dashboard.liveRadius.expand')}
                    <Maximize2 size={14} />
                </Link>
            </div>

            <div className="w-full h-48 rounded-2xl border border-slate-200 relative overflow-hidden bg-slate-50">
                {/* Map Component */}
                <div className="absolute inset-0 opacity-100">
                    <IncidentMap
                        interactive={true}
                        zoomLevel={10}
                        dragging={true}
                        zoomControl={false}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                        touchZoom={false}
                    />
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 pointer-events-none border border-slate-200 rounded-2xl" />

                {/* Decorative Overlay Markers (Visual only, assuming Map has real markers too) */}
                {/* Real map markers are handled by IncidentMap, these are just for the "visual style" if needed, 
                    but since we have a real map, we might rely on that. 
                    However, to match the "UI Reference" exactly, the user might want these specific static-looking indicators
                    layered on top if the map is just a background. 
                    For now, I'll let the React-Leaflet map do the work, effectively replacing the static markers 
                    with real ones. */}
            </div>
        </section>
    );
}
