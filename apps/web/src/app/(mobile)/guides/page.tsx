'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import { useLanguage } from '@/components/providers/LanguageProvider';
import GuideAISearch from '@/components/guides/GuideAISearch';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { GUIDES, getIconNameByType, getColorByType } from '@disaster-app/shared';

export default function GuidesPage() {
    const { t } = useLanguage();
    const [typeFilter, setTypeFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const DISASTER_TYPES = useMemo(() => [
        { id: 'all', label: t('common.disasterTypes.all') || 'All', icon: 'menu_book' },
        { id: 'flood', label: t('common.disasterTypes.flood') || 'Flood', icon: 'flood' },
        { id: 'earthquake', label: t('common.disasterTypes.earthquake') || 'Earthquake', icon: 'tsunami' },
        { id: 'fire', label: t('common.disasterTypes.fire') || 'Fire', icon: 'local_fire_department' },
        { id: 'landslide', label: t('common.disasterTypes.landslide') || 'Landslide', icon: 'landslide' },
        { id: 'tsunami', label: t('common.disasterTypes.tsunami') || 'Tsunami', icon: 'waves' },
        { id: 'volcano', label: t('common.disasterTypes.volcano') || 'Volcano', icon: 'volcano' },
        { id: 'whirlwind', label: t('common.disasterTypes.whirlwind') || 'Whirlwind', icon: 'cyclone' },
    ], [t]);

    const filteredGuides = typeFilter === 'all'
        ? GUIDES
        : GUIDES.filter((g) => g.disaster_type === typeFilter);

    return (
        <div className="absolute inset-0 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="shrink-0 bg-white z-20 relative border-b border-slate-100">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-900">{t('guides.title') || 'Safety Guides'}</h1>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 -mr-2 transition-colors ${showFilters ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Filter size={20} />
                        </button>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="mt-4 pb-2">
                            <div className="flex flex-wrap gap-2">
                                {DISASTER_TYPES.map(type => {
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => setTypeFilter(type.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === type.id
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <GoogleIcon name={type.icon} size={14} />
                                            {type.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 pb-24">
                <div className="px-6 py-4">
                    {/* AI Search */}
                    <div className="mb-6">
                        <GuideAISearch />
                    </div>
                    {filteredGuides.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-12 border border-dashed border-slate-200 rounded-2xl">
                            {t('guides.empty') || 'No guides found'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                                {filteredGuides.map((guide) => {
                                const iconName = getIconNameByType(guide.disaster_type);
                                const colorClasses = getColorByType(guide.disaster_type);

                                return (
                                    <Link key={guide.id} href={`/guides/${guide.id}`}>
                                        <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors cursor-pointer mb-2">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses}`}>
                                                    <GoogleIcon name={iconName} size={22} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-900">{guide.title}</h3>
                                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{guide.description}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 shrink-0" size={20} />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </div>
    );
}
