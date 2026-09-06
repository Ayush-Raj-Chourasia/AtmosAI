'use client';

import Link from 'next/link';
import { Home, Map as MapIcon, Bell, User, BookOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function BottomNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { label: t('navigation.home'), icon: Home, path: '/' },
        { label: t('navigation.alerts'), icon: Bell, path: '/alerts' },
        { label: t('navigation.map'), icon: MapIcon, path: '/map' },
        { label: t('navigation.guides'), icon: BookOpen, path: '/guides' },
        { label: t('navigation.profile'), icon: User, path: '/profile' }
    ];

    return (
        <nav className="w-full h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
            {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                    <Link
                        key={item.label}
                        href={item.path}
                        className="flex flex-col items-center gap-1 min-w-[3rem]"
                    >
                        <item.icon
                            size={24}
                            className={`transition-colors duration-200 ${active ? 'text-slate-900 stroke-[2.5px]' : 'text-slate-400 stroke-2 group-hover:text-slate-600'
                                }`}
                        />
                        <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-slate-900' : 'text-slate-400'
                            }`}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
