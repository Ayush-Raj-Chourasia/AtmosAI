'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import Link from 'next/link';

type Tab = 'outbox' | 'audit' | 'states';

interface OutboxItem {
  id: string;
  user_id: string;
  incident_id: string;
  user_place_id: string;
  notification_type: string;
  created_at: string;
  expires_at: string;
}

interface AuditItem {
  day: string;
  incident_id: string;
  notified_user_count: number;
}

interface StateItem {
  user_id: string;
  incident_id: string;
  user_place_id: string;
  last_notified_status: string | null;
  last_notified_at: string | null;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('outbox');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications', tab, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        tab,
      });
      const res = await fetch(`${API_BASE_URL}/admin/notifications?${params}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
  });

  const outboxColumns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: OutboxItem) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: OutboxItem) => (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'user_id',
      header: 'User',
      render: (row: OutboxItem) => (
        <span className="text-xs font-mono text-slate-500">{row.user_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'notification_type',
      header: 'Type',
      render: (row: OutboxItem) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.notification_type === 'incident_alert' ? 'bg-red-100 text-red-700' :
          'bg-green-100 text-green-700'
        }`}>
          {row.notification_type.replace('incident_', '')}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row: OutboxItem) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'expires_at',
      header: 'Expires',
      render: (row: OutboxItem) => (
        <span className="text-xs text-slate-500">
          {new Date(row.expires_at).toLocaleString()}
        </span>
      ),
    },
  ];

  const auditColumns = [
    {
      key: 'day',
      header: 'Day',
      render: (row: AuditItem) => (
        <span className="text-sm font-medium text-slate-700">{row.day}</span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: AuditItem) => (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'notified_user_count',
      header: 'Users Notified',
      render: (row: AuditItem) => (
        <span className="text-sm font-semibold text-slate-900">{row.notified_user_count}</span>
      ),
    },
  ];

  const statesColumns = [
    {
      key: 'user_id',
      header: 'User',
      render: (row: StateItem) => (
        <span className="text-xs font-mono text-slate-500">{row.user_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: StateItem) => (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'user_place_id',
      header: 'Place',
      render: (row: StateItem) => (
        <span className="text-xs font-mono text-slate-500">{row.user_place_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'last_notified_status',
      header: 'Last Status',
      render: (row: StateItem) => row.last_notified_status ? (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.last_notified_status === 'alert' ? 'bg-red-100 text-red-700' :
          row.last_notified_status === 'monitor' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}>
          {row.last_notified_status}
        </span>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      ),
    },
    {
      key: 'last_notified_at',
      header: 'Last Notified',
      render: (row: StateItem) => (
        <span className="text-xs text-slate-500">
          {row.last_notified_at ? new Date(row.last_notified_at).toLocaleString() : '-'}
        </span>
      ),
    },
  ];

  const columns = tab === 'outbox' ? outboxColumns : tab === 'audit' ? auditColumns : statesColumns;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notifications Log</h1>
        <p className="text-slate-500 mt-1">Notification queue and history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['outbox', 'audit', 'states'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t === 'outbox' ? 'Outbox (Pending)' : t === 'audit' ? 'Audit (Sent)' : 'User States'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns as any}
        data={data?.data || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        getRowId={(row: any) => row.id || `${row.user_id}-${row.incident_id}-${row.day || row.user_place_id}`}
      />
    </div>
  );
}
