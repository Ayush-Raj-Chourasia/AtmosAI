'use client';

import { User, FileText, CheckCircle, XCircle, Bell, ChevronRight, Settings, LogOut, Shield, Loader2 } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';

export default function ProfilePage() {
    const { t } = useLanguage();
    const { user, isLoading, signOut } = useAuth();
    const router = useRouter();

    // Fetch user stats from API
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['user-stats', user?.id],
        queryFn: async () => {
            if (!user?.id) return { totalReports: 0, confirmedEvents: 0, hoaxReports: 0 };

            // Fetch user reports count
            const reportsRes = await fetch(`${API_BASE_URL}/user/stats?user_id=${user.id}`);
            if (reportsRes.ok) {
                return reportsRes.json();
            }

            // Fallback if endpoint doesn't exist yet
            return { totalReports: 0, confirmedEvents: 0, hoaxReports: 0 };
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    const userStats = stats || { totalReports: 0, confirmedEvents: 0, hoaxReports: 0 };

    return (
        <>
            {/* Header */}
            <div className="shrink-0 bg-white">
                <div className="px-6 py-6">
                    <h1 className="text-2xl font-bold text-slate-900">{t('profile.title')}</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 pb-24">
                {/* User Info Card */}
                <div className="px-6 py-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white overflow-hidden">
                                {user?.user_metadata?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <User size={28} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                </h2>
                                <p className="text-sm text-slate-500">{user?.email}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {t('profile.memberSince')} {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contribution Stats */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('profile.contributions')}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FileText size={18} className="text-blue-600" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900">
                                {statsLoading ? '-' : userStats.totalReports}
                            </div>
                            <div className="text-xs text-slate-500">{t('profile.reports')}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle size={18} className="text-green-600" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900">
                                {statsLoading ? '-' : userStats.confirmedEvents}
                            </div>
                            <div className="text-xs text-slate-500">{t('profile.confirmed')}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                <XCircle size={18} className="text-red-600" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900">
                                {statsLoading ? '-' : userStats.hoaxReports}
                            </div>
                            <div className="text-xs text-slate-500">{t('profile.hoax')}</div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.title')}</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <Link href="/profile/notifications" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                                    <Bell size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900">{t('profile.notifications')}</div>
                                    <div className="text-sm text-slate-500">{t('profile.notificationsDesc')}</div>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </Link>
                        
                        <div className="border-t border-slate-100" />
                        
                        <Link href="/profile/privacy" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900">{t('profile.privacyPolicy')}</div>
                                    <div className="text-sm text-slate-500">{t('profile.privacyPolicyDesc')}</div>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </Link>

                        <div className="border-t border-slate-100" />

                        <Link href="/settings" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                                    <Settings size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900">{t('settings.title')}</div>
                                    <div className="text-sm text-slate-500">{t('profile.settingsDesc')}</div>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </Link>
                    </div>
                </div>

                {/* Sign Out */}
                <div className="px-6 py-4">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                    >
                        <LogOut size={18} />
                        {t('profile.signOut')}
                    </button>
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </>
    );
}


