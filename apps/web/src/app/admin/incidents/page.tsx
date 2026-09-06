'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import PageHeader from '@/components/admin/PageHeader';
import TableToolbar from '@/components/admin/TableToolbar';
import Link from 'next/link';

interface Incident {
  id: string;
  event_type: string;
  city: string;
  status: string;
  severity: string | null;
  confidence_score: number | null;
  time_start: string;
  time_end: string;
  created_at: string;
  updated_at: string;
  signal_count: number;
  incident_signals: { signal_id: string }[];
  metrics: any;
}

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-incidents', page, sortBy, sortOrder, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        // Backend text search support would need to be added to API to make this fully functional
        // For now we pass it, but API might ignore it if not implemented yet
        search,
        status: statusFilter,
      });
      const res = await fetch(`${API_BASE_URL}/admin/incidents?${params}`);
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'title',
      header: 'Incident',
      className: 'min-w-[200px]',
      render: (row: Incident) => (
        <div className="flex flex-col">
          <Link
            href={`/admin/incidents/${row.id}`}
            className="text-blue-600 font-medium hover:underline text-sm capitalize"
          >
            {row.event_type.replace('_', ' ')} in {row.city}
          </Link>
          <span className="text-xs text-slate-400 font-mono mt-0.5">
            ID: {row.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Incident) => (
        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${row.status === 'alert' ? 'bg-red-50 text-red-600 border border-red-100' :
            row.status === 'monitor' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              row.status === 'resolved' ? 'bg-green-50 text-green-600 border border-green-100' :
                'bg-slate-50 text-slate-500 border border-slate-100'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (row: Incident) => (
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${row.severity === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
              row.severity === 'medium' ? 'bg-amber-500' :
                'bg-emerald-500'
            }`} />
          <span className="text-xs capitalize text-slate-600">{row.severity}</span>
        </div>
      ),
    },
    {
      key: 'confidence_score',
      header: 'Conf.',
      sortable: true,
      render: (row: Incident) => {
        const score = row.confidence_score || 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${score > 0.8 ? 'bg-green-500' : score > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                style={{ width: `${score * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">
              {Math.round(score * 100)}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'signal_count',
      header: 'Signals',
      render: (row: Incident) => (
        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
          {row.signal_count}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Update',
      sortable: true,
      render: (row: Incident) => (
        <span className="text-xs text-slate-500">
          {new Date(row.updated_at).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Incidents Log"
        description="Monitor and manage detected disaster incidents"
      >
        <button className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          Export CSV
        </button>
      </PageHeader>

      <DataTable
        toolbar={
          <TableToolbar
            onSearch={setSearch}
            searchValue={search}
            searchPlaceholder="Search by city or event type..."
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              <option value="">All Statuses</option>
              <option value="alert">Alert</option>
              <option value="monitor">Monitor</option>
              <option value="resolved">Resolved</option>
              <option value="suppress">Suppressed</option>
            </select>
          </TableToolbar>
        }
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        expandedContent={(row) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Linked Signals ({row.signal_count})</h4>
                <div className="bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-auto">
                  {row.incident_signals?.map((s: any) => (
                    <div key={s.signal_id} className="text-xs font-mono text-slate-600 py-0.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded cursor-pointer">
                      {s.signal_id}
                    </div>
                  ))}
                </div>
              </div>
              {row.metrics && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Metrics</h4>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reports</span>
                      <strong className="text-slate-700">{row.metrics.report_count}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reporters</span>
                      <strong className="text-slate-700">{row.metrics.unique_reporters}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Verifications</span>
                      <strong className="text-slate-700">{row.metrics.verification_count}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Media Items</span>
                      <strong className="text-slate-700">{row.metrics.media_count}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 pt-2">
              <Link
                href={`/admin/traces?incidentId=${row.id}`}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
              >
                View Reasoning Traces
              </Link>
              <Link
                href={`/admin/lifecycle?incidentId=${row.id}`}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors"
              >
                View Lifecycle History
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}
