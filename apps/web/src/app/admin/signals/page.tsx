'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import DataTable from '@/components/admin/DataTable';
import JsonViewer from '@/components/admin/JsonViewer';
import PageHeader from '@/components/admin/PageHeader';
import TableToolbar from '@/components/admin/TableToolbar';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Signal {
  id: string;
  source: string;
  text: string | null;
  lat: number | null;
  lng: number | null;
  event_type: string | null;
  city_hint: string | null;
  status: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  happened_at: string | null;
  raw_payload: any;
}

export default function SignalsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-signals', page, sortBy, sortOrder, search, sourceFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        search,
        source: sourceFilter,
        status: statusFilter,
      });
      try {
        const res = await fetch(`${API_BASE_URL}/admin/signals?${params}`);
        if (res.ok) return res.json();
      } catch {}
      const fallback = await fetch(`/api/admin/signals?${params}`);
      return fallback.json();
    },
  });

  const columns = [
    {
      key: 'text',
      header: 'Signal Content & Integrity',
      className: 'min-w-[300px] max-w-xl',
      render: (row: Signal) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-900 font-medium line-clamp-2 leading-relaxed" title={row.text || ''}>
            {row.text || <span className="text-slate-400 italic">No text content available</span>}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {row.id}
            </span>
            {row.media_url && (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                Media Attached
              </span>
            )}
          </div>
          {row.raw_payload?.flag === 'MISINFORMATION_QUARANTINE' && (
            <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5 font-medium">
              <AlertTriangle size={13} className="shrink-0 text-red-600" />
              <span><strong>Skeptic AI Quarantine:</strong> {row.raw_payload.reason}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row: Signal) => {
        const s = row.source.toLowerCase();
        const badgeColor =
          s === 'imd' ? 'bg-blue-50 text-blue-700 border-blue-200' :
          s === 'citizen' || s === 'user_report' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          s === 'social_media' || s === 'tiktok_ai' ? 'bg-purple-50 text-purple-700 border-purple-200' :
          s === 'weather_api' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
          s === 'news' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-slate-50 text-slate-700 border-slate-200';

        const label =
          s === 'imd' ? 'IMD / Radar' :
          s === 'citizen' || s === 'user_report' ? 'Citizen Observer' :
          s === 'social_media' ? 'Social (#IMD)' :
          s === 'weather_api' ? 'AWS Sensor' :
          s === 'news' ? 'News Agency' :
          row.source.replace('_', ' ');

        return (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'event_type',
      header: 'Event Type',
      sortable: true,
      render: (row: Signal) => (
        row.event_type ? (
          <span className="text-xs font-medium capitalize text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
            {row.event_type.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )
      ),
    },
    {
      key: 'city_hint',
      header: 'Location',
      render: (row: Signal) => (
        <div className="flex flex-col">
          <span className="text-xs text-slate-700 font-medium">{row.city_hint || '-'}</span>
          {row.lat && row.lng && (
            <span className="text-[10px] font-mono text-slate-400">
              {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: Signal) => (
        row.status === 'VERIFIED' || row.status === 'processed' ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle size={12} />
            VERIFIED
          </span>
        ) : row.status === 'REJECTED' || row.raw_payload?.flag === 'MISINFORMATION_QUARANTINE' ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 w-fit">
            <AlertTriangle size={12} />
            QUARANTINED
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {row.status}
          </span>
        )
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row: Signal) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Signals Log"
        description="Raw multi-source meteorological signals ingested into centralized repository"
      >
        <button className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          Export Ingestion Log
        </button>
      </PageHeader>

      <DataTable
        toolbar={
          <TableToolbar
            onSearch={setSearch}
            searchValue={search}
            searchPlaceholder="Search content..."
          >
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              <option value="">All Sources</option>
              <option value="imd">IMD / Radar</option>
              <option value="citizen">Citizen Ground Observer</option>
              <option value="social_media">Social Media (#IMD)</option>
              <option value="weather_api">Weather APIs / AWS</option>
              <option value="news">News Agency</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified Signals</option>
              <option value="REJECTED">Quarantined / Misinformation</option>
              <option value="pending">Pending Ingestion</option>
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
            {row.text && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Full Text</h4>
                <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                  {row.text}
                </p>
              </div>
            )}
            {row.media_url && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Media</h4>
                <a href={row.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                  {row.media_type}: {row.media_url}
                </a>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Raw Payload & AI Analysis</h4>
              <JsonViewer data={row.raw_payload} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
