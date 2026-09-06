import clsx from 'clsx';
import { ButtonHTMLAttributes, HTMLAttributes } from 'react';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)]", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ className, variant = 'default', children, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'outline' | 'verified' | 'alert' }) {
    const variants = {
        default: "bg-slate-100 text-slate-600",
        outline: "border border-slate-200 text-slate-500",
        verified: "bg-slate-100 text-slate-600",
        alert: "bg-amber-100 text-amber-600"
    };
    
    return (
        <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", variants[variant], className)} {...props}>
            {children}
        </span>
    );
}

export function Button({ className, variant = 'primary', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
    return (
        <button 
            className={clsx(
                "transition-colors rounded-lg font-medium",
                variant === 'primary' ? "bg-slate-900 text-white hover:bg-slate-800 px-4 py-2" : "text-slate-400 hover:text-slate-600",
                className
            )} 
            {...props}
        >
            {children}
        </button>
    );
}
