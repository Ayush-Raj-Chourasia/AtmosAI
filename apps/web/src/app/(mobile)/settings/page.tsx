'use client';

import { useLanguage } from '@/components/providers/LanguageProvider';
import { ChevronLeft, Globe } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Header */}
            <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center gap-4 sticky top-0 z-10 w-full">
                <Link href="/" className="text-slate-500 hover:text-slate-900 transition-colors p-1 -ml-2 rounded-full hover:bg-slate-100">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold text-slate-900">{t('settings.title')}</h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
                {/* Language Section */}
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                            <Globe size={18} className="text-blue-500" />
                            {t('settings.language')}
                        </div>
                    </div>
                    
                    <div className="p-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                    language === 'en' 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                English
                            </button>
                            <button
                                onClick={() => setLanguage('id')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                    language === 'id' 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Indonesia
                            </button>
                        </div>
                    </div>
                </section>

                {/* Other settings placeholders could go here */}
            </div>
        </div>
    );
}
