'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import GoogleIcon from '@/components/ui/GoogleIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import SignalBars from '@/components/ui/SignalBars';
import VerificationAvatars from '@/components/ui/VerificationAvatars';
import { timeAgo } from '@/lib/utils';

type FeedIncident = {
    id: string;
    type: string;
    city: string;
    severity: 'low' | 'medium' | 'high';
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
        users?: {
            name: string | null;
            avatar_url: string | null;
        } | null;
    }[];
}

import { API_BASE_URL } from '@/lib/config';
import { useZone } from '@/components/providers/ZoneProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getIncidentIconName, getIncidentColorClass } from '@/lib/incidents';

// ... (helper functions getIncidentIcon, getIncidentColor unchanged)





export default function IncidentFeed() {
    const { selectedZone } = useZone();
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const { data: incidents, isLoading } = useQuery({
        queryKey: ['feed-incidents', selectedZone?.id],
        queryFn: async () => {
            let data: FeedIncident[] = [];
            if (selectedZone) {
                const res = await fetch(`${API_BASE_URL}/incidents/nearby?lat=${selectedZone.lat}&lng=${selectedZone.lng}&radius=${selectedZone.radius_m}`);
                if (!res.ok) throw new Error("Failed to fetch feed");
                data = await res.json();
            } else {
                 const res = await fetch(`${API_BASE_URL}/incidents/map?minLat=-90&maxLat=90&minLng=-180&maxLng=180`);
                 if (!res.ok) throw new Error("Failed to fetch feed");
                data = await res.json();
             }

            // Filter to only show monitor, alert, and resolved status
            const filteredData = data.filter(inc => ['monitor', 'alert', 'resolved'].includes(inc.status));

            // Sort by updated_at/created_at (most recent activity first)
            // This ensures recently resolved incidents show up
            return filteredData
                .sort((a, b) => {
                    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                    return timeB - timeA;
                })
                .slice(0, 3); // Limit to 5 most recent
        }
    });

    if (isLoading) return <div className="p-6 text-center text-slate-400 text-sm">{t('common.loading')}</div>;
    if (!incidents || incidents.length === 0) return (
        <div className="space-y-4 px-6 pb-24 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{t('dashboard.recentAlerts')}</h3>
                <Database className="text-slate-400" size={18} />
            </div>
            <div className="p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">{t('incidentFeed.empty')}</div>
         </div>
    );

    return (
        <section className="mt-6 px-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{t('dashboard.recentAlerts')}</h3>
                <Link href="/alerts" className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline">
                    {t('incidentFeed.viewAll')}
                    <ChevronRight size={14} />
                </Link>
            </div>

            <div className="space-y-3">
                {incidents?.map((inc) => {
                    const iconName = getIncidentIconName(inc.type);
                    // Use a more subtle background for the icon container to match the clean look
                    const colorClasses = getIncidentColorClass(inc.type, 'feed').replace('rounded-full', '');
                    const feedbackCount = inc.incident_feedback?.filter(f => f.type === 'confirm').length || 0;
                    const isVerified = inc.confidence > 0.8 || inc.status === 'alert' || feedbackCount >= 2;

                    return (
                        <Link key={inc.id} href={`/incidents/${inc.id}`}>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-slate-300 hover:shadow-md mb-3">
                                {/* Top Section: Icon, Content, Confidence */}
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClasses}`}>
                                        <GoogleIcon name={iconName} size={24} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <h4 className="text-lg font-bold text-slate-900 capitalize leading-tight mb-1 truncate pr-2">
                                                {inc.type.replace('_', ' ')}
                                            </h4>
                                            <SignalBars confidence={inc.confidence} />
                                        </div>

                                        <div className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                                            {timeAgo(inc.updated_at || inc.created_at)} • {inc.city || 'Unknown Location'}
                                        </div>
                                        <div className="mt-1">
                                            <StatusBadge status={inc.status} />
                                        </div>
                                    </div>
                                </div>

                                {feedbackCount > 0 && (
                                    <VerificationAvatars
                                        feedback={inc.incident_feedback || []}
                                        count={feedbackCount}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
