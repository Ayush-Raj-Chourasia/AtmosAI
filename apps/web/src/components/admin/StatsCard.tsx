'use client';

import { LucideIcon } from 'lucide-react';

import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
  href?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatsCard({ title, value, icon: Icon, trend, color = 'blue', href }: StatsCardProps) {
  const Content = (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all ${href ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
          {trend && (
            <p className="text-xs text-slate-400 mt-1">
              <span className={trend.value >= 0 ? 'text-green-500' : 'text-red-500'}>
                {trend.value >= 0 ? '+' : ''}{trend.value}
              </span>
              {' '}{trend.label}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{Content}</Link>;
  }

  return Content;
}
