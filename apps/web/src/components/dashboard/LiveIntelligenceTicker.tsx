'use client'

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import GeminiIcon from '@/components/ui/GeminiIcon';
import GoogleIcon from '@/components/ui/GoogleIcon';

type Signal = {
    id: string;
    source: string;
    text: string;
    event_type: string;
    city_hint: string;
    created_at: string;
    status: string;
    raw_payload?: {
        ai_analysis?: {
            reason?: string;
            urgency_score?: number;
            severity?: string;
        };
    };
};

type AgentActivity = {
    agent: string;
    action: string;
    detail: string;
    timestamp: string;
    severity?: 'low' | 'medium' | 'high';
    context?: string;
};

const formatSourceName = (source: string): string => {
    const sourceMap: Record<string, string> = {
        news: 'News',
        bmkg: 'BMKG',
        social_media: 'Social Media',
        tiktok: 'TikTok',
        user_report: 'User Report',
    };
    return sourceMap[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
};

// Mock agent activity (would come from real-time WebSocket in production)
const generateAgentActivity = (signals: Signal[]): AgentActivity[] => {
    const activities: AgentActivity[] = [];

    signals.slice(0, 20).forEach((signal, i) => {
        const loc = signal.city_hint || 'Indonesia';
        const eventType = signal.event_type?.replace('_', ' ') || 'event';
        const analysis = signal.raw_payload?.ai_analysis;

        if (signal.event_type === 'noise') {
            activities.push({
                agent: 'Classifier',
                action: 'Dismissed',
                detail: `${analysis?.reason || signal.text}`,
                timestamp: signal.created_at,
                severity: 'low',
                context: signal.text
            });
        } else if (signal.status === 'processed') {
            activities.push({
                agent: 'Observer',
                action: 'Detected',
                detail: `Potential ${eventType} in ${loc}`,
                timestamp: signal.created_at,
                severity: analysis?.severity as 'low' | 'medium' | 'high' || 'medium',
                context: signal.text
            });
        } else {
            activities.push({
                agent: 'Monitor',
                action: 'Scanning',
                detail: `${formatSourceName(signal.source)} signals from ${loc}`,
                timestamp: signal.created_at,
                severity: 'low',
                context: signal.text
            });
        }
    });

    return activities;
};

const getAgentIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
        case 'observer': return 'visibility';
        case 'classifier': return 'category';
        case 'skeptic': return 'psychology';
        case 'synthesizer': return 'auto_awesome';
        case 'monitor': return 'radar';
        default: return 'smart_toy';
    }
};

const getAgentColor = (agent: string) => {
    switch (agent.toLowerCase()) {
        case 'observer': return 'text-blue-600';
        case 'classifier': return 'text-purple-600';
        case 'skeptic': return 'text-orange-500';
        case 'synthesizer': return 'text-emerald-600';
        default: return 'text-slate-600';
    }
};

const getSeverityPulse = (severity?: string) => {
    switch (severity) {
        case 'high': return 'bg-red-500';
        case 'medium': return 'bg-amber-500';
        default: return 'bg-emerald-500';
    }
};

export default function LiveIntelligenceTicker() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // Fetch signals
    const { data: signals = [] } = useQuery<Signal[]>({
        queryKey: ['ticker-signals'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/signals/recent`);
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 30000,
    });

    // Filter signals from last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const signals24h = signals.filter(s => new Date(s.created_at) >= twentyFourHoursAgo);

    // Generate agent activities from signals
    const activities = generateAgentActivity(signals24h);

    // Calculate stats for last 24 hours
    const stats = {
        totalSignals: signals24h.length,
        activeAlerts: signals24h.filter(s => s.event_type !== 'noise' && s.event_type !== 'other').length,
        dismissed: signals24h.filter(s => s.event_type === 'noise').length,
        sources: {
            news: signals24h.filter(s => s.source === 'news').length,
            social: signals24h.filter(s => s.source === 'social_media' || s.source === 'tiktok').length,
            bmkg: signals24h.filter(s => s.source === 'bmkg').length,
            reports: signals24h.filter(s => s.source === 'user_report').length,
        }
    };

    if (!isVisible) return null;

    return (
        <section className="px-6 my-3">
            <div className={`w-full bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'pb-4' : ''}`}>

                {/* Main Ticker Bar */}
                <div className="flex items-center h-10 px-4 gap-4 border-b border-slate-100">

                    {/* Left: Gemini Branding + Live Indicator + 24h Badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <GeminiIcon size={18} />
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${getSeverityPulse(activities[0]?.severity)} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${getSeverityPulse(activities[0]?.severity)}`}></span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                LIVE
                            </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full">
                            <GoogleIcon name="schedule" size={10} className="text-blue-500" />
                            <span className="text-[10px] font-semibold text-blue-600">Last 24h</span>
                        </div>
                    </div>

                    {/* Center: Spacer */}
                    <div className="flex-1" />

                    {/* Right: Quick Stats + Controls */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Stats Pills */}
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">
                                <GoogleIcon name="bolt" size={10} className="text-amber-500" />
                                <span>{stats.activeAlerts}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">
                                <GoogleIcon name="radio_button_checked" size={10} className="text-blue-500" />
                                <span>{stats.totalSignals}</span>
                            </div>
                        </div>

                        {/* Expand/Collapse */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-1.5 py-0.5 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            {isExpanded ? <GoogleIcon name="expand_less" size={14} /> : <GoogleIcon name="expand_more" size={14} />}
                        </button>
                    </div>
                </div>

                {/* Current Agent Activity Row */}
                <div className="flex items-center h-9 px-4 overflow-hidden relative">
                    {activities.length > 0 ? (
                        <div className="animate-marquee flex items-center">
                            {[0, 1].map((i) => (
                                <div key={i} className="flex items-center gap-12 mr-12">
                                    {activities.map((activity, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <GoogleIcon
                                                name={getAgentIcon(activity.agent)}
                                                size={14}
                                                className={getAgentColor(activity.agent)}
                                            />
                                            <span className={`text-xs font-semibold ${getAgentColor(activity.agent)}`}>
                                                {activity.agent}:
                                            </span>
                                            <span className="text-xs text-slate-700 font-medium">
                                                {activity.action}
                                            </span>
                                            <span className="text-xs text-slate-500">—</span>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">{activity.detail}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <GoogleIcon name="radar" size={12} className="animate-pulse" />
                            <span>Monitoring Indonesia for disaster signals...</span>
                        </div>
                    )}
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                    <div className="px-4 pt-2 animate-slide-down">
                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-3" />

                        {/* 24-Hour Analysis Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <GoogleIcon name="analytics" size={16} className="text-blue-600" />
                                <span className="text-sm font-bold text-blue-900">24-Hour Intelligence Summary</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.totalSignals}</div>
                                    <div className="text-[10px] text-blue-700 uppercase font-medium">Signals Analyzed</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-amber-600">{stats.activeAlerts}</div>
                                    <div className="text-[10px] text-amber-700 uppercase font-medium">Active Alerts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-500">{stats.dismissed}</div>
                                    <div className="text-[10px] text-slate-600 uppercase font-medium">Dismissed</div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid - Sources Breakdown */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <GoogleIcon name="source" size={12} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sources Breakdown</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex items-center gap-1 mb-1">
                                        <GoogleIcon name="newspaper" size={14} className="text-blue-500" />
                                        <span className="text-[9px] font-medium text-slate-500 uppercase">News</span>
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{stats.sources.news}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex items-center gap-1 mb-1">
                                        <GoogleIcon name="group" size={14} className="text-purple-500" />
                                        <span className="text-[9px] font-medium text-slate-500 uppercase">Social</span>
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{stats.sources.social}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex items-center gap-1 mb-1">
                                        <GoogleIcon name="earthquake" size={14} className="text-emerald-500" />
                                        <span className="text-[9px] font-medium text-slate-500 uppercase">BMKG</span>
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{stats.sources.bmkg}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex items-center gap-1 mb-1">
                                        <GoogleIcon name="campaign" size={14} className="text-amber-500" />
                                        <span className="text-[9px] font-medium text-slate-500 uppercase">Reports</span>
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{stats.sources.reports}</div>
                                </div>
                            </div>
                        </div>

                        {/* 24h Agent Activity Log */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <GeminiIcon size={12} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent Activity (Last 24 Hours)</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                                {activities.slice(0, 20).map((activity, i) => (
                                    <div key={i} className="text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <GoogleIcon
                                                    name={getAgentIcon(activity.agent)}
                                                    size={12}
                                                    className={getAgentColor(activity.agent)}
                                                />
                                                <span className={`font-semibold ${getAgentColor(activity.agent)}`}>
                                                    {activity.agent}
                                                </span>
                                                <span className="text-slate-600">{activity.action}</span>
                                            </div>
                                            <div className="text-slate-400 text-[10px]">
                                                {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="text-slate-400 flex-1">{activity.detail}</div>
                                        {activity.context && (
                                            <div className="text-slate-400 text-[10px] italic border-l-2 border-slate-200 pl-2 mt-1">
                                                "{activity.context}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
