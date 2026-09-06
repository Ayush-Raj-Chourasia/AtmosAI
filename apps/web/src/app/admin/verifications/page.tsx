'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import Link from 'next/link';

interface Verification {
  id: string;
  incident_id: string;
  user_id: string;
  type: 'confirm' | 'still_happening' | 'false' | 'resolved';
  created_at: string;
  users?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export default function VerificationsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verifications', page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API_BASE_URL}/admin/verifications?${params}`);
      if (!res.ok) throw new Error('Failed to fetch verifications');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: Verification) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: Verification) => (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row: Verification) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
            {row.users?.avatar_url ? (
              <img src={row.users.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">
                {(row.users?.name || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-700">{row.users?.name || row.user_id.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (row: Verification) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.type === 'confirm' ? 'bg-green-100 text-green-700' :
          row.type === 'still_happening' ? 'bg-amber-100 text-amber-700' :
          row.type === 'false' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {row.type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row: Verification) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Verifications Log</h1>
        <p className="text-slate-500 mt-1">User feedback and verification history</p>
      </div>

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
