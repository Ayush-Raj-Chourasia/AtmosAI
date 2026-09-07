'use client';

import React from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { WEATHER_TAXONOMY } from '@n-weis/shared';
import { getIncidentConfig } from '@/lib/incidents';

interface WeatherFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedState: string;
  onSelectState: (state: string) => void;
  minConfidence: number;
  onConfidenceChange: (conf: number) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export const INDIAN_STATES_FILTER = [
  'All India',
  'Assam',
  'Delhi',
  'Maharashtra',
  'Rajasthan',
  'West Bengal',
  'Uttar Pradesh',
  'Tamil Nadu',
  'Karnataka',
  'Kerala',
  'Gujarat',
  'Bihar',
  'Odisha',
  'Uttarakhand',
  'Punjab',
];

export default function WeatherFilterBar({
  selectedCategory,
  onSelectCategory,
  selectedState,
  onSelectState,
  minConfidence,
  onConfidenceChange,
  selectedStatus,
  onSelectStatus,
}: WeatherFilterBarProps) {
  return (
    <div className="bg-[#12141A] text-[#F7F4EC] border border-white/10 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/30'
              : 'bg-white/5 text-[#B7BAC2] hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <GoogleIcon name="apps" size={16} />
          All Hazards
        </button>

        {WEATHER_TAXONOMY.map((type) => {
          const cfg = getIncidentConfig(type);
          const active = selectedCategory === type;
          return (
            <button
              key={type}
              onClick={() => onSelectCategory(type)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                active
                  ? 'bg-[#FF5A1F] text-white font-semibold shadow-md shadow-[#FF5A1F]/30'
                  : 'bg-white/5 text-[#B7BAC2] hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <GoogleIcon name={cfg.icon} size={16} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* State, Status & Confidence Threshold */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
        {/* State Selector */}
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
          <GoogleIcon name="location_on" size={16} className="text-[#FF5A1F]" />
          <select
            value={selectedState}
            onChange={(e) => onSelectState(e.target.value)}
            className="bg-transparent text-[#F7F4EC] outline-none w-full cursor-pointer font-medium"
          >
            {INDIAN_STATES_FILTER.map((st) => (
              <option key={st} value={st} className="bg-[#12141A] text-[#F7F4EC]">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selector */}
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
          <GoogleIcon name="verified_user" size={16} className="text-[#1F8A70]" />
          <select
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
            className="bg-transparent text-[#F7F4EC] outline-none w-full cursor-pointer font-medium"
          >
            <option value="ALL" className="bg-[#12141A] text-[#F7F4EC]">All Verified Levels</option>
            <option value="VERIFIED" className="bg-[#12141A] text-[#F7F4EC]">Verified Only (≥80%)</option>
            <option value="ACTIVE" className="bg-[#12141A] text-[#F7F4EC]">Active Operations</option>
            <option value="UNDER_REVIEW" className="bg-[#12141A] text-[#F7F4EC]">Under Multimodal Review</option>
          </select>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
          <span className="text-[#8b8e97] shrink-0 font-mono text-[11px]">
            Min Conf: <strong className="text-[#1FBF9B] font-bold">{minConfidence}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minConfidence}
            onChange={(e) => onConfidenceChange(Number(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF5A1F]"
          />
        </div>
      </div>
    </div>
  );
}
