'use client';

import React from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { WEATHER_TAXONOMY, WeatherEventType } from '@n-weis/shared';
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
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl text-white space-y-4">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 ${
            selectedCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          <GoogleIcon name="apps" size={16} />
          All Hazards
        </button>

        {WEATHER_TAXONOMY.map(type => {
          const cfg = getIncidentConfig(type);
          const active = selectedCategory === type;
          return (
            <button
              key={type}
              onClick={() => onSelectCategory(type)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <GoogleIcon name={cfg.icon} size={16} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* State, Confidence & Status Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
        {/* State Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-750">
          <GoogleIcon name="location_on" size={16} className="text-blue-400" />
          <select
            value={selectedState}
            onChange={e => onSelectState(e.target.value)}
            className="bg-transparent text-slate-200 outline-none w-full cursor-pointer"
          >
            {INDIAN_STATES_FILTER.map(st => (
              <option key={st} value={st} className="bg-slate-900 text-slate-200">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-750">
          <GoogleIcon name="verified_user" size={16} className="text-emerald-400" />
          <select
            value={selectedStatus}
            onChange={e => onSelectStatus(e.target.value)}
            className="bg-transparent text-slate-200 outline-none w-full cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Statuses</option>
            <option value="VERIFIED" className="bg-slate-900 text-slate-200">Verified Only (≥85%)</option>
            <option value="UNDER_REVIEW" className="bg-slate-900 text-slate-200">Under Review</option>
            <option value="DETECTED" className="bg-slate-900 text-slate-200">Detected Signals</option>
          </select>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-750">
          <span className="text-slate-400 shrink-0 font-medium">
            Min Conf: <strong className="text-emerald-400 font-bold">{minConfidence}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minConfidence}
            onChange={e => onConfidenceChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
