'use client';

import React, { useState } from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { API_BASE_URL } from '@/lib/config';

interface DemoScenarioBarProps {
  onScenarioTriggered?: () => void;
}

export default function DemoScenarioBar({ onScenarioTriggered }: DemoScenarioBarProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerScenario = async (scenarioId: string) => {
    setIsRunning(true);
    setActiveScenario(scenarioId);
    setToastMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/demo/scenario/${scenarioId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message || `Scenario ${scenarioId} executed successfully!`);
        if (onScenarioTriggered) onScenarioTriggered();
      } else {
        setToastMessage(`Error: ${data.message || 'Execution failed'}`);
      }
    } catch (err: any) {
      setToastMessage(`Network error triggering demo scenario: ${err.message}`);
    } finally {
      setIsRunning(false);
      setTimeout(() => setToastMessage(null), 6000);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-xl text-white">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <GoogleIcon name="play_arrow" size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              SIH 2026 Judge Demo Simulator
              <span className="bg-amber-500/20 text-[10px] px-1.5 py-0.5 rounded text-amber-300">Section 38 Story</span>
            </div>
            <p className="text-xs text-slate-400">Inject multi-source weather observations, duplicate groups, and fake reports</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            disabled={isRunning}
            onClick={() => triggerScenario('flood-guwahati')}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            <GoogleIcon name="flood" size={16} />
            Guwahati Flood (94%)
          </button>

          <button
            disabled={isRunning}
            onClick={() => triggerScenario('thunderstorm-delhi')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <GoogleIcon name="thunderstorm" size={16} className="text-amber-400" />
            Delhi Squall
          </button>

          <button
            disabled={isRunning}
            onClick={() => triggerScenario('mumbai-rainfall')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <GoogleIcon name="water_drop" size={16} className="text-blue-400" />
            Mumbai Downpour
          </button>

          <button
            disabled={isRunning}
            onClick={() => triggerScenario('heatwave-rajasthan')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <GoogleIcon name="wb_sunny" size={16} className="text-rose-400" />
            Rajasthan Heatwave
          </button>

          <button
            disabled={isRunning}
            onClick={() => triggerScenario('reset')}
            className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-750 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <GoogleIcon name="refresh" size={16} />
            Reset
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <GoogleIcon name="check_circle" size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
