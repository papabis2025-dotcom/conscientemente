import React from 'react';
import { Bot, Lightbulb } from 'lucide-react';

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
                <div className="text-center py-6 opacity-60 flex flex-col items-center">
                    <Bot size={32} className="text-zinc-400 mb-2" />
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">Sem sugestões no momento.</p>
                    <p className="text-[10px] text-zinc-400">Continue estudando para gerar dados.</p>
                </div>
            ) : (
                suggestions.map((s, i) => (
                    <div key={i} className={`p-3 rounded-2xl border ${s.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' :
                        s.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' :
                            'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                        }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Lightbulb size={12} className={s.type === 'warning' ? 'text-amber-500' : s.type === 'success' ? 'text-emerald-500' : 'text-zinc-900 dark:text-zinc-300'} />
                            <p className={`text-xs font-bold uppercase leading-none ${s.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                s.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                    'text-zinc-900 dark:text-zinc-100'
                                }`}>{s.subjectName}</p>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed pl-5">
                            {s.message}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
};

export default AISuggestions;
