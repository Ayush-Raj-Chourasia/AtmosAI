'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import JsonViewer from '@/components/admin/JsonViewer';
import Link from 'next/link';

interface Evaluation {
  id: string;
  incident_id: string;
  model: string;
  confidence_score: number | null;
  consistency_assessment: string | null;
  recommended_action: string | null;
  explanation: string | null;
  raw_response: any;
  created_at: string;
}

export default function EvaluationsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-evaluations', page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API_BASE_URL}/admin/evaluations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch evaluations');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs w-24',
      render: (row: Evaluation) => (
        <span className="text-slate-500" title={row.id}>
          {row.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: Evaluation) => (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      render: (row: Evaluation) => (
        <span className="text-xs font-mono text-slate-600">{row.model}</span>
      ),
    },
    {
      key: 'confidence_score',
      header: 'Confidence',
      sortable: true,
      render: (row: Evaluation) => (
        <span className={`text-xs font-medium ${
          (row.confidence_score || 0) >= 0.8 ? 'text-green-600' :
          (row.confidence_score || 0) >= 0.5 ? 'text-amber-600' :
          'text-red-600'
        }`}>
          {row.confidence_score ? `${Math.round(row.confidence_score * 100)}%` : '-'}
        </span>
      ),
    },
    {
      key: 'consistency_assessment',
      header: 'Consistency',
      sortable: true,
      render: (row: Evaluation) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.consistency_assessment === 'strong' ? 'bg-green-100 text-green-700' :
          row.consistency_assessment === 'moderate' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {row.consistency_assessment || '-'}
        </span>
      ),
    },
    {
      key: 'recommended_action',
      header: 'Recommended',
      sortable: true,
      render: (row: Evaluation) => (
        <span className={`text-xs font-bold uppercase ${
          row.recommended_action === 'alert' ? 'text-red-600' :
          row.recommended_action === 'monitor' ? 'text-amber-600' :
          'text-slate-500'
        }`}>
          {row.recommended_action || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row: Evaluation) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Evaluations Log</h1>
        <p className="text-slate-500 mt-1">Historical AI decision records for incidents</p>
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
          <div className="space-y-4">
            {row.explanation && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Explanation</h4>
                <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                  {row.explanation}
                </p>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Raw Response</h4>
              <JsonViewer data={row.raw_response} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
