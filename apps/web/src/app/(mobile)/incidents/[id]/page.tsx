'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, ChevronLeft, ThumbsUp, ThumbsDown, Clock, Phone, FileDown, ExternalLink, AlertTriangle, CheckCircle, Eye, AlarmCheck, ChevronDown, ChevronUp, Bot, Video, X } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { API_BASE_URL } from '@/lib/config';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import GoogleIcon from '@/components/ui/GoogleIcon';
import GeminiIcon from '@/components/ui/GeminiIcon';
import { getIncidentIconName, getIncidentColorClass } from '@/lib/incidents';

const CollapsibleSection = ({ children, maxHeight = 200, defaultExpanded = false }: { children: React.ReactNode, maxHeight?: number, defaultExpanded?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    return (
        <div className="relative">
            <div
                className={`transition-all duration-500 ease-in-out ${isExpanded ? '' : 'relative overflow-hidden'}`}
                style={{ maxHeight: isExpanded ? 'none' : `${maxHeight}px` }}
            >
                {children}
                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                )}
            </div>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-2 py-2 text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center justify-center gap-1 transition-colors"
            >
                {isExpanded ? (
                    <>Show Less <ChevronUp size={16} /></>
                ) : (
                    <>Show More <ChevronDown size={16} /></>
                )}
            </button>
        </div>
    );
};



const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'high': return 'bg-red-100 text-red-700';
        case 'medium': return 'bg-amber-100 text-amber-700';
        default: return 'bg-green-100 text-green-700';
    }
};

// Status-based header styles matching HeroStatus
const getStatusHeaderStyles = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'alert':
            return {
                bg: 'bg-red-600',
                text: 'text-white',
                iconBg: 'bg-white/20',
                statusBadge: 'bg-white/20 text-white',
                statsBg: 'bg-white/10',
                statsText: 'text-white/70',
            };
        case 'monitor':
            return {
                bg: 'bg-amber-500',
                text: 'text-white',
                iconBg: 'bg-white/20',
                statusBadge: 'bg-white/20 text-white',
                statsBg: 'bg-white/10',
                statsText: 'text-white/70',
            };
        default:
            return {
                bg: 'bg-blue-600',
                text: 'text-white',
                iconBg: 'bg-white/20',
                statusBadge: 'bg-white/20 text-white',
                statsBg: 'bg-white/10',
                statsText: 'text-white/70',
            };
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'alert': return AlertTriangle;
        case 'resolved': return CheckCircle;
        default: return Eye;
    }
};

const getStepInfo = (step: string) => {
    const steps: Record<string, { label: string; color: string; description: string }> = {
        'observer': { label: 'Observer', color: 'bg-blue-100 text-blue-700', description: 'Analyzed incoming signals and extracted key facts' },
        'classifier': { label: 'Classifier', color: 'bg-purple-100 text-purple-700', description: 'Generated hypotheses about what might be happening' },
        'skeptic': { label: 'Skeptic', color: 'bg-orange-100 text-orange-700', description: 'Challenged the hypotheses and identified potential issues' },
        'synthesizer': { label: 'Synthesizer', color: 'bg-green-100 text-green-700', description: 'Made final judgment weighing all evidence' },
        'action': { label: 'Action', color: 'bg-red-100 text-red-700', description: 'Decided how to respond to the incident' },
    };
    return steps[step?.toLowerCase()] || { label: step, color: 'bg-slate-100 text-slate-700', description: 'Processing step' };
};

// Helper to format ISO dates in text to human readable
const formatDateInText = (text: string) => {
    // Match various ISO date patterns:
    // - 2026-01-15T18:00:00+07:00
    // - 2026-01-15T18:00:00Z
    // - 2026-01-15
    // - Also patterns like "15 Jan 2026T11:00:00Z" (malformed but common in AI output)
    return text.replace(
        /\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|[+\-]\d{2}:\d{2}))?|\d{1,2}\s+\w+\s+\d{4}T\d{2}:\d{2}:\d{2}Z?/g,
        (match) => {
            // Clean up malformed patterns like "15 Jan 2026T11:00:00Z"
            const cleanMatch = match.replace(/(\d{4})(T)/, '$1 ');
            const date = new Date(cleanMatch.includes('T') ? cleanMatch : match);
            if (isNaN(date.getTime())) return match;
            const hasTime = match.includes('T') || match.includes(':');
            return date.toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric',
                hour: hasTime ? '2-digit' : undefined,
                minute: hasTime ? '2-digit' : undefined,
            });
        }
    );
};

// Human-readable trace content renderer
const TraceContent = ({ step, output }: { step: string; output: any }) => {
    if (!output) return null;

    const stepLower = step?.toLowerCase();

    // Observer output
    if (stepLower === 'observer') {
        return (
            <div className="space-y-3">
                {output.observation_summary && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Summary</div>
                        <p className="text-sm text-slate-700">{formatDateInText(output.observation_summary)}</p>
                    </div>
                )}
                {output.key_facts?.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Key Facts</div>
                        <ul className="space-y-1">
                            {output.key_facts.map((fact: string, i: number) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5">•</span>
                                    {formatDateInText(fact)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {output.timeline?.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Timeline</div>
                        <ul className="space-y-1">
                            {output.timeline.map((event: string, i: number) => (
                                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="text-slate-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                                    {formatDateInText(event)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // Classifier output
    if (stepLower === 'classifier') {
        return (
            <div className="space-y-3">
                {output.hypotheses?.map((h: any, i: number) => (
                    <div key={i} className="bg-purple-50/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-800 capitalize">{h.event_type?.replace('_', ' ')}</span>
                            <span className="text-xs font-semibold text-purple-600">{Math.round((h.likelihood || 0) * 100)}% likely</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{h.description}</p>
                        {h.supporting_evidence?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {h.supporting_evidence.map((e: string, j: number) => (
                                    <span key={j} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{e}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Skeptic output
    if (stepLower === 'skeptic') {
        return (
            <div className="space-y-3">
                {output.concerns?.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-orange-600 uppercase mb-1 flex items-center gap-1"><GoogleIcon name="warning" size={14} /> Concerns</div>
                        <ul className="space-y-1">
                            {output.concerns.map((c: string, i: number) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="text-orange-500 mt-0.5">•</span>
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {output.contradictions?.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-red-600 uppercase mb-1 flex items-center gap-1"><GoogleIcon name="cancel" size={14} /> Contradictions</div>
                        <ul className="space-y-1">
                            {output.contradictions.map((c: string, i: number) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {output.alternative_explanations?.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1"><GoogleIcon name="lightbulb" size={14} /> Alternative Explanations</div>
                        <ul className="space-y-1">
                            {output.alternative_explanations.map((e: string, i: number) => (
                                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="text-slate-400 mt-0.5">•</span>
                                    {e}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {output.assessment && (
                    <div className="bg-orange-50 rounded-lg p-3 mt-2">
                        <div className="text-xs font-semibold text-orange-700 uppercase mb-1">Assessment</div>
                        <p className="text-sm text-slate-700">{output.assessment}</p>
                    </div>
                )}
            </div>
        );
    }

    // Synthesizer output
    if (stepLower === 'synthesizer') {
        const severityColors: Record<string, string> = {
            low: 'bg-green-100 text-green-700',
            medium: 'bg-amber-100 text-amber-700',
            high: 'bg-red-100 text-red-700'
        };
        return (
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 capitalize">
                        {output.final_classification?.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[output.severity] || 'bg-slate-100 text-slate-700'}`}>
                        {output.severity?.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {Math.round((output.confidence_score || 0) * 100)}% confident
                    </span>
                </div>
                {output.title && (
                    <div className="text-sm font-medium text-slate-800">{output.title}</div>
                )}
                {output.description && (
                    <p className="text-sm text-slate-700">{output.description}</p>
                )}
                {output.reasoning_trace && (
                    <div className="bg-green-50 rounded-lg p-3 mt-2">
                        <div className="text-xs font-semibold text-green-700 uppercase mb-1">Reasoning</div>
                        <p className="text-sm text-slate-700">{output.reasoning_trace}</p>
                    </div>
                )}
            </div>
        );
    }

    // Action output
    if (stepLower === 'action' || stepLower === 'actionstrategy') {
        const actionIcons: Record<string, { bg: string; text: string; icon: string }> = {
            'CREATE_INCIDENT': { bg: 'bg-green-100', text: 'text-green-700', icon: 'check_circle' },
            'MERGE_INCIDENT': { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'link' },
            'WAIT_FOR_MORE_DATA': { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'hourglass_empty' },
            'DISMISS': { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'block' },
        };
        const actionStyle = actionIcons[output.action] || actionIcons['DISMISS'];

        return (
            <div className="space-y-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${actionStyle.bg}`}>
                    <GoogleIcon name={actionStyle.icon} size={16} />
                    <span className={`text-sm font-semibold ${actionStyle.text}`}>
                        {output.action?.replace(/_/g, ' ')}
                    </span>
                </div>
                {output.reason && (
                    <p className="text-sm text-slate-700">{output.reason}</p>
                )}
            </div>
        );
    }

    // Fallback to formatted JSON for unknown steps
    return (
        <pre className="text-xs bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-700 max-h-40 overflow-y-auto">
            {JSON.stringify(output, null, 2)}
        </pre>
    );
};

// Humanized time formatter
const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const TraceStep = ({ trace, index }: { trace: any; index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const stepInfo = getStepInfo(trace.step);

    return (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left space-x-3"
            >
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center flex-none">
                        <div>{index + 1}</div>
                    </div>
                    <div>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stepInfo.color}`}>
                            {stepInfo.label}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{stepInfo.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-none">
                    <Clock size={12} />
                    {formatTimeAgo(trace.created_at)}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-100">
                    <div className="mt-3">
                        <TraceContent step={trace.step} output={trace.output_result} />
                    </div>
                    {trace.model_used && (
                        <div className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
                            Model: {trace.model_used}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Video Modal Component
const VideoModal = ({ videoUrl, onClose }: { videoUrl: string; onClose: () => void }) => {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </button>

            {/* Video Container */}
            <div
                className="w-full max-w-md aspect-[9/16] relative"
                onClick={(e) => e.stopPropagation()}
            >
                <video
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                />
            </div>
        </div>
    );
};

export default function IncidentDetailPage() {
    const params = useParams();
    const incidentId = params.id as string;
    const queryClient = useQueryClient();
    const { t } = useLanguage();
    const { user } = useAuth();

    // Video modal state
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

    // Fetch incident details
    const { data: incident, isLoading } = useQuery({
        queryKey: ['incident', incidentId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`);
            if (!res.ok) throw new Error('Failed to fetch incident');
            return res.json();
        },
    });

    // Fetch guides for this disaster type
    const { data: guides = [] } = useQuery({
        queryKey: ['guides', incident?.event_type],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/guides?type=${incident?.event_type}`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!incident?.event_type,
    });

    // Fetch emergency contacts
    const { data: contacts = [] } = useQuery({
        queryKey: ['emergency-contacts'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/emergency-contacts`);
            if (!res.ok) return [];
            return res.json();
        },
    });

    // Fetch agent traces
    const { data: traces = [] } = useQuery({
        queryKey: ['traces', incidentId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/traces`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!incidentId,
    });

    const groupedTraces = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        traces.forEach((t: any) => {
            const sid = t.session_id || 'unknown';
            if (!groups[sid]) groups[sid] = [];
            groups[sid].push(t);
        });
        return Object.values(groups).sort((a, b) => {
            const timeA = new Date(a[0].created_at).getTime();
            const timeB = new Date(b[0].created_at).getTime();
            return timeB - timeA;
        });
    }, [traces]);

    // Feedback mutation
    const feedbackMutation = useMutation({
        mutationFn: async (type: 'confirm' | 'reject') => {
            if (!user?.id) throw new Error('Not authenticated');
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, type }),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
        },
    });

    if (isLoading) {
        return (
            <>
                {/* Skeleton Shimmer Styles */}
                <style jsx>{`
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                    .shimmer {
                        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                    }
                    .shimmer-dark {
                        background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                    }
                `}</style>

                <div className="flex-1 overflow-y-auto">
                    {/* Header Skeleton */}
                    <div className="bg-blue-500 text-white">
                        <div className="px-6 py-4">
                            {/* Back button and status */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-8 h-8 rounded-lg shimmer-dark" />
                                <div className="w-16 h-6 rounded-full shimmer-dark" />
                            </div>

                            {/* Icon and title */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl shimmer-dark" />
                                <div className="space-y-2">
                                    <div className="w-32 h-7 rounded-lg shimmer-dark" />
                                    <div className="w-24 h-4 rounded shimmer-dark" />
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white/10 rounded-xl p-3">
                                        <div className="w-12 h-7 mx-auto rounded shimmer-dark mb-1" />
                                        <div className="w-16 h-3 mx-auto rounded shimmer-dark" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="bg-slate-50 pb-24">
                        {/* Summary Section */}
                        <div className="px-6 py-4">
                            <div className="w-24 h-4 rounded shimmer mb-3" />
                            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                                <div className="space-y-2">
                                    <div className="w-full h-4 rounded shimmer" />
                                    <div className="w-3/4 h-4 rounded shimmer" />
                                    <div className="w-1/2 h-4 rounded shimmer" />
                                </div>
                            </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="px-6 py-4">
                            <div className="w-20 h-4 rounded shimmer mb-3" />
                            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3 mb-4 last:mb-0">
                                        <div className="w-8 h-8 rounded-full shimmer flex-none" />
                                        <div className="space-y-1.5 flex-1 pt-1">
                                            <div className="w-32 h-4 rounded shimmer" />
                                            <div className="w-16 h-3 rounded shimmer" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="px-6 py-4">
                            <div className="w-28 h-4 rounded shimmer mb-3" />
                            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                                <div className="w-full h-4 rounded shimmer mb-4" />
                                <div className="flex gap-3">
                                    <div className="flex-1 h-12 rounded-xl shimmer" />
                                    <div className="flex-1 h-12 rounded-xl shimmer" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                    <BottomNav />
                </nav>
            </>
        );
    }

    if (!incident) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-slate-400 mb-4">{t('incidentDetail.notFound')}</div>
                    <Link href="/" className="text-blue-600 font-medium">{t('common.back')}</Link>
                </div>
            </div>
        );
    }

    const iconName = getIncidentIconName(incident.event_type);
    const headerStyles = getStatusHeaderStyles(incident.status);

    // Use real lifecycle data from API
    // If empty (legacy incidents), fallback to created_at
    const lifecycle = incident.lifecycle?.length > 0 ? incident.lifecycle.map((l: any) => ({
        status: l.to_status,
        time: l.created_at,
        label: l.reason || `Status changed to ${l.to_status}`
    })) : [
        { status: 'detected', time: incident.created_at, label: t('incidentDetail.firstDetected') },
        { status: incident.status, time: incident.updated_at, label: `${t('incidentDetail.currentStatus')}: ${incident.status}` }
    ];

    // Mock signals data (would come from API)  
    const signals = incident.signals || [];

    return (
        <>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className={`${headerStyles.bg} ${headerStyles.text}`}>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/" className="p-2 -ml-2 text-white/80 hover:text-white">
                            <ChevronLeft size={20} />
                        </Link>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${headerStyles.statusBadge}`}>
                            {incident.status}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl ${headerStyles.iconBg} flex items-center justify-center`}>
                            <GoogleIcon name={iconName} size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold capitalize">{t(`common.disasterTypes.${incident.event_type}`) || incident.event_type?.replace('_', ' ')}</h1>
                            <div className="flex items-center gap-2 text-white/80 mt-1">
                                <MapPin size={14} />
                                <span className="text-sm">{incident.city || t('incidentFeed.unknownLocation')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className={`${headerStyles.statsBg} rounded-xl p-3 text-center`}>
                            <div className="text-2xl font-bold">{Math.round((incident.confidence_score || 0) * 100)}%</div>
                                <div className={`text-xs ${headerStyles.statsText}`}>{t('incidentDetail.confidence')}</div>
                        </div>
                            <div className={`${headerStyles.statsBg} rounded-xl p-3 text-center`}>
                            <div className={`text-sm font-semibold px-2 py-1 rounded-full inline-block ${getSeverityColor(incident.severity)}`}>
                                {(incident?.severity || 'Medium').toUpperCase()}
                            </div>
                                <div className={`text-xs ${headerStyles.statsText} mt-1`}>{t('incidentDetail.severity')}</div>
                        </div>
                            <div className={`${headerStyles.statsBg} rounded-xl p-3 text-center`}>
                            <div className="text-2xl font-bold">{signals.length}</div>
                                <div className={`text-xs ${headerStyles.statsText}`}>{t('incidentDetail.reports')}</div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-slate-50 pb-24">

                {/* Summary Section */}
                {incident.summary && (
                    <div className="px-6 py-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><GoogleIcon name="auto_awesome_motion" size={16} className="text-blue-600" />{t('incidentDetail.summary')}</h3>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {incident.summary}
                            </p>
                        </div>
                    </div>
                )}
                {/* Lifecycle Timeline */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><GoogleIcon name="timeline" size={16} className="text-slate-600" />{t('incidentDetail.timeline')}</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="relative">
                            {lifecycle.map((event: any, i: number) => {
                                const StatusIcon = getStatusIcon(event.status);
                                return (
                                    <div key={i} className="flex gap-3 mb-4 last:mb-0">
                                        <div className="relative">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === lifecycle.length - 1 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                <StatusIcon size={14} />
                                            </div>
                                            {i < lifecycle.length - 1 && (
                                                <div className="absolute top-8 left-1/2 w-0.5 h-6 bg-slate-200 -translate-x-1/2" />
                                            )}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <div className="text-sm font-medium text-slate-900">{event.label}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} />
                                                {formatTimeAgo(event.time)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Agent Traces Section */}
                {traces.length > 0 && (
                    <div className="px-6 py-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <GeminiIcon size={16} />
                            Gemini Agents Analysis
                        </h3>

                        <div className="space-y-4">
                            {groupedTraces.slice(0, 1).map((sessionTraces, sessionIndex) => {
                                const sessionTime = sessionTraces[0].created_at;

                                return (
                                    <div key={sessionIndex} className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 flex items-center justify-between bg-blue-50/50">
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                                                    Latest Analysis
                                                </div>
                                                <span className="text-slate-300">•</span>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatTimeAgo(sessionTime)}
                                                </div>
                                            </div>
                                        </div>

                                        <CollapsibleSection maxHeight={100}>
                                            <div className="p-4 space-y-4">
                                                {sessionTraces.map((trace: any, i: number) => (
                                                    <TraceStep key={trace.id || i} trace={trace} index={i} />
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Feedback Section */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><GoogleIcon name="rate_review" size={16} className="text-green-600" />{t('incidentDetail.verification.title')}</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 mb-4">{t('incidentDetail.verification.subtitle')}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => feedbackMutation.mutate('confirm')}
                                disabled={feedbackMutation.isPending}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm ${incident.incident_feedback?.some((f: any) => f.user_id === user?.id && f.type === 'confirm')
                                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                                    }`}
                            >
                                <ThumbsUp size={18} />
                                {incident.incident_feedback?.some((f: any) => f.user_id === user?.id && f.type === 'confirm') ? t('incidentDetail.verification.confirmed') : t('incidentDetail.verification.confirm')}
                            </button>
                            <button
                                onClick={() => feedbackMutation.mutate('reject')}
                                disabled={feedbackMutation.isPending}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm ${incident.incident_feedback?.some((f: any) => f.user_id === user?.id && f.type === 'reject')
                                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                    }`}
                            >
                                <ThumbsDown size={18} />
                                {incident.incident_feedback?.some((f: any) => f.user_id === user?.id && f.type === 'reject') ? t('incidentDetail.verification.reportedFalse') : t('incidentDetail.verification.falseAlarm')}
                            </button>
                        </div>

                        {/* Feedback Statistics - Only visible after voting */}
                        {incident.incident_feedback?.some((f: any) => f.user_id === user?.id) && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                                    <span>{t('incidentDetail.verification.communityStats')}</span>
                                    <span>{incident.incident_feedback.length} {t('incidentDetail.reports')}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-green-500"
                                        style={{ width: `${(incident.incident_feedback.filter((f: any) => f.type === 'confirm').length / incident.incident_feedback.length) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-red-500"
                                        style={{ width: `${(incident.incident_feedback.filter((f: any) => f.type === 'reject').length / incident.incident_feedback.length) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium uppercase">
                                    <span className="text-green-600">{incident.incident_feedback.filter((f: any) => f.type === 'confirm').length} {t('incidentDetail.verification.confirmed')}</span>
                                    <span className="text-red-600">{incident.incident_feedback.filter((f: any) => f.type === 'reject').length} {t('profile.hoax')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sources Section - Segregated */}
                {(signals.length > 0) && (
                    <div className="px-6 py-4 space-y-6">
                        {/* Reports Count */}
                        {signals.some((s: any) => s.source === 'user_report') && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                        <AlarmCheck size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-blue-900">{t('incidentDetail.sources.userReports')}</div>
                                        <div className="text-sm text-blue-700">
                                            {signals.filter((s: any) => s.source === 'user_report').length} {t('incidentDetail.sources.verifiedReports')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {signals.filter((s: any) => s.source === 'user_report').length}
                                </div>
                            </div>
                        )}

                        {/* Recent News */}
                        {signals.some((s: any) => s.source === 'news') && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    {/* <Newspaper size={16} /> */}
                                    {t('incidentDetail.sources.news')}
                                </h3>
                                <CollapsibleSection>
                                    <div className="space-y-3">
                                        {signals.filter((s: any) => s.source === 'news').map((signal: any) => (
                                            <a
                                                key={signal.id}
                                                href={signal.media_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block bg-white rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h4 className="font-medium text-slate-900 line-clamp-2 text-sm mb-1">
                                                            {signal.text}
                                                        </h4>
                                                        <div className="text-xs text-slate-500">
                                                            {new Date(signal.created_at).toLocaleDateString()} • {t('incidentDetail.sources.readMore')}
                                                        </div>
                                                    </div>
                                                    {signal.media_type === 'image' && (
                                                        <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={signal.media_url || '/placeholder.png'} alt="News thumbnail" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            </div>
                        )}

                        {/* Social Media - TikTok Previews */}
                        {signals.some((s: any) => s.source === 'social_media' && s.media_type === 'video') && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    {/* <Video size={16} /> */}
                                    {t('incidentDetail.sources.liveUpdates')}
                                </h3>
                                <CollapsibleSection>
                                    <div className="grid grid-cols-2 gap-3">
                                        {signals.filter((s: any) => s.source === 'social_media' && s.media_type === 'video').map((signal: any) => (
                                            <button
                                                key={signal.id}
                                                className="relative aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden border border-slate-200 group text-left"
                                                onClick={() => setActiveVideoUrl(signal.media_url)}
                                            >
                                                {/* Thumbnail */}
                                                {signal.thumbnail_url ? (
                                                    <img
                                                        src={signal.thumbnail_url}
                                                        alt={signal.text}
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-black/40">
                                                            <Video size={24} />
                                                    </div>
                                                )}

                                                {/* Play Icon/Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                                                        <Video size={20} fill="currentColor" className="opacity-90 ml-0.5" />
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                                    <div className="text-xs text-white line-clamp-2 font-medium drop-shadow-md">
                                                        {signal.text}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            </div>
                        )}
                    </div>
                )}

                {/* User Comments / Feedback List */}
                {/* {incident.incident_feedback && incident.incident_feedback.length > 0 && (
                     <div className="px-6 py-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Community Updates</h3>
                        <div className="space-y-3">
                            {incident.incident_feedback.map((fb: any) => (
                                <div key={fb.id} className="bg-white rounded-xl border border-slate-200 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${fb.type === 'confirm' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className={`text-xs font-semibold uppercase ${fb.type === 'confirm' ? 'text-green-700' : 'text-red-700'}`}>
                                            {fb.type === 'confirm' ? 'Confirmed' : 'False Report'}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-auto">{new Date(fb.created_at).toLocaleTimeString().slice(0,5)}</span>
                                    </div>
                                    {fb.comment && <p className="text-sm text-slate-700">{fb.comment}</p>}
                                </div>
                            ))}
                        </div>
                     </div>
                )} */}

                {/* Safety Measures */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><GoogleIcon name="menu_book" size={16} className="text-blue-600" />{t('incidentDetail.safety.title')}</h3>
                    <Link href={`/guides?type=${incident.event_type}`}>
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <div className="font-semibold">{t('incidentDetail.safety.viewGuide')}</div>
                                <div className="text-sm text-white/80">{t('incidentDetail.safety.procedures')} {t(`common.disasterTypes.${incident.event_type}`)}</div>
                            </div>
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <FileDown size={20} />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Emergency Contacts */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><GoogleIcon name="emergency" size={16} className="text-red-600" />{t('incidentDetail.emergency.title')}</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {[
                            { name: 'Police', phone: '110' },
                            { name: 'Fire Department', phone: '113' },
                            { name: 'Ambulance', phone: '118' },
                            { name: 'BNPB', phone: '117' },
                        ].map((contact, i) => (
                            <a
                                key={contact.phone}
                                href={`tel:${contact.phone}`}
                                className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                                        <Phone size={16} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{contact.name}</div>
                                        <div className="text-sm text-slate-500">{contact.phone}</div>
                                    </div>
                                </div>
                                <div className="text-blue-600">{t('incidentDetail.emergency.call')}</div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>

            {/* Video Modal */}
            {
                activeVideoUrl && (
                    <VideoModal
                        videoUrl={activeVideoUrl}
                        onClose={() => setActiveVideoUrl(null)}
                    />
                )
            }
        </>
    );
}
