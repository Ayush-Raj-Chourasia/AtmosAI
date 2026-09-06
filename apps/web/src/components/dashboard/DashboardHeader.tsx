'use client';

import { Shield, Settings, WifiOff, RefreshCw, Wifi, Megaphone } from 'lucide-react';
import Image from 'next/image';
import { useNetworkStatus } from '@/components/providers/NetworkStatusProvider';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import ReportIncidentModal from '@/components/modals/ReportIncidentModal';
import { useLanguage } from '@/components/providers/LanguageProvider';
import Link from 'next/link';

// Feature toggle for User Reports
const isUserReportsEnabled = process.env.NEXT_PUBLIC_FEATURE_USER_REPORTS === 'true';

export default function DashboardHeader() {
    const { isOnline } = useNetworkStatus();
    const isFetching = useIsFetching();
    const queryClient = useQueryClient();
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const { t } = useLanguage();

    const handleRetry = () => {
        queryClient.invalidateQueries();
    };



    return (
        <header className="pt-6 pb-2 px-6 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-colors duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden shadow-sm">
                        <Image
                            src="/icons/icon-192x192.png"
                            alt="Disaster Pulse"
                            width={32}
                            height={32}
                            unoptimized
                        />
                    </div>
                    <h1 className="font-semibold tracking-tight text-lg text-slate-900">Disaster Pulse</h1>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-4">
                    {!isOnline ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full animate-in fade-in slide-in-from-top-2 duration-300">
                            <WifiOff className="text-amber-500" size={12} />
                            <span className="text-xs font-medium text-amber-700">{t('dashboard.status.offline')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${isFetching > 0 ? 'opacity-75' : 'opacity-0'}`}></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                                <span className="text-xs font-medium text-emerald-700">{t('dashboard.status.online')}</span>
                        </div>
                    )}
                    
                    {isUserReportsEnabled && (
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors flex items-center justify-center relative active:scale-95"
                        >
                            <Megaphone size={18} />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    )}
                </div>
            </div>

            {/* Connection / Sync Banner */}
            <div className="flex items-center justify-between py-1.5 h-6">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    {isFetching > 0 ? (
                        <>
                            <RefreshCw size={10} className="animate-spin text-blue-500" />
                            <span className="text-blue-600 font-medium">{t('dashboard.status.syncing')}</span>
                        </>
                    ) : !isOnline ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                {t('dashboard.status.cached')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                    ) : (
                        <>
                            <Wifi size={10} className="text-slate-400" />
                                    <span className="text-slate-400">{t('dashboard.status.uptodate')}</span>
                        </>
                    )}
                </span>
                
                {(!isOnline || (!(isFetching > 0) && isOnline)) && (
                    <button 
                        onClick={handleRetry}
                        disabled={isFetching > 0}
                        className={`text-[10px] font-semibold uppercase tracking-wide cursor-pointer transition-colors ${isFetching > 0 ? 'text-slate-300' : 'text-blue-600 hover:text-blue-700 hover:underline'}`}
                    >
                        {isFetching > 0 ? 'Syncing...' : t('common.retry')}
                    </button>
                )}
            </div>


            {isUserReportsEnabled && (
                <ReportIncidentModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                />
            )}
        </header >
    );
}
