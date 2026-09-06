'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import JsonViewer from '@/components/admin/JsonViewer';

interface TikTokPost {
  id: string;
  tiktok_id: string;
  author: string | null;
  text: string | null;
  raw_data: any;
  created_at: string;
}

export default function TikTokPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tiktok', page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API_BASE_URL}/admin/tiktok-posts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch TikTok posts');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: TikTokPost) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'tiktok_id',
      header: 'TikTok ID',
      render: (row: TikTokPost) => (
        <span className="text-xs font-mono text-purple-600">{row.tiktok_id}</span>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      render: (row: TikTokPost) => (
        <span className="text-sm text-slate-700">{row.author || '-'}</span>
      ),
    },
    {
      key: 'text',
      header: 'Text',
      className: 'max-w-md',
      render: (row: TikTokPost) => (
        <span className="text-xs text-slate-600 line-clamp-2" title={row.text || ''}>
          {row.text || <span className="text-slate-400 italic">No text</span>}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Ingested',
      sortable: true,
      render: (row: TikTokPost) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">TikTok Posts Log</h1>
        <p className="text-slate-500 mt-1">Raw TikTok ingestion data (deduplication log)</p>
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
        expandedContent={(row) => (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Raw Data</h4>
            <JsonViewer data={row.raw_data} />
          </div>
        )}
      />
    </div>
  );
}
