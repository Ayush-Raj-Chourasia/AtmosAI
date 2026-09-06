'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/components';
import { AlertCircle, ChevronRight, ChevronDown, Activity, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

type HeroIncident = {
    id: string;
    type: string;
    city: string;
    severity: 'low' | 'medium' | 'high';
    status: string;
    confidence: number;
    signal_count?: number;
    summary?: string;
    created_at?: string;
    updated_at?: string;
}

import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';
import ZoneSelector from '@/components/dashboard/ZoneSelector';
import { useLanguage } from '@/components/providers/LanguageProvider';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { getIncidentIconName, getIncidentColorClass } from '@/lib/incidents';
import { timeAgo } from '@/lib/utils';

export default function HeroStatus() {
    const { selectedZone } = useZone();
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animPhase, setAnimPhase] = useState<'idle' | 'out' | 'snap'>('idle');
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
    const router = useRouter();

    const triggerSlide = (direction: 'next' | 'prev', total: number) => {
        if (animPhase !== 'idle') return;

        const dir = direction === 'next' ? 'left' : 'right';
        setSlideDir(dir);
        setAnimPhase('out');

        setTimeout(() => {
            if (direction === 'next') {
                setCurrentIndex(prev => (prev < total - 1 ? prev + 1 : 0));
            } else {
                setCurrentIndex(prev => (prev > 0 ? prev - 1 : total - 1));
            }

            setAnimPhase('snap');

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimPhase('idle');
                });
            });
        }, 500);
    };

    // Fetch incidents
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['hero-incident', selectedZone?.id, 'v2'],
        queryFn: async () => {
            if (selectedZone) {
                // Use new Nearby Endpoint
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error("Failed to fetch nearby");
                const data = await res.json() as HeroIncident[];
                // Filter: Active (monitor/alert)
                const active = data.filter(i => ['monitor', 'alert'].includes(i.status.toLowerCase()));
                // Sort by created_at DESC (Newest First)
                return active.sort((a, b) => {
                    const timeA = new Date(a.created_at || 0).getTime();
                    const timeB = new Date(b.created_at || 0).getTime();
                    return timeB - timeA;
                });
            } else {
                // Global fallback (viewport centered at 0,0 default or Jakarta)
                const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
                if (!res.ok) throw new Error("Failed to fetch hero");
                const all = await res.json() as HeroIncident[];
                // Filter: Only active (monitor/alert)
                const active = all.filter(i => ['monitor', 'alert'].includes(i.status.toLowerCase()));

                // Sort by created_at DESC (Newest First)
                return active.sort((a, b) => {
                    const timeA = new Date(a.created_at || 0).getTime();
                    const timeB = new Date(b.created_at || 0).getTime();
                    return timeB - timeA;
                });
            }
        },
        enabled: true
    });

    const activeIncidents = incidents; // Show all active incidents
    const currentIncident = activeIncidents[currentIndex];
    const total = activeIncidents.length;

    // Reset index when zone changes
    useEffect(() => setCurrentIndex(0), [selectedZone?.id]);

    if (isLoading) return (
        <section className="px-6 pt-6 pb-2">
            <Card className="animate-pulse h-48 bg-slate-200 border-none"></Card>
        </section>
    );

    if (!currentIncident) return (
        <section className="px-6 py-4 relative space-y-3">
            <ZoneSelector />
            <Card className="bg-white border text-center p-6 shadow-sm rounded-3xl">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-2">
                        <ShieldCheck className="text-green-500 w-8 h-8" strokeWidth={2} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-900">
                            {t('dashboard.noActiveIncidents')}
                        </h3>
                        <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed">
                            {t('dashboard.immediateAreaQuiet')}
                        </p>
                    </div>

                    <div className="pt-6 flex items-center gap-2 justify-center">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                            {t('dashboard.liveUpdates')}
                        </span>
                    </div>
                </div>
            </Card>
        </section>
    );

    const nextIncident = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSlide('next', total);
    };

    const prevIncident = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSlide('prev', total);
    };

    // Get translated event type
    const getEventTypeName = (type: string) => {
        const typeKey = type.toLowerCase().replace(' ', '_') as keyof typeof t;
        return t(`common.disasterTypes.${type}` as any) || type.replace('_', ' ');
    };

    return (
        <section className="px-6 py-4 relative">
            <div className="flex justify-between mb-3 px-1 min-h-[28px]">
                <ZoneSelector />

                {total > 1 && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm z-20">
                        <button
                            onClick={prevIncident}
                            className="p-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-transform"
                        >
                            <ChevronDown className="rotate-90" size={14} />
                        </button>
                        <span className="text-[10px] font-mono text-slate-600 font-medium w-8 text-center select-none">
                            {currentIndex + 1}/{total}
                        </span>
                        <button
                            onClick={nextIncident}
                            className="p-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-transform"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Card Stack Wrapper */}
            <div className="relative">
                {/* Cascading Cards Effect */}
                {total > 1 && (
                    <>
                        <div className="absolute top-2 left-4 right-4 h-full bg-slate-100 rounded-3xl border border-slate-200 shadow-sm transform scale-x-95 -translate-y-1 z-0 opacity-80"></div>
                        <div className="absolute top-3 left-8 right-8 h-full bg-slate-50 rounded-3xl border border-slate-200 shadow-sm transform scale-x-90 -translate-y-2 -z-10 opacity-60"></div>
                    </>
                )}

                <div
                    onClick={() => router.push(`/incidents/${currentIncident.id}`)}
                    className={`relative rounded-3xl shadow-sm border overflow-hidden group z-10 
                        cursor-pointer active:scale-[0.99]
                        ${animPhase === 'snap' ? 'transition-none opacity-0' : 'transition-all duration-500 ease-in-out opacity-100'}
                        ${animPhase === 'snap'
                            ? (slideDir === 'left' ? '-translate-x-12 opacity-0' : 'translate-x-12 opacity-0')
                            : ''
                        }
                        ${animPhase === 'out'
                            ? (slideDir === 'left' ? 'translate-x-12' : '-translate-x-12')
                            : ''
                        }
                        ${animPhase === 'idle' ? 'translate-x-0' : ''}
                        ${currentIncident.status === 'alert'
                            ? 'bg-red-600 border-red-500 shadow-red-200 text-white'
                            : currentIncident.status === 'monitor'
                                ? 'bg-amber-50 border-amber-200 shadow-amber-100 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-900'
                        }
                    `}
                >
                    {/* Alert Pulse Effect */}
                    {currentIncident.status === 'alert' && (
                        <div className="absolute inset-0 bg-red-500 animate-pulse opacity-20 pointer-events-none" />
                    )}

                    <div className="relative z-10 p-6 pb-4">
                        <div className="flex items-start gap-4 mb-4">
                            <span className={`flex items-center shrink-0 justify-center w-12 h-12 rounded-2xl
                                ${currentIncident.status === 'alert'
                                    ? 'bg-white/20 text-white'
                                    : currentIncident.status === 'monitor'
                                        ? 'bg-amber-100/50 text-amber-700'
                                        : getIncidentColorClass(currentIncident.type, 'feed').replace('rounded-full', '')
                                }
                            `}>
                                <GoogleIcon name={getIncidentIconName(currentIncident.type)} size={24} />
                            </span>

                            <div className="flex flex-col min-w-0 w-full pt-0.5">
                                <div className="flex justify-between items-center">
                                    <h2 className={`text-xl font-bold tracking-tight leading-tight capitalize truncate
                                    ${currentIncident.status === 'alert' ? 'text-white' : 'text-slate-900'}
                                `}>
                                        {getEventTypeName(currentIncident.type)}
                                    </h2>
                                    <span className={`text-xs font-bold uppercase tracking-wider
                                        ${currentIncident.status === 'alert' ? 'text-white bg-white/20 px-1.5 py-0.5 rounded' :
                                            currentIncident.status === 'monitor' ? 'text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200' : 'text-emerald-600'}
                                    `}>
                                        {currentIncident.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-xs">
                                    <span className={`font-medium truncate ${currentIncident.status === 'alert' ? 'text-white/90' : 'text-slate-600'}`}>
                                        {currentIncident.city}
                                    </span>

                                    <span className={currentIncident.status === 'alert' ? 'text-white/40' : currentIncident.status === 'monitor' ? 'text-amber-300' : 'text-slate-300'}>•</span>

                                    <span className={`whitespace-nowrap ${currentIncident.status === 'alert' ? 'text-white/70' : currentIncident.status === 'monitor' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {timeAgo(currentIncident.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Summary */}
                        {currentIncident.summary && (
                            <p className={`text-sm leading-relaxed line-clamp-2 ${currentIncident.status === 'alert' ? 'text-white/90' : 'text-slate-600'}`}>
                                {currentIncident.summary}
                            </p>
                        )}
                    </div>

                    {/* Metrics Bar */}
                    <div className={`px-6 py-4 border-t flex items-center justify-between
                        ${currentIncident.status === 'alert'
                            ? 'bg-black/10 border-white/10'
                            : currentIncident.status === 'monitor'
                                ? 'bg-amber-100/30 border-amber-100'
                                : 'bg-slate-50/50 border-slate-100'
                        }
                    `}>
                        <div className={`flex gap-4 text-xs ${currentIncident.status === 'alert' ? 'text-white/80' : 'text-slate-500'}`}>
                            <div title="Confidence Score" className="flex items-center gap-1">
                                <Activity size={12} className={
                                    currentIncident.status === 'alert'
                                        ? 'text-white/70'
                                        : currentIncident.status === 'monitor'
                                            ? 'text-amber-600'
                                            : (currentIncident.confidence > 0.7 ? 'text-green-500' : 'text-slate-400')
                                } />
                                <span className={currentIncident.status === 'alert' ? 'font-semibold text-white' : 'font-medium'}>
                                    {Math.round(currentIncident.confidence * 100)}%
                                </span>
                            </div>
                            <div title="Severity" className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${currentIncident.status === 'alert'
                                    ? 'bg-white'
                                    : (currentIncident.severity === 'high' ? 'bg-red-500' : currentIncident.severity === 'medium' ? 'bg-amber-400' : 'bg-green-500')
                                    }`} />
                                <span className="capitalize">{currentIncident.severity}</span>
                            </div>
                            <div title="User Reports" className="flex items-center gap-1">
                                <span className={`font-semibold ${currentIncident.status === 'alert' ? 'text-white' : 'text-slate-900'}`}>
                                    {currentIncident.signal_count}
                                </span>
                                <span>{t('incidentDetail.reports')}</span>
                            </div>
                        </div>

                        <div className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest
                            ${currentIncident.status === 'alert' ? 'text-white' : currentIncident.status === 'monitor' ? 'text-amber-600' : 'text-blue-600'}
                        `}>
                            Details <ChevronRight size={12} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

