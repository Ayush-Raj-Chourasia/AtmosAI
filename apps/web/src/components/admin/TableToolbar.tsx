'use client';

import { Search, Filter } from 'lucide-react';
import { ReactNode } from 'react';

interface TableToolbarProps {
  onSearch?: (term: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  children?: ReactNode; // Slot for Filters
}

export default function TableToolbar({ 
  onSearch, 
  searchValue, 
  searchPlaceholder = "Search...", 
  children 
}: TableToolbarProps) {
  return (
    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      {onSearch && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue || ''}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      )}

      {/* Filters Slot */}
      {children && (
        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          <Filter size={16} className="text-slate-400 mr-1 sm:block hidden" />
          {children}
        </div>
      )}
    </div>
  );
}
