'use client';

import { ChevronLeft, Shield, Database, Eye, Lock, Server } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function PrivacyPolicyPage() {
    const { language } = useLanguage();
    const isEn = language === 'en';

    return (
        <div className="flex flex-col min-h-screen bg-[#F7F4EC]">
            {/* Header */}
            <div className="shrink-0 bg-[#F7F4EC] border-b border-[#12141A]/10">
                <div className="px-6 py-4 flex items-center gap-4 max-w-2xl mx-auto w-full">
                    <Link href="/profile" className="p-2 -ml-2 text-[#565b68] hover:text-[#12141A] rounded-full hover:bg-[#12141A]/5 transition-colors">
                        <ChevronLeft size={22} />
                    </Link>
                    <h1 className="text-lg font-bold font-display text-[#12141A]">
                        {isEn ? 'Privacy Policy & Data Sources' : 'गोपनीयता नीति और डेटा स्रोत'}
                    </h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 p-6 space-y-8 pb-16 max-w-2xl mx-auto w-full">
                {/* Introduction */}
                <div className="text-[#33363f] leading-relaxed text-sm">
                    <p>
                        {isEn 
                            ? "AtmosAI operates on principles of radical transparency, scientific verifiability, and privacy-by-design. This platform exists to provide life-saving extreme weather intelligence without compromising citizen telemetry."
                            : "AtmosAI पूर्ण पारदर्शिता, वैज्ञानिक सत्यापन और गोपनीयता के सिद्धांतों पर संचालित होता है। यह प्लेटफ़ॉर्म आपकी व्यक्तिगत गोपनीयता से समझौता किए बिना जीवन रक्षक मौसम पूर्वानुमान प्रदान करता है।"}
                    </p>
                </div>

                {/* Section 1: Data Sources */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-[#FF5A1F]">
                        <Database size={20} />
                        <h2 className="font-semibold text-lg text-[#12141A]">
                            {isEn ? 'Authorized Meteorological Sources' : 'अधिकृत मौसम संबंधी स्रोत'}
                        </h2>
                    </div>
                    <div className="bg-white/80 rounded-2xl p-5 border border-[#12141A]/10 shadow-sm space-y-3">
                        <p className="text-sm text-[#565b68] leading-relaxed">
                            {isEn 
                                ? "Our 12-stage ingestion engine synthesizes multiple data vectors before any weather incident is promoted to high confidence:"
                                : "हमारा 12-चरणीय अंतर्ग्रहण इंजन किसी भी मौसम घटना को उच्च विश्वास में पदोन्नत करने से पहले कई डेटा स्रोतों का विश्लेषण करता है:"}
                        </p>
                        <ul className="text-sm text-[#33363f] space-y-2 list-disc list-inside ml-1">
                            <li><strong>Official Agencies:</strong> {isEn ? "Bulletins and radar telemetry from India Meteorological Department (IMD), National Disaster Management Authority (NDMA), and Central Water Commission (CWC)." : "भारत मौसम विज्ञान विभाग (IMD), राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) और केंद्रीय जल आयोग (CWC) के बुलेटिन।"}</li>
                            <li><strong>Earth Observation:</strong> {isEn ? "INSAT-3DR multispectral imagery and Doppler Weather Radar (DWR) reflectivity feeds." : "INSAT-3DR उपग्रह इमेजरी और डॉपलर वेदर रडार (DWR) रिफ्लेक्टिविटी डेटा।"}</li>
                            <li><strong>Verified News:</strong> {isEn ? "Curated RSS feeds from vetted regional and national news services." : "प्रमाणित क्षेत्रीय और राष्ट्रीय समाचार सेवाओं से क्यूरेटेड आरएसएस फ़ीड।"}</li>
                            <li><strong>Ground Observers:</strong> {isEn ? "Geotagged observations submitted directly by registered community citizens and spotters." : "पंजीकृत नागरिकों और मौसम पर्यवेक्षकों द्वारा प्रस्तुत जियोटैग्ड अवलोकन।"}</li>
                        </ul>
                    </div>
                </section>

                {/* Section 2: Privacy & Location */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-[#1F8A70]">
                        <Lock size={20} />
                        <h2 className="font-semibold text-lg text-[#12141A]">
                            {isEn ? 'Zero Passive Tracking & Data Minimization' : 'शून्य निष्क्रिय ट्रैकिंग और डेटा सुरक्षा'}
                        </h2>
                    </div>
                    <div className="bg-[#1F8A70]/5 rounded-2xl p-5 border border-[#1F8A70]/20 space-y-4">
                         <div className="flex gap-3">
                            <Shield className="shrink-0 text-[#1F8A70]" size={20} />
                            <div>
                                <h3 className="font-medium text-[#12141A] text-sm">
                                    {isEn ? 'No Background Location Tracking' : 'पृष्ठभूमि में कोई स्थान ट्रैकिंग नहीं'}
                                </h3>
                                <p className="text-sm text-[#565b68] mt-1">
                                    {isEn 
                                        ? "We never track your GPS coordinates in the background. You monitor specific geographic regions (Districts / Tehsils), not personal device location."
                                        : "हम कभी भी पृष्ठभूमि में आपके जीपीएस निर्देशांक को ट्रैक नहीं करते हैं। आप व्यक्तिगत डिवाइस स्थान के बजाय विशिष्ट भौगोलिक क्षेत्रों की निगरानी करते हैं।"}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                             <Eye className="shrink-0 text-[#1F8A70]" size={20} />
                            <div>
                                <h3 className="font-medium text-[#12141A] text-sm">
                                    {isEn ? 'Zero Movement History' : 'शून्य गतिविधि इतिहास'}
                                </h3>
                                <p className="text-sm text-[#565b68] mt-1">
                                    {isEn 
                                        ? "We never store movement history or route logs. Your saved districts are stored locally on your device."
                                        : "हम कभी भी गतिविधि इतिहास या मार्ग लॉग संग्रहीत नहीं करते हैं। आपके सहेजे गए जिले आपके डिवाइस पर स्थानीय रूप से संग्रहीत होते हैं।"}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Data Retention */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-[#565b68]">
                        <Server size={20} />
                        <h2 className="font-semibold text-lg text-[#12141A]">
                            {isEn ? 'Auditability & Evidence Provenance' : 'ऑडिटेबिलिटी और साक्ष्य प्रमाण'}
                        </h2>
                    </div>
                    <p className="text-sm text-[#565b68] leading-relaxed bg-white/80 p-5 rounded-2xl border border-[#12141A]/10">
                        {isEn
                            ? "All AI classification decisions and multi-source confidence fusion calculations are logged with cryptographic verification hashes for independent scientific audit and post-disaster review."
                            : "सभी एआई वर्गीकरण निर्णय और बहु-स्रोत आत्मविश्वास फ़्यूज़न गणना स्वतंत्र वैज्ञानिक ऑडिट और आपदा के बाद की समीक्षा के लिए सुरक्षित रूप से लॉग किए जाते हैं।"}
                    </p>
                </section>

                 <div className="pt-6 text-center">
                    <p className="text-xs text-[#565b68]">
                        {isEn ? 'AtmosAI Core v2.4 • Updated September 2026' : 'AtmosAI कोर v2.4 • अद्यतन सितंबर 2026'}
                    </p>
                </div>
            </div>
        </div>
    );
}
