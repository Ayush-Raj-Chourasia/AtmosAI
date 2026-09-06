'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isLoading?: boolean;
  expandedContent?: (row: T) => ReactNode;
  getRowId: (row: T) => string;
  toolbar?: ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  isLoading,
  expandedContent,
  getRowId,
  toolbar,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / limit);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Optional Toolbar */}
      {toolbar}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {expandedContent && <th className="w-10 px-4 py-3"></th>}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 ${
                    col.sortable ? 'cursor-pointer hover:text-slate-700' : ''
                  } ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortBy === col.key && (
                      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (expandedContent ? 1 : 0)}
                  className="text-center py-12 text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (expandedContent ? 1 : 0)}
                  className="text-center py-12 text-slate-400"
                >
                  No data found
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const isExpanded = expandedRows.has(rowId);

                return (
                  <>
                    <tr
                      key={rowId}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      {expandedContent && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRow(rowId)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                          {col.render ? col.render(row) : (row as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                    {expandedContent && isExpanded && (
                      <tr key={`${rowId}-expanded`} className="bg-slate-50">
                        <td colSpan={columns.length + 1} className="px-6 py-4">
                          {expandedContent(row)}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-500">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-slate-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
