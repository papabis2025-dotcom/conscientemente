
export const tailwindColors: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-purple-500': '#a855f7',
    'bg-emerald-500': '#10b981',
    'bg-amber-500': '#f59e0b',
    'bg-rose-500': '#f43f5e',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-orange-500': '#f97316',
    'bg-slate-500': '#64748b',
    'bg-red-500': '#ef4444',
    'bg-green-500': '#22c55e',
    'bg-yellow-500': '#eab308',
    'bg-pink-500': '#ec4899',
    'bg-teal-500': '#14b8a6',
};

export const getColorHex = (colorIdentifier: string): string => {
    if (!colorIdentifier) return '#3b82f6'; // Default blue
    if (colorIdentifier.startsWith('#')) return colorIdentifier;
    return tailwindColors[colorIdentifier] || '#3b82f6';
};

export const getBadgeStyle = (colorIdentifier: string) => {
    if (colorIdentifier.startsWith('#')) {
        return { style: { backgroundColor: colorIdentifier }, className: '' };
    }
    return { style: {}, className: colorIdentifier };
};
