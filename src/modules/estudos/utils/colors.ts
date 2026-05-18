
export const tailwindColors: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-purple-500': '#a855f7',
    'bg-emerald-500': '#10b981',
    'bg-amber-500': '#f59e0b',
    'bg-rose-500': '#f43f5e',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-orange-500': '#f97316',
    'bg-zinc-500': '#64748b',
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

// Helper to determine if text should be dark or light
const getContrastTextClass = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'text-zinc-900' : 'text-white';
};

export const getBadgeStyle = (colorIdentifier: string) => {
    let hex = colorIdentifier;
    // Resolve tailwind class to hex for calculation
    if (!colorIdentifier.startsWith('#')) {
        hex = tailwindColors[colorIdentifier] || '#64748b'; // Default to zinc-500 if unknown, or safe fallback
    }

    const textClass = getContrastTextClass(hex);

    if (colorIdentifier.startsWith('#')) {
        return { style: { backgroundColor: colorIdentifier }, className: textClass };
    }
    return { style: {}, className: `${colorIdentifier} ${textClass}` };
};
