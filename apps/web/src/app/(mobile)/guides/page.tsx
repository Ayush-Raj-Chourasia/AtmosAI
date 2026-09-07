'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, BookOpen, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/navigation/BottomNav';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { GUIDES, getIconNameByType } from '@n-weis/shared';

export default function GuidesPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const DISASTER_TYPES = useMemo(() => [
    { id: 'all', label: 'All Hazards', icon: 'menu_book' },
    { id: 'flood', label: 'Flood & Inundation', icon: 'flood' },
    { id: 'cyclone', label: 'Cyclonic Storm', icon: 'storm' },
    { id: 'heatwave', label: 'Severe Heatwave', icon: 'wb_sunny' },
    { id: 'thunderstorm', label: 'Thunder & Lightning', icon: 'thunderstorm' },
    { id: 'cloudburst', label: 'Cloudburst Torrent', icon: 'water_drop' },
    { id: 'fog', label: 'Dense Fog & Smog', icon: 'foggy' },
    { id: 'landslide', label: 'Slope Landslide', icon: 'landslide' },
  ], []);

  const filteredGuides = GUIDES.filter((g) => {
    if (typeFilter !== 'all' && g.disaster_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#12141A] flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-[#F7F4EC]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#12141A]/10 px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 -ml-1.5 text-[#12141A] hover:text-[#FF5A1F] transition-colors rounded-full hover:bg-black/5"
            title="Back to Dashboard"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-base font-bold font-display text-[#12141A]">
              Standard Operating Safety Protocols
            </h1>
            <p className="text-[11px] text-[#565b68] font-mono">
              NDMA &amp; IMD Disaster Response Guidelines
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-full border transition-colors cursor-pointer ${
            showFilters
              ? 'bg-[#12141A] text-white border-[#12141A]'
              : 'bg-white text-[#12141A] border-[#12141A]/15 hover:border-[#12141A]/30'
          }`}
        >
          <Filter size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-5 sm:p-8 space-y-6 pb-28">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emergency protocols, evacuation rules, first aid..."
            className="w-full bg-white border border-[#12141A]/15 rounded-2xl px-5 py-3.5 text-xs text-[#12141A] placeholder-[#8b8e97] shadow-sm outline-none focus:border-[#FF5A1F]"
          />
        </div>

        {/* Hazard Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {DISASTER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setTypeFilter(type.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer border ${
                typeFilter === type.id
                  ? 'bg-[#12141A] text-[#F7F4EC] border-[#12141A] font-semibold shadow-sm'
                  : 'bg-white text-[#565b68] border-[#12141A]/15 hover:border-[#12141A]/30'
              }`}
            >
              <GoogleIcon name={type.icon} size={15} />
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Guides List */}
        <div className="space-y-3">
          {filteredGuides.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#12141A]/10 p-8">
              <BookOpen size={36} className="mx-auto text-[#565b68] mb-3" />
              <h3 className="font-bold text-sm text-[#12141A]">No safety protocols match your query.</h3>
              <p className="text-xs text-[#565b68] mt-1">Try searching for &quot;flood&quot;, &quot;cyclone&quot;, or &quot;heatwave&quot;.</p>
            </div>
          ) : (
            filteredGuides.map((guide) => {
              const iconName = getIconNameByType(guide.disaster_type);

              return (
                <Link key={guide.id} href={`/guides/${guide.id}`} className="block group">
                  <div className="bg-white rounded-3xl border border-[#12141A]/10 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#12141A]/30 transition-all flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#12141A] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <GoogleIcon name={iconName} size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#12141A]/5 text-[#12141A]">
                          {guide.disaster_type}
                        </span>
                      </div>
                      <h3 className="font-bold font-display text-base text-[#12141A] mt-1 group-hover:text-[#FF5A1F] transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-[#565b68] mt-1 leading-relaxed line-clamp-2">
                        {guide.description}
                      </p>
                    </div>

                    <div className="self-center p-2 text-[#8b8e97] group-hover:text-[#FF5A1F] transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
        <BottomNav />
      </nav>
    </div>
  );
}
