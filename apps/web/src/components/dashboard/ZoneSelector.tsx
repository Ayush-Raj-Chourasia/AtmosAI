'use client';

import { Home, Briefcase, Users, Plus, MapPin, X, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { useZone } from '@/components/providers/ZoneProvider';
import { useState } from 'react';
import AddZoneDialog from './AddZoneDialog';
import { useLanguage } from '@/components/providers/LanguageProvider';

// Helper to get icon based on label
const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home size={12} />;
    if (l.includes('office') || l.includes('work')) return <Briefcase size={12} />;
    if (l.includes('parent') || l.includes('family')) return <Users size={12} />;
    return <MapPin size={12} />;
};

export default function ZoneSelector() {
    const { zones, selectedZoneId, setSelectedZoneId, deleteZone } = useZone();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this zone?')) {
            deleteZone(id);
        }
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    const getSelectedLabel = () => {
        if (selectedZoneId === 'all' || !selectedZoneId) return t('map.filter.allIndonesia');
        const zone = zones.find(z => z.id === selectedZoneId);
        return zone ? zone.label : t('map.filter.allIndonesia');
    };

    return (
        <>
            <div className="relative z-30 inline-block">
                {/* Trigger Button */}
                <button
                    onClick={toggleOpen}
                    className="flex items-center gap-1.5 text-slate-900 focus:outline-none group cursor-pointer"
                >
                    <MapPin className="text-slate-500 group-hover:text-blue-600 transition-colors" size={16} />
                    <span className="font-semibold text-base">{getSelectedLabel()}</span>
                    {isOpen ? (
                        <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                    )}
                </button>

                {/* Dropdown Backdrop */}
                {isOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                )}

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-[60vh] overflow-y-auto">
                            {/* All Indonesia Option */}
                            <button
                                onClick={() => {
                                    setSelectedZoneId('all');
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${selectedZoneId === 'all' ? 'bg-blue-50/50 text-blue-600' : 'text-slate-600'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedZoneId === 'all' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Globe size={14} />
                                </div>
                                <span className="font-medium text-sm">{t('map.filter.allIndonesia')}</span>
                            </button>

                            {/* Zone List */}
                            {zones.map((zone) => {
                                const isActive = zone.id === selectedZoneId;
                                return (
                                    <div key={zone.id} className="relative group">
                                        <button
                                            onClick={() => {
                                                setSelectedZoneId(zone.id);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${isActive ? 'bg-indigo-50/50 text-indigo-600' : 'text-slate-600'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {getIcon(zone.label)}
                                            </div>
                                            <span className="font-medium text-sm truncate">{zone.label}</span>
                                        </button>

                                        <button
                                            onClick={(e) => handleDelete(e, zone.id)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Add Zone Button */}
                        <button
                            onClick={() => {
                                setIsAddOpen(true);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                                <Plus size={14} />
                            </div>
                            <span className="font-medium text-sm">{t('map.filter.addZone')}</span>
                        </button>
                    </div>
                )}
            </div>

            <AddZoneDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        </>
    );
}
