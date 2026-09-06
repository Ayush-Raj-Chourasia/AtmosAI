'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import StatsCard from '@/components/admin/StatsCard';
import { Radio, AlertTriangle, Users, Sparkles, Brain, Activity, TrendingUp, Clock } from 'lucide-react';

interface Stats {
  totals: {
    signals: number;
    incidents: number;
    users: number;
    evaluations: number;
    traces: number;
  };
  signalsBySource: Record<string, number>;
  incidentsByStatus: Record<string, number>;
  last24h: {
    signals: number;
    incidents: number;
  };
}

export default function HealthPage() {
  const { data: stats, isLoading, dataUpdatedAt } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/admin/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const sourceColors: Record<string, string> = {
    user_report: 'bg-green-500',
    social_media: 'bg-purple-500',
    tiktok_ai: 'bg-pink-500',
    news: 'bg-blue-500',
    sensor: 'bg-orange-500',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-slate-500 mt-1">Platform metrics and performance overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={14} />
          Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '-'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatsCard
          title="Total Signals"
          value={isLoading ? '...' : stats?.totals.signals || 0}
          icon={Radio}
          color="blue"
        />
        <StatsCard
          title="Total Incidents"
          value={isLoading ? '...' : stats?.totals.incidents || 0}
          icon={AlertTriangle}
          color="amber"
        />
        <StatsCard
          title="Total Users"
          value={isLoading ? '...' : stats?.totals.users || 0}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="AI Evaluations"
          value={isLoading ? '...' : stats?.totals.evaluations || 0}
          icon={Sparkles}
          color="purple"
        />
        <StatsCard
          title="AI Traces"
          value={isLoading ? '...' : stats?.totals.traces || 0}
          icon={Brain}
          color="slate"
        />
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Last 24 Hours Activity</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">New Signals</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">{stats?.last24h.signals || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">New Incidents</span>
              </div>
              <p className="text-3xl font-bold text-amber-700">{stats?.last24h.incidents || 0}</p>
            </div>
          </div>
        </div>

        {/* Incident Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Incident Status Distribution</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-slate-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(stats?.incidentsByStatus || {}).map(([status, count]) => {
                const colorMap: Record<string, string> = {
                  monitor: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
                  alert: 'from-red-50 to-red-100 border-red-200 text-red-700',
                  resolved: 'from-green-50 to-green-100 border-green-200 text-green-700',
                  suppress: 'from-slate-50 to-slate-100 border-slate-200 text-slate-700',
                };
                return (
                  <div
                    key={status}
                    className={`bg-gradient-to-br rounded-xl p-4 border ${colorMap[status] || 'from-slate-50 to-slate-100 border-slate-200'}`}
                  >
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{status}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Source Performance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Signal Source Distribution</h3>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-slate-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(stats?.signalsBySource || {}).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
              const percentage = Math.round((count / (stats?.totals.signals || 1)) * 100);
              return (
                <div key={source} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-slate-700 capitalize">
                    {source.replace('_', ' ')}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${sourceColors[source] || 'bg-slate-400'}`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                    <span className="text-xs text-slate-400 ml-1">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="mt-6 bg-slate-900 rounded-2xl p-6 text-white">
        <h3 className="text-sm font-semibold mb-4">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1">API Endpoint</p>
            <p className="font-mono text-xs">{API_BASE_URL}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Auto-Refresh</p>
            <p className="font-mono text-xs">Every 30 seconds</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Data Tables</p>
            <p className="font-mono text-xs">10 modules</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
