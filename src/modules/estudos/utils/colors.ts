
export const tailwindColors: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-blue-600': '#2563eb',
    'bg-sky-500': '#0284c7',
    'bg-purple-500': '#a855f7',
    'bg-purple-600': '#9333ea',
    'bg-emerald-500': '#10b981',
    'bg-emerald-600': '#059669',
    'bg-amber-500': '#f59e0b',
    'bg-amber-600': '#d97706',
    'bg-rose-500': '#f43f5e',
    'bg-rose-600': '#e11d48',
    'bg-indigo-500': '#6366f1',
    'bg-indigo-600': '#4f46e5',
    'bg-cyan-500': '#06b6d4',
    'bg-cyan-600': '#0891b2',
    'bg-orange-500': '#f97316',
    'bg-orange-600': '#ea580c',
    'bg-zinc-500': '#64748b',
    'bg-zinc-700': '#3f3f46',
    'bg-red-500': '#ef4444',
    'bg-red-600': '#dc2626',
    'bg-green-500': '#22c55e',
    'bg-green-600': '#16a34a',
    'bg-yellow-500': '#eab308',
    'bg-pink-500': '#ec4899',
    'bg-pink-600': '#db2777',
    'bg-teal-500': '#14b8a6',
    'bg-teal-600': '#0d9488',
    'bg-violet-500': '#8b5cf6',
    'bg-fuchsia-500': '#d946ef',
    'bg-lime-500': '#84cc16',
};

export interface PaletteColor {
    id: string;
    name: string;
    hex: string;
    category: string;
}

export const PRESET_PALETTE_COLORS: PaletteColor[] = [
    // Azuis & Índigos
    { id: '#3b82f6', name: 'Azul', hex: '#3b82f6', category: 'Azul' },
    { id: '#2563eb', name: 'Azul Real', hex: '#2563eb', category: 'Azul' },
    { id: '#1d4ed8', name: 'Azul Escuro', hex: '#1d4ed8', category: 'Azul' },
    { id: '#1e3a8a', name: 'Azul Marinho', hex: '#1e3a8a', category: 'Azul' },
    { id: '#0284c7', name: 'Céu', hex: '#0284c7', category: 'Azul' },
    { id: '#38bdf8', name: 'Azul Celeste', hex: '#38bdf8', category: 'Azul' },
    { id: '#6366f1', name: 'Índigo', hex: '#6366f1', category: 'Índigo' },
    { id: '#4f46e5', name: 'Índigo Profundo', hex: '#4f46e5', category: 'Índigo' },

    // Azul Água & Cianos (solicitado: azul água)
    { id: '#06b6d4', name: 'Azul Água', hex: '#06b6d4', category: 'Azul Água' },
    { id: '#22d3ee', name: 'Azul Água Claro', hex: '#22d3ee', category: 'Azul Água' },
    { id: '#67e8f9', name: 'Ciano Gelo', hex: '#67e8f9', category: 'Azul Água' },
    { id: '#14b8a6', name: 'Turquesa', hex: '#14b8a6', category: 'Azul Água' },
    { id: '#0d9488', name: 'Turquesa Escuro', hex: '#0d9488', category: 'Azul Água' },
    { id: '#2dd4bf', name: 'Verde Água', hex: '#2dd4bf', category: 'Azul Água' },
    { id: '#34d399', name: 'Menta', hex: '#34d399', category: 'Verde' },

    // Verdes & Amarelo Limão (solicitado: amarelo limão)
    { id: '#d9f99d', name: 'Amarelo Limão', hex: '#d9f99d', category: 'Limão' },
    { id: '#bef264', name: 'Limão Vibrante', hex: '#bef264', category: 'Limão' },
    { id: '#84cc16', name: 'Verde Limão', hex: '#84cc16', category: 'Limão' },
    { id: '#22c55e', name: 'Verde', hex: '#22c55e', category: 'Verde' },
    { id: '#16a34a', name: 'Verde Trevo', hex: '#16a34a', category: 'Verde' },
    { id: '#15803d', name: 'Verde Floresta', hex: '#15803d', category: 'Verde' },
    { id: '#10b981', name: 'Esmeralda', hex: '#10b981', category: 'Verde' },
    { id: '#059669', name: 'Esmeralda Escura', hex: '#059669', category: 'Verde' },
    { id: '#65a30d', name: 'Oliva', hex: '#65a30d', category: 'Verde' },

    // Marrom & Terrosos (solicitado: marrom)
    { id: '#451a03', name: 'Marrom Café', hex: '#451a03', category: 'Marrom' },
    { id: '#78350f', name: 'Marrom Chocolate', hex: '#78350f', category: 'Marrom' },
    { id: '#92400e', name: 'Marrom Castanho', hex: '#92400e', category: 'Marrom' },
    { id: '#b45309', name: 'Marrom Caramelo', hex: '#b45309', category: 'Marrom' },
    { id: '#c2410c', name: 'Terracota', hex: '#c2410c', category: 'Marrom' },
    { id: '#a16207', name: 'Canela', hex: '#a16207', category: 'Marrom' },

    // Amarelos, Âmbares & Laranjas
    { id: '#fef08a', name: 'Amarelo Claro', hex: '#fef08a', category: 'Amarelo' },
    { id: '#facc15', name: 'Amarelo Ouro', hex: '#facc15', category: 'Amarelo' },
    { id: '#eab308', name: 'Amarelo', hex: '#eab308', category: 'Amarelo' },
    { id: '#f59e0b', name: 'Âmbar', hex: '#f59e0b', category: 'Âmbar' },
    { id: '#d97706', name: 'Âmbar Dourado', hex: '#d97706', category: 'Âmbar' },
    { id: '#f97316', name: 'Laranja', hex: '#f97316', category: 'Laranja' },
    { id: '#ea580c', name: 'Laranja Fogo', hex: '#ea580c', category: 'Laranja' },

    // Roxos, Violetas & Rosas
    { id: '#8b5cf6', name: 'Violeta', hex: '#8b5cf6', category: 'Roxo' },
    { id: '#a855f7', name: 'Púrpura', hex: '#a855f7', category: 'Roxo' },
    { id: '#9333ea', name: 'Roxo Intenso', hex: '#9333ea', category: 'Roxo' },
    { id: '#a78bfa', name: 'Lavanda', hex: '#a78bfa', category: 'Roxo' },
    { id: '#d946ef', name: 'Fúcsia', hex: '#d946ef', category: 'Roxo' },
    { id: '#c026d3', name: 'Fúcsia Escuro', hex: '#c026d3', category: 'Roxo' },
    { id: '#ec4899', name: 'Pink', hex: '#ec4899', category: 'Rosa' },
    { id: '#db2777', name: 'Magenta', hex: '#db2777', category: 'Rosa' },

    // Vermelhos & Vinhos
    { id: '#881337', name: 'Vinho / Bordô', hex: '#881337', category: 'Vermelho' },
    { id: '#e11d48', name: 'Carmim', hex: '#e11d48', category: 'Vermelho' },
    { id: '#ef4444', name: 'Vermelho', hex: '#ef4444', category: 'Vermelho' },
    { id: '#dc2626', name: 'Escarlate', hex: '#dc2626', category: 'Vermelho' },
    { id: '#f43f5e', name: 'Rose', hex: '#f43f5e', category: 'Vermelho' },
    { id: '#fb7185', name: 'Coral', hex: '#fb7185', category: 'Vermelho' },

    // Brancos, Neutros & Escuros (solicitado: branco)
    { id: '#ffffff', name: 'Branco', hex: '#ffffff', category: 'Neutro' },
    { id: '#f8fafc', name: 'Cinza Gelo', hex: '#f8fafc', category: 'Neutro' },
    { id: '#e2e8f0', name: 'Prata', hex: '#e2e8f0', category: 'Neutro' },
    { id: '#64748b', name: 'Slate', hex: '#64748b', category: 'Neutro' },
    { id: '#475569', name: 'Slate Escuro', hex: '#475569', category: 'Neutro' },
    { id: '#71717a', name: 'Zinco', hex: '#71717a', category: 'Neutro' },
    { id: '#3f3f46', name: 'Grafite', hex: '#3f3f46', category: 'Neutro' },
    { id: '#18181b', name: 'Preto Carvão', hex: '#18181b', category: 'Neutro' },
    { id: '#000000', name: 'Preto', hex: '#000000', category: 'Neutro' },
];

export const getColorHex = (colorIdentifier: string): string => {
    if (!colorIdentifier) return '#3b82f6'; // Default blue
    if (colorIdentifier.startsWith('#')) return colorIdentifier;
    return tailwindColors[colorIdentifier] || '#3b82f6';
};

// Helper to determine if text should be dark or light
export const getContrastTextClass = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 135) ? 'text-zinc-900' : 'text-white';
};

export const getBadgeStyle = (colorIdentifier: string) => {
    let hex = colorIdentifier;
    // Resolve tailwind class to hex for calculation
    if (!colorIdentifier.startsWith('#')) {
        hex = tailwindColors[colorIdentifier] || '#64748b'; // Default to zinc-500 if unknown, or safe fallback
    }

    const textClass = getContrastTextClass(hex);

    // Borda de contraste para cores muito claras (como branco, gelo ou amarelo limão claro)
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const isVeryLight = yiq >= 205;
    const borderClass = isVeryLight ? 'border border-zinc-300 dark:border-zinc-600' : '';

    if (colorIdentifier.startsWith('#')) {
        return { style: { backgroundColor: colorIdentifier }, className: `${textClass} ${borderClass}`.trim() };
    }
    return { style: {}, className: `${colorIdentifier} ${textClass} ${borderClass}`.trim() };
};
