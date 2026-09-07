'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  AlertTriangle,
  Brain,
  Sparkles,
  Users,
  CheckCircle2,
  History,
  Bell,
  Video,
  Activity,
  ChevronLeft,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/signals', label: 'Signal Ingestion', icon: Radio },
  { href: '/admin/incidents', label: 'Weather Incidents', icon: AlertTriangle },
  { href: '/admin/traces', label: 'AI Reasoning Traces', icon: Brain },
  { href: '/admin/evaluations', label: 'Model Benchmarks', icon: Sparkles },
  { href: '/admin/verifications', label: 'Verification Logs', icon: CheckCircle2 },
  { href: '/admin/lifecycle', label: 'Temporal Decay', icon: History },
  { href: '/admin/notifications', label: 'Broadcast Alerts', icon: Bell },
  { href: '/admin/users', label: 'Observers & Nodes', icon: Users },
  { href: '/admin/health', label: 'System Health', icon: Activity },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#12141A] text-[#F7F4EC] min-h-screen flex flex-col transition-all duration-300 relative border-r border-white/10`}>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-[#1E2430] text-[#B7BAC2] p-1 rounded-full border border-white/20 hover:text-white transition-colors z-20"
      >
        <ChevronLeft size={14} className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 overflow-hidden group">
          <div className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#FF9166] flex items-center justify-center shrink-0 shadow-md">
            <span className="text-white font-bold text-xs tracking-wider">AA</span>
          </div>
          <div className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <h1 className="font-display font-semibold text-sm whitespace-nowrap text-[#F7F4EC]">AtmosAI</h1>
            <p className="text-[10px] text-[#8b8e97] uppercase tracking-wider whitespace-nowrap font-mono">Operations Console</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#FF5A1F] text-white font-semibold shadow-md shadow-[#FF5A1F]/20'
                  : 'text-[#B7BAC2] hover:bg-white/10 hover:text-[#F7F4EC]'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer - Back to App */}
      <div className="p-3 border-t border-slate-800">
        <Link
          href="/dashboard"
          title={isCollapsed ? "Back to App" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
          <ChevronLeft size={18} className="shrink-0" />
          <span className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            Back to App
          </span>
        </Link>
      </div>
    </aside>
  );
}
