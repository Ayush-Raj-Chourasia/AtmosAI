'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CloudRain, Zap, Flame, Mountain, MapPin, ChevronRight, Filter, ChevronLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import GoogleIcon from '@/components/ui/GoogleIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import SignalBars from '@/components/ui/SignalBars';
import VerificationAvatars from '@/components/ui/VerificationAvatars';
import { timeAgo } from '@/lib/utils';
import { getIncidentIconName, getIncidentColorClass } from '@/lib/incidents';

type AlertIncident = {
    id: string;
    type: string;
    city: string;
    severity: string;
    confidence: number;
    lat: number;
    lng: number;
    status: string;
    created_at?: string;
    updated_at?: string;
    incident_feedback?: {
        id: string;
        incident_id: string;
        user_id: string;
        type: 'confirm' | 'reject';
        created_at: string;
    }[];
}

const DISASTER_TYPES = ['all', 'flood', 'earthquake', 'fire', 'landslide', 'volcano', 'whirlwind', 'tornado'];



export default function AlertsPage() {
    const { t } = useLanguage();
    const { zones, selectedZone, setSelectedZoneId } = useZone();
    const [typeFilter, setTypeFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    // ... (useInfiniteQuery logic remains same)

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        // ... same config
        queryKey: ['alerts', selectedZone?.id, typeFilter],
        queryFn: async ({ pageParam = 0 }) => {
            let url = `${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`;
            
            if (selectedZone) {
                url = `${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch alerts');
            const allData: AlertIncident[] = await res.json();

            // Filter by status and type
            let filtered = allData.filter(inc => ['monitor', 'alert', 'resolved'].includes(inc.status));
            if (typeFilter !== 'all') {
                filtered = filtered.filter(inc => inc.type === typeFilter);
            }

            // Sort by created_at (Initial Creation)
            filtered.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeB - timeA;
            });

            // Paginate
            const PAGE_SIZE = 10;
            const start = pageParam * PAGE_SIZE;
            const paginated = filtered.slice(start, start + PAGE_SIZE);

            return {
                items: paginated,
                nextCursor: start + PAGE_SIZE < filtered.length ? pageParam + 1 : undefined,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
    });
    
    // ... (observer logic remains same)
    
     // Infinite scroll observer
    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
        if (isFetchingNextPage) return;
        if (observerRef.current) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });

        if (node) observer.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    const allIncidents = data?.pages.flatMap(page => page.items) || [];

    const getDisasterLabel = (type: string) => {
         // @ts-ignore
         return t(`common.disasterTypes.${type}`) || type.replace('_', ' ');
    };

    return (
        <>
            {/* Header */}
            <div className="shrink-0 bg-white z-20 relative border-b border-slate-100">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-900">{t('alerts.title')}</h1>
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
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">{t('alerts.filter.location')}</label>
                                <select 
                                    value={selectedZone?.id || 'all'}
                                    onChange={(e) => {
                                        setSelectedZoneId(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">{t('alerts.filter.allLocations')}</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>{zone.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">{t('alerts.filter.type')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {DISASTER_TYPES.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                                                typeFilter === type 
                                                    ? 'bg-slate-900 text-white' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {getDisasterLabel(type)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className="px-6 py-4 space-y-3">
                    {isLoading ? (
                        <div className="text-center text-slate-400 text-sm py-12">{t('alerts.loading')}</div>
                    ) : allIncidents.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-12 border border-dashed border-slate-200 rounded-2xl">
                            {t('alerts.empty')}
                        </div>
                    ) : (
                        <>
                            {allIncidents.map((inc, index) => {
                                const iconName = getIncidentIconName(inc.type);
                                const colorClasses = getIncidentColorClass(inc.type, 'feed');
                                const isLast = index === allIncidents.length - 1;

                                return (
                                    <Link key={inc.id} href={`/incidents/${inc.id}`}>
                                        <div 
                                            ref={isLast ? lastItemRef : null}
                                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-slate-300 hover:shadow-md mb-3"
                                        >
                                            {/* Top Section: Icon, Content, Confidence */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClasses.replace('rounded-full', '')}`}>
                                                    <GoogleIcon name={iconName} size={24} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="text-lg font-bold text-slate-900 capitalize leading-tight mb-1 truncate pr-2">
                                                            {getDisasterLabel(inc.type)}
                                                        </h4>
                                                        <SignalBars confidence={inc.confidence} />
                                                    </div>

                                                    <div className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                                                        {timeAgo(inc.created_at)} • {inc.city || 'Unknown Location'}
                                                    </div>
                                                    <div className="mt-1">
                                                        <StatusBadge status={inc.status} />
                                                    </div>
                                                </div>
                                            </div>

                                            {(inc.incident_feedback?.filter(f => f.type === 'confirm').length || 0) > 0 && (
                                                <VerificationAvatars
                                                    feedback={inc.incident_feedback || []}
                                                    count={inc.incident_feedback?.filter(f => f.type === 'confirm').length || 0}
                                                />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        
                            {isFetchingNextPage && (
                                <div className="text-center text-slate-400 text-sm py-4">{t('common.loading')}</div>
                            )}

                            {!hasNextPage && allIncidents.length > 0 && (
                                <div className="py-4 flex items-center gap-4">
                                    <div className="h-px bg-slate-200 flex-1" />
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{t('alerts.endOfList')}</span>
                                    <div className="h-px bg-slate-200 flex-1" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </>
    );
}
