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
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/signals', label: 'Signals', icon: Radio },
  { href: '/admin/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/admin/traces', label: 'AI Traces', icon: Brain },
  { href: '/admin/evaluations', label: 'AI Evaluations', icon: Sparkles },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/verifications', label: 'Verifications', icon: CheckCircle2 },
  { href: '/admin/lifecycle', label: 'Lifecycle', icon: History },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/tiktok', label: 'TikTok Posts', icon: Video },
  { href: '/admin/health', label: 'System Health', icon: Activity },
];

// Complete file content replacement needed to handle state properly? 
// No, I can replace the component body.
export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white min-h-screen flex flex-col transition-all duration-300 relative`}>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-slate-800 text-slate-400 p-1 rounded-full border border-slate-700 hover:text-white transition-colors"
      >
        <ChevronLeft size={14} className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="min-w-[32px] min-h-[32px] w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">DP</span>
          </div>
          <div className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <h1 className="font-semibold text-sm whitespace-nowrap">Disaster Pulse</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider whitespace-nowrap">Admin Dashboard</p>
          </div>
        </div>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
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
          href="/"
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
