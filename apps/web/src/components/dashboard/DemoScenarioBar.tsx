'use client';

import React, { useState } from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { triggerScenario as triggerLocalScenario, resetLocalEvents } from '@/lib/mockApiStore';

interface DemoScenarioBarProps {
  onScenarioTriggered?: () => void;
}

const SCENARIOS = [
  { id: 'scen-assam', label: 'Guwahati Flood (94%)', icon: 'flood', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'scen-dwarka', label: 'Dwarka Gale (91%)', icon: 'storm', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'scen-delhi', label: 'Delhi Heatwave (96%)', icon: 'wb_sunny', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { id: 'scen-dehradun', label: 'Dehradun Cloudburst', icon: 'water_drop', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
];

export default function DemoScenarioBar({ onScenarioTriggered }: DemoScenarioBarProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleScenario = (scenarioId: string) => {
    setIsRunning(true);
    setToastMessage('Synthesizing multi-source signals into AtmosAI pipeline...');

    setTimeout(() => {
      if (scenarioId === 'reset') {
        resetLocalEvents();
        setToastMessage('Operational state reset to baseline national telemetry.');
      } else {
        triggerLocalScenario(scenarioId);
        const name = SCENARIOS.find((s) => s.id === scenarioId)?.label || scenarioId;
        setToastMessage(`✓ ${name} injected! Doppler radar reflectivity & citizen signals fused.`);
      }
      setIsRunning(false);
      if (onScenarioTriggered) onScenarioTriggered();

      setTimeout(() => setToastMessage(null), 5000);
    }, 400);
  };

  return (
    <div className="bg-[#12141A] text-[#F7F4EC] border border-white/10 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0">
            <GoogleIcon name="play_arrow" size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F] flex items-center gap-1.5 font-mono">
              Live Scenario Injector
            </div>
            <p className="text-xs text-[#B7BAC2]">
              Simulate extreme weather anomalies, Doppler radar echoes, and multi-source corroboration
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {SCENARIOS.map((scen) => (
            <button
              key={scen.id}
              disabled={isRunning}
              onClick={() => handleScenario(scen.id)}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 ${scen.color}`}
            >
              <GoogleIcon name={scen.icon} size={15} />
              {scen.label}
            </button>
          ))}

          <button
            disabled={isRunning}
            onClick={() => handleScenario('reset')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8b8e97] hover:text-white border border-white/10 font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon name="refresh" size={15} />
            Reset State
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <GoogleIcon name="check_circle" size={16} className="text-emerald-400 shrink-0" />
          <span className="font-mono">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
