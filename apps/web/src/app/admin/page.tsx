'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import StatsCard from '@/components/admin/StatsCard';
import { Radio, AlertTriangle, Users, Sparkles, Brain, Activity } from 'lucide-react';

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

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/admin/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">System metrics and activity summary</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatsCard
          title="Total Signals"
          value={isLoading ? '...' : stats?.totals.signals || 0}
          icon={Radio}
          color="blue"
          trend={stats ? { value: stats.last24h.signals, label: 'last 24h' } : undefined}
          href="/admin/signals"
        />
        <StatsCard
          title="Total Incidents"
          value={isLoading ? '...' : stats?.totals.incidents || 0}
          icon={AlertTriangle}
          color="amber"
          trend={stats ? { value: stats.last24h.incidents, label: 'last 24h' } : undefined}
          href="/admin/incidents"
        />
        <StatsCard
          title="Total Users"
          value={isLoading ? '...' : stats?.totals.users || 0}
          icon={Users}
          color="green"
          href="/admin/users"
        />
        <StatsCard
          title="AI Evaluations"
          value={isLoading ? '...' : stats?.totals.evaluations || 0}
          icon={Sparkles}
          color="purple"
          href="/admin/evaluations"
        />
        <StatsCard
          title="AI Traces"
          value={isLoading ? '...' : stats?.totals.traces || 0}
          icon={Brain}
          color="slate"
          href="/admin/traces"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signals by Source */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Signals by Source</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-slate-400">Loading...</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats?.signalsBySource || {}).map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-slate-600 capitalize">
                    {source.replace('_', ' ')}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (count / (stats?.totals.signals || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-12 text-xs font-medium text-slate-500 text-right">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incidents by Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Incidents by Status</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-slate-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats?.incidentsByStatus || {}).map(([status, count]) => {
                const colorMap: Record<string, string> = {
                  monitor: 'bg-amber-100 text-amber-700 border-amber-200',
                  alert: 'bg-red-100 text-red-700 border-red-200',
                  resolved: 'bg-green-100 text-green-700 border-green-200',
                  suppress: 'bg-slate-100 text-slate-700 border-slate-200',
                };
                return (
                  <div
                    key={status}
                    className={`rounded-xl border p-4 ${colorMap[status] || 'bg-slate-50 border-slate-200'}`}
                  >
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs font-medium uppercase tracking-wide capitalize">{status}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Activity (Last 24 Hours)</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{stats?.last24h.signals || 0}</p>
            <p className="text-xs font-medium text-blue-600/70">New Signals</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-2xl font-bold text-amber-600">{stats?.last24h.incidents || 0}</p>
            <p className="text-xs font-medium text-amber-600/70">New Incidents</p>
          </div>
        </div>
      </div>
    </div>
  );
}
