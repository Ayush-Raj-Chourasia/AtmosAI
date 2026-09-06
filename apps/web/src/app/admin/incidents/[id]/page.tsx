'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import PageHeader from '@/components/admin/PageHeader';
import DataTable from '@/components/admin/DataTable';
import JsonViewer from '@/components/admin/JsonViewer';
import { Activity, Shield, Eye } from 'lucide-react';
import Link from 'next/link';

// --- Types ---
interface IncidentDetail {
  id: string;
  city: string;
  event_type: string;
  severity: string;
  status: string;
  confidence_score: number;
  summary: string;
  created_at: string;
  updated_at: string;
  signal_count: number;
  cached_reasoning: any;
  lifecycle: any[];
  signals?: any[];
}

// --- Components ---

function OverviewParams({ incident }: { incident: IncidentDetail }) {
  const meta = [
    { label: 'Created', value: new Date(incident.created_at).toLocaleString() },
    { label: 'Last Updated', value: new Date(incident.updated_at).toLocaleString() },
    { label: 'Event Type', value: incident.event_type, capitalize: true },
    { label: 'City', value: incident.city },
    { label: 'Source Signal Count', value: incident.signal_count },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Metadata</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
        {meta.map((m) => (
          <div key={m.label}>
            <div className="text-xs text-slate-500 mb-1">{m.label}</div>
            <div className={`text-sm font-medium text-slate-900 ${m.capitalize ? 'capitalize' : ''}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCard({ incident }: { incident: IncidentDetail }) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'alert': return 'bg-red-50 text-red-700 border-red-100';
      case 'monitor': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Current State</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(incident.status)} uppercase`}>
          {incident.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Shield size={12} /> Severity
            </div>
            <div className={`text-lg font-bold capitalize px-2 py-0.5 rounded inline-block ${getSeverityColor(incident.severity)}`}>
                {incident.severity}
            </div>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
             <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Activity size={12} /> Confidence
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900">{Math.round((incident.confidence_score || 0) * 100)}%</span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full mb-1.5 overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${incident.confidence_score > 0.7 ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${(incident.confidence_score || 0) * 100}%` }}
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- Tabs Components ---

function TracesTab({ incidentId }: { incidentId: string }) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-traces', incidentId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        incidentId,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      const res = await fetch(`${API_BASE_URL}/admin/traces?${params}`);
      if (!res.ok) throw new Error('Failed to fetch traces');
      return res.json();
    },
  });

  return (
    <DataTable
      columns={[
        { key: 'session_id', header: 'Session', className: 'w-24 font-mono text-xs', render: (row: any) => <span className="text-purple-600" title={row.session_id}>{row.session_id.slice(0,8)}...</span> },
        { key: 'step', header: 'Step', render: (row: any) => <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize bg-slate-100 text-slate-700`}>{row.step}</span> },
        { key: 'model_used', header: 'Model', render: (row: any) => <span className="text-xs text-slate-600 font-mono">{row.model_used || '-'}</span> },
        { key: 'created_at', header: 'Time', render: (row: any) => <span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</span> },
      ]}
      data={data?.data || []}
      total={data?.total || 0}
      page={page}
      limit={limit}
      onPageChange={setPage}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      expandedContent={(row) => (
        <div className="grid grid-cols-2 gap-4">
          <div>
             <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Input</h4>
             <JsonViewer data={row.input_context} maxHeight="200px" />
          </div>
          <div>
             <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Output</h4>
             <JsonViewer data={row.output_result} maxHeight="200px" />
          </div>
        </div>
      )}
    />
  );
}

function LifecycleTab({ incidentId }: { incidentId: string }) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lifecycle', incidentId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        incidentId,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      const res = await fetch(`${API_BASE_URL}/admin/lifecycle?${params}`);
      if (!res.ok) throw new Error('Failed to fetch lifecycle');
      return res.json();
    },
  });

  return (
    <DataTable
      columns={[
         { key: 'from_status', header: 'From', render: (row: any) => <span className="text-xs text-slate-500">{row.from_status || '-'}</span> },
         { key: 'arrow', header: '', className: 'w-8', render: () => <span className="text-slate-300">→</span> },
         { key: 'to_status', header: 'To', render: (row: any) => <span className="text-xs font-semibold text-slate-700">{row.to_status}</span> },
         { key: 'triggered_by', header: 'Trigger', render: (row: any) => <span className={`text-xs px-2 py-0.5 rounded-full ${row.triggered_by === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{row.triggered_by}</span> },
         { key: 'reason', header: 'Reason', className: 'max-w-md', render: (row: any) => <span className="text-xs text-slate-600 line-clamp-1" title={row.reason}>{row.reason || '-'}</span> },
         { key: 'created_at', header: 'Time', render: (row: any) => <span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</span> },
      ]}
      data={data?.data || []}
      total={data?.total || 0}
      page={page}
      limit={limit}
      onPageChange={setPage}
      isLoading={isLoading}
      getRowId={(row) => row.id}
    />
  );
}

function IncidentContent() {
  const params = useParams();
  const incidentId = params.id as string;
  const [activeTab, setActiveTab] = useState<'signals' | 'traces' | 'lifecycle' | 'json'>('signals');

  const { data: incident, isLoading } = useQuery({
    queryKey: ['admin-incident', incidentId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`);
      if (!res.ok) throw new Error('Failed to fetch incident');
      return res.json();
    },
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading incident...</div>;
  if (!incident) return <div className="p-8 text-center text-red-500">Incident not found</div>;

  const signals = incident.signals || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={`Incident: ${incident.city}`}
        description={`ID: ${incidentId}`}
      >
        <div className="flex gap-2">
             <Link 
                href={`/incidents/${incidentId}`}
                target="_blank"
                className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
                <Eye size={16} /> Public View
            </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">AI Summary</h3>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {incident.summary || 'No summary available.'}
                </p>
           </div>
           <OverviewParams incident={incident} />
        </div>
        <div className="lg:col-span-1">
            <StatusCard incident={incident} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="border-b border-slate-100 flex items-center px-2">
          {['signals', 'traces', 'lifecycle', 'json'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="p-6">
            {activeTab === 'signals' && (
                <DataTable
                    columns={[
                        { key: 'id', header: 'ID', className: 'w-24 font-mono text-xs', render: (row: any) => <span className="text-slate-500" title={row.id}>{row.id.slice(0,8)}...</span> },
                        { key: 'source', header: 'Source', render: (row: any) => <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize border ${row.source === 'user_report' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>{row.source.replace('_', ' ')}</span> },
                        { key: 'text', header: 'Content', className: 'max-w-md', render: (row: any) => <span className="text-sm text-slate-700 line-clamp-2" title={row.text}>{row.text}</span> },
                        { key: 'created_at', header: 'Time', render: (row: any) => <span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</span> },
                        { key: 'media', header: 'Media', render: (row: any) => row.media_url ? <a href={row.media_url} target="_blank" className="text-blue-600 text-xs underline">View Media</a> : <span className="text-slate-400 text-xs">-</span> }
                    ]}
                    data={signals}
                    total={signals.length}
                    page={1}
                    limit={100} 
                    onPageChange={() => {}}
                    getRowId={(row) => row.id}
                    expandedContent={(row) => (
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Raw Payload</h4>
                            <JsonViewer data={row} maxHeight="300px" />
                        </div>
                    )}
                />
            )}
            
            {activeTab === 'traces' && <TracesTab incidentId={incidentId} />}
            
            {activeTab === 'lifecycle' && <LifecycleTab incidentId={incidentId} />}
            
            {activeTab === 'json' && <JsonViewer data={incident} maxHeight="600px" />}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
    return <IncidentContent />;
}
