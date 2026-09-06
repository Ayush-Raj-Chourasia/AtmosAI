'use client';

import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { GUIDES, getIconNameByType, getHeaderColorByType } from '@disaster-app/shared';

export default function GuideDetailPage() {
    const params = useParams();
    const guideId = params.id as string;

    const guideData = GUIDES.find(g => g.id === guideId);

    if (!guideData) {
        return (
            <div className="absolute inset-0 flex flex-col bg-white">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-slate-400 mb-4">Guide not found</div>
                        <Link href="/guides" className="text-blue-600 font-medium">Go back</Link>
                    </div>
                </div>
                <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                    <BottomNav />
                </nav>
            </div>
        );
    }

    const iconName = getIconNameByType(guideData.disaster_type);
    const bgColor = getHeaderColorByType(guideData.disaster_type);

    return (
        <div className="absolute inset-0 flex flex-col bg-white">
            {/* Header */}
            <div className={`shrink-0 ${bgColor} text-white`}>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/guides" className="p-2 -ml-2 text-white/80 hover:text-white">
                            <ChevronLeft size={20} />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <GoogleIcon name={iconName} size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{guideData.title}</h1>
                            <p className="text-white/80 text-sm mt-1">{guideData.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-24">
                <div className="px-6 py-6">
                    <div className="prose prose-slate max-w-none">
                        {guideData.content?.split('\n').map((line: string, i: number) => {
                            if (line.startsWith('## ')) {
                                return <h2 key={i} className="text-lg font-semibold text-slate-900 mt-6 mb-3">{line.slice(3)}</h2>;
                            } else if (line.startsWith('- ')) {
                                return <li key={i} className="text-slate-700 ml-4">{line.slice(2)}</li>;
                            } else if (line.trim()) {
                                return <p key={i} className="text-slate-700 mb-2">{line}</p>;
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>

            <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe z-40">
                <BottomNav />
            </nav>
        </div>
    );
}
