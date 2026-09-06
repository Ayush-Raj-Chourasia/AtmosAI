'use client';

import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import JsonViewer from '@/components/admin/JsonViewer';
import PageHeader from '@/components/admin/PageHeader';
import Link from 'next/link';

interface Trace {
  id: string;
  session_id: string;
  incident_id: string | null;
  step: string;
  input_context: any;
  output_result: any;
  model_used: string | null;
  created_at: string;
}

function TracesContent() {
  const searchParams = useSearchParams();
  const incidentIdFilter = searchParams.get('incidentId');

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 100;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-traces', page, sortBy, sortOrder, incidentIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (incidentIdFilter) params.set('incidentId', incidentIdFilter);
      const res = await fetch(`${API_BASE_URL}/admin/traces?${params}`);
      if (!res.ok) throw new Error('Failed to fetch traces');
      return res.json();
    },
  });

  const columns = [
    {
      key: 'session_id',
      header: 'Session',
      className: 'font-mono text-xs w-28',
      render: (row: Trace) => (
        <span className="text-purple-600" title={row.session_id}>
          {row.session_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'step',
      header: 'Step',
      sortable: true,
      render: (row: Trace) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          row.step === 'observer' ? 'bg-blue-100 text-blue-700' :
          row.step === 'classifier' ? 'bg-green-100 text-green-700' :
          row.step === 'skeptic' ? 'bg-amber-100 text-amber-700' :
          row.step === 'synthesizer' ? 'bg-purple-100 text-purple-700' :
          row.step === 'action' ? 'bg-red-100 text-red-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.step}
        </span>
      ),
    },
    {
      key: 'incident_id',
      header: 'Incident',
      render: (row: Trace) => row.incident_id ? (
        <Link href={`/incidents/${row.incident_id}`} className="text-xs text-blue-600 hover:underline font-mono">
          {row.incident_id.slice(0, 8)}...
        </Link>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      ),
    },
    {
      key: 'model_used',
      header: 'Model',
      render: (row: Trace) => (
        <span className="text-xs text-slate-600 font-mono">
          {row.model_used || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (row: Trace) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="AI Traces Log"
        description="Agent reasoning steps organized by session"
      >
        {incidentIdFilter && (
          <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <span>Filtered by Incident: {incidentIdFilter.slice(0, 8)}...</span>
            <Link href="/admin/traces" className="ml-1 hover:text-purple-900 border-b border-purple-300">Clear</Link>
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
        expandedContent={(row) => (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Input Context</h4>
              <JsonViewer data={row.input_context} maxHeight="250px" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Output Result</h4>
              <JsonViewer data={row.output_result} maxHeight="250px" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default function TracesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <TracesContent />
    </Suspense>
  );
}
