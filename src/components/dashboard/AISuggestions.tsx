import React from 'react';

interface AISuggestionsProps {
    suggestions: {
        subjectName: string;
        message: string;
        type: 'warning' | 'info' | 'success';
    }[];
}

const AISuggestions: React.FC<AISuggestionsProps> = ({ suggestions }) => {
    return (
        <div className="mt-2 space-y-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {suggestions.length === 0 ? (
                <div className="text-center py-6 opacity-60">
                    <span className="text-2xl">🤖</span>
                    <p className="text-xs font-bold mt-2">Sem sugestões no momento.</p>
                    <p className="text-[9px]">Continue estudando para gerar dados.</p>
                </div>
            ) : (
                suggestions.map((s, i) => (
                    <div key={i} className={`p-3 rounded-2xl border ${s.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' :
                            s.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' :
                                'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                        }`}>
                        <p className={`text-xs font-black uppercase leading-none mb-1.5 ${s.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                s.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                    'text-blue-600 dark:text-blue-400'
                            }`}>{s.subjectName}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {s.message}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
};

export default AISuggestions;
