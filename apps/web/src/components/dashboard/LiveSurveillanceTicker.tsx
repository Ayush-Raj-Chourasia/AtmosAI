'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Radio, ShieldCheck, AlertTriangle } from 'lucide-react';

interface FeedItem {
  id: string;
  source: 'IMD' | 'CITIZEN' | 'SOCIAL' | 'RADAR' | 'CWC';
  text: string;
  secondsAgo: number;
  type: 'info' | 'warning' | 'verified' | 'quarantine';
}

const INITIAL_FEED: FeedItem[] = [
  { id: '1', source: 'IMD', text: 'Safdarjung AWS Station: 34.2°C, RH 68%, Light convective cloud cover tracking ESE', secondsAgo: 3, type: 'info' },
  { id: '2', source: 'CITIZEN', text: 'Ground observation verified: Waterlogging cleared at Dhaula Kuan underpass', secondsAgo: 8, type: 'verified' },
  { id: '3', source: 'RADAR', text: 'DWR Doppler Radar Mumbai: Reflectivity 48 dBZ convective storm cell over Thane', secondsAgo: 14, type: 'warning' },
  { id: '4', source: 'SOCIAL', text: '#IMD tag flagged by AI Quarantine: Recycled 2019 flood imagery isolated', secondsAgo: 21, type: 'quarantine' },
  { id: '5', source: 'CWC', text: 'Central Water Commission: Brahmaputra gauge at Pandu steady at 47.8m', secondsAgo: 29, type: 'info' },
  { id: '6', source: 'IMD', text: 'Nowcast Bulletin: Squall line approaching Jaipur district, wind gusts up to 45 km/h', secondsAgo: 36, type: 'warning' },
];

export default function LiveSurveillanceTicker() {
  const [items, setItems] = useState<FeedItem[]>(INITIAL_FEED);
  const [activeIdx, setActiveIdx] = useState(0);
  const [signalCount, setSignalCount] = useState(1482);
  const [syncSeconds, setSyncSeconds] = useState(1);

  // Rotate active ticker item every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  // Tick seconds and randomly increment signals count
  useEffect(() => {
    const ticker = setInterval(() => {
      setSyncSeconds((s) => (s >= 5 ? 1 : s + 1));
      if (Math.random() > 0.6) {
        setSignalCount((c) => c + 1);
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const activeItem = items[activeIdx];

  const getSourceBadge = (source: FeedItem['source'], type: FeedItem['type']) => {
    if (type === 'quarantine') {
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
    if (type === 'verified') {
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (type === 'warning') {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return 'bg-[#12141A]/5 text-[#12141A] border-[#12141A]/10';
  };

  return (
    <div className="rounded-2xl border border-[#12141A]/10 bg-[#F1ECE0] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
      {/* Status Indicators */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-mono font-bold text-[11px] tracking-wider text-[#12141A] uppercase">
            Live Surveillance Grid
          </span>
        </div>
        <span className="h-3.5 w-px bg-[#12141A]/15 hidden sm:block" />
        <span className="font-mono text-[11px] text-[#565b68] hidden md:inline">
          <span className="font-bold text-[#12141A]">{signalCount.toLocaleString()}</span> signals ingested today
        </span>
      </div>

      {/* Live Stream Item */}
      <div className="flex items-center gap-2 flex-1 sm:max-w-xl min-w-0 overflow-hidden">
        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border shrink-0 ${getSourceBadge(activeItem.source, activeItem.type)}`}>
          {activeItem.source}
        </span>
        <p className="truncate text-[11.5px] text-[#12141A] font-medium transition-all duration-300">
          {activeItem.text}
        </p>
      </div>

      {/* Sync Badge */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-[#565b68] shrink-0 justify-end">
        <span className="flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded-full border border-black/5">
          <Radio size={11} className="text-emerald-600 animate-pulse" />
          <span>Synced {syncSeconds}s ago</span>
        </span>
      </div>
    </div>
  );
}
