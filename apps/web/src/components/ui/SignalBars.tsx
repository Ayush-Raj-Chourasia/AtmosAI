interface SignalBarsProps {
    confidence: number;
}

export default function SignalBars({ confidence }: SignalBarsProps) {
    const percentage = Math.round(confidence * 100);
    const level = confidence > 0.7 ? 3 : confidence > 0.4 ? 2 : 1;

    // Dynamic color based on confidence level
    const getColor = (barIndex: number) => {
        if (barIndex > level) return 'bg-slate-200';
        if (level === 3) return 'bg-emerald-500'; // High - Green
        if (level === 2) return 'bg-amber-500';   // Med - Yellow/Amber
        return 'bg-red-500';                      // Low - Red
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-4">
                {[1, 2, 3].map((bar) => (
                    <div
                        key={bar}
                        className={`w-1 rounded-sm ${getColor(bar)}`}
                        style={{ height: `${bar * 33}%` }}
                    />
                ))}
            </div>
            <span className={`text-xs font-bold ${level === 3 ? 'text-emerald-600' : level === 2 ? 'text-amber-600' : 'text-red-600'}`}>
                {percentage}%
            </span>
        </div>
    );
}
