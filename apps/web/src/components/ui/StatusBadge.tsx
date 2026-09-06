import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'alert': return 'bg-red-100 text-red-700';
            case 'monitor': return 'bg-amber-100 text-amber-700';
            case 'resolved': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider",
            getStatusColor(status),
            className
        )}>
            {status}
        </span>
    );
}
