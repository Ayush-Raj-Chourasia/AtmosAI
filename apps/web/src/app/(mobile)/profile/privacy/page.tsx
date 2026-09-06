'use client';

import { ChevronLeft, Shield, Database, Eye, Lock, Server } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function PrivacyPolicyPage() {
    const { language } = useLanguage();

    const isEn = language === 'en';

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-slate-100">
                <div className="px-6 py-4 flex items-center gap-4">
                    <Link href="/profile" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900">
                        {isEn ? 'Privacy Policy & Data Sources' : 'Kebijakan Privasi & Sumber Data'}
                    </h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-12 max-w-2xl mx-auto w-full">
                {/* Introduction */}
                <div className="prose prose-slate prose-sm text-slate-600">
                    <p>
                        {isEn 
                            ? "We believe in trust, transparency, and privacy by design. This platform exists to provide life-saving information without compromising your personal data."
                            : "Kami percaya pada kepercayaan, transparansi, dan privasi sejak awal. Platform ini hadir untuk memberikan informasi yang menyelamatkan jiwa tanpa mengorbankan data pribadi Anda."}
                    </p>
                </div>

                {/* Section 1: Data Sources */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Database size={20} />
                        <h2 className="font-semibold text-lg text-slate-900">
                            {isEn ? 'Where Data Comes From' : 'Dari Mana Data Berasal'}
                        </h2>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {isEn 
                                ? "Our system aggregates \"Signals\" from various untrusted public sources. These signals are analyzed to detect potential disasters."
                                : "Sistem kami mengumpulkan \"Sinyal\" dari berbagai sumber publik. Sinyal-sinyal ini dianalisis untuk mendeteksi potensi bencana."}
                        </p>
                        <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside ml-1">
                            <li><strong>Social Media:</strong> {isEn ? "Public posts from platforms like TikTok used solely for disaster detection." : "Postingan publik dari platform seperti TikTok yang digunakan hanya untuk deteksi bencana."}</li>
                            <li><strong>Official Agencies:</strong> {isEn ? "Real-time alerts from BMKG (Meteorology, Climatology, and Geophysics Agency) and BNPB." : "Peringatan real-time dari BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) dan BNPB."}</li>
                            <li><strong>News Feeds:</strong> {isEn ? "RSS feeds from verified news outlets." : "Feed RSS dari outlet berita terverifikasi."}</li>
                            <li><strong>User Reports:</strong> {isEn ? "Direct submissions from community members like you." : "Laporan langsung dari anggota komunitas seperti Anda."}</li>
                        </ul>
                    </div>
                </section>

                {/* Section 2: Privacy & Location */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <Lock size={20} />
                        <h2 className="font-semibold text-lg text-slate-900">
                            {isEn ? 'Privacy & Location' : 'Privasi & Lokasi'}
                        </h2>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 space-y-3">
                         <div className="flex gap-3">
                            <Shield className="shrink-0 text-emerald-600" size={20} />
                            <div>
                                <h3 className="font-medium text-emerald-900 text-sm">
                                    {isEn ? 'No Passive Tracking' : 'Tidak Ada Pelacakan Pasif'}
                                </h3>
                                <p className="text-sm text-emerald-800 mt-1">
                                    {isEn 
                                        ? "We do not track your location in the background. You follow \"Places\" (like your Home or Office), not yourself."
                                        : "Kami tidak melacak lokasi Anda di latar belakang. Anda mengikuti \"Tempat\" (seperti Rumah atau Kantor), bukan diri Anda sendiri."}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                             <Eye className="shrink-0 text-emerald-600" size={20} />
                            <div>
                                <h3 className="font-medium text-emerald-900 text-sm">
                                    {isEn ? 'No Location History' : 'Tidak Ada Riwayat Lokasi'}
                                </h3>
                                <p className="text-sm text-emerald-800 mt-1">
                                    {isEn 
                                        ? "We never store your movement history. Your saved places are used only to filter alerts relevant to you."
                                        : "Kami tidak pernah menyimpan riwayat pergerakan Anda. Tempat yang Anda simpan hanya digunakan untuk menyaring peringatan yang relevan bagi Anda."}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Data Retention */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Server size={20} />
                        <h2 className="font-semibold text-lg text-slate-900">
                            {isEn ? 'Data Retention' : 'Penyimpanan Data'}
                        </h2>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {isEn
                            ? "We adhere to strict data lifecycle rules. Raw observation data is retained only as long as necessary for verification (typically 90 days) before being archived or deleted. User reports can be anonymized upon request."
                            : "Kami mematuhi aturan siklus hidup data yang ketat. Data observasi mentah hanya disimpan selama diperlukan untuk verifikasi (biasanya 90 hari) sebelum diarsipkan atau dihapus. Laporan pengguna dapat dianonimkan berdasarkan permintaan."}
                    </p>
                </section>

                 <div className="pt-8 text-center">
                    <p className="text-xs text-slate-400">
                        {isEn ? 'Last updated: January 2026' : 'Terakhir diperbarui: Januari 2026'}
                    </p>
                </div>
            </div>
        </div>
    );
}
