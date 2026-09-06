'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import PageHeader from '@/components/admin/PageHeader';

interface User {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  trust_score: number;
  auth_provider?: string;
  created_at: string;
  user_places?: { id: string; label: string }[];
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API_BASE_URL}/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: User) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'avatar',
      header: '',
      className: 'w-10',
      render: (row: User) => (
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
              {(row.name || row.email || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row: User) => (
        <span className="text-sm font-medium text-slate-900">{row.name || '-'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: User) => (
        <span className="text-xs text-slate-600">{row.email || '-'}</span>
      ),
    },
    {
      key: 'trust_score',
      header: 'Trust Score',
      sortable: true,
      render: (row: User) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                row.trust_score >= 0.8 ? 'bg-green-500' :
                row.trust_score >= 0.5 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${row.trust_score * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium">{(row.trust_score * 100).toFixed(0)}%</span>
        </div>
      ),
    },
    {
      key: 'auth_provider',
      header: 'Auth',
      render: (row: User) => (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
          {row.auth_provider || 'unknown'}
        </span>
      ),
    },
    {
      key: 'places',
      header: 'Places',
      render: (row: User) => (
        <span className="text-xs text-slate-600">{row.user_places?.length || 0}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      render: (row: User) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Users Log"
        description="User accounts with trust scores and places"
      />

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
        expandedContent={(row) => (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">User Places ({row.user_places?.length || 0})</h4>
              {row.user_places && row.user_places.length > 0 ? (
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  {row.user_places.map((place) => (
                    <div key={place.id} className="text-sm text-slate-700">
                      • {place.label}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No places configured</p>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
