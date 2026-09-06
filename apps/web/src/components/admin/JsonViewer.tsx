'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  collapsed?: boolean;
  maxHeight?: string;
}

export default function JsonViewer({ data, collapsed = true, maxHeight = '300px' }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return <span className="text-slate-400 text-xs">null</span>;

  return (
    <div className="relative font-mono text-xs">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-[10px] uppercase tracking-wide font-semibold">
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
        </button>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          <span className="text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {isExpanded && (
        <pre
          className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto text-[11px] leading-relaxed"
          style={{ maxHeight }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
