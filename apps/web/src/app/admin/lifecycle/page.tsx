'use client';

import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import PageHeader from '@/components/admin/PageHeader';
import Link from 'next/link';

interface LifecycleEvent {
  id: string;
  incident_id: string;
  from_status: string | null;
  to_status: string;
  triggered_by: 'ai' | 'system' | 'admin';
  changed_by: string;
  reason: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  monitor: 'bg-amber-100 text-amber-700',
  alert: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  suppress: 'bg-slate-100 text-slate-700',
};

function LifecycleContent() {
  const searchParams = useSearchParams();
  const incidentIdFilter = searchParams.get('incidentId');

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lifecycle', page, sortBy, sortOrder, incidentIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (incidentIdFilter) params.set('incidentId', incidentIdFilter);
      const res = await fetch(`${API_BASE_URL}/admin/lifecycle?${params}`);
      if (!res.ok) throw new Error('Failed to fetch lifecycle');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: LifecycleEvent) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: LifecycleEvent) => (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'from_status',
      header: 'From',
      render: (row: LifecycleEvent) => row.from_status ? (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[row.from_status] || 'bg-slate-100 text-slate-700'}`}>
          {row.from_status}
        </span>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      ),
    },
    {
      key: 'arrow',
      header: '',
      className: 'w-8',
      render: () => <span className="text-slate-400">→</span>,
    },
    {
      key: 'to_status',
      header: 'To',
      render: (row: LifecycleEvent) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[row.to_status] || 'bg-slate-100 text-slate-700'}`}>
          {row.to_status}
        </span>
      ),
    },
    {
      key: 'triggered_by',
      header: 'Triggered By',
      sortable: true,
      render: (row: LifecycleEvent) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.triggered_by === 'ai' ? 'bg-purple-100 text-purple-700' :
          row.triggered_by === 'admin' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.triggered_by}
        </span>
      ),
    },
    {
      key: 'changed_by',
      header: 'Changed By',
      render: (row: LifecycleEvent) => (
        <span className="text-xs text-slate-600">{row.changed_by}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      className: 'max-w-xs',
      render: (row: LifecycleEvent) => (
        <span className="text-xs text-slate-600 line-clamp-2" title={row.reason || ''}>
          {row.reason || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (row: LifecycleEvent) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Lifecycle Log"
        description="Incident status transition audit trail"
      >
        {incidentIdFilter && (
          <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <span>Filtered by Incident: {incidentIdFilter.slice(0, 8)}...</span>
            <Link href="/admin/lifecycle" className="ml-1 hover:text-blue-900 border-b border-blue-300">Clear</Link>
          </div>
        )}
      </PageHeader>

      <DataTable
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
      />
    </div>
  );
}

export default function LifecyclePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <LifecycleContent />
    </Suspense>
  );
}
