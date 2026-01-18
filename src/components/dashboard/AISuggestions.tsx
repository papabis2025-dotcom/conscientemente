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
                    <Bot size={32} className="text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Sem sugestões no momento.</p>
                    <p className="text-[10px] text-slate-400">Continue estudando para gerar dados.</p>
                </div>
            ) : (
                suggestions.map((s, i) => (
                    <div key={i} className={`p-3 rounded-2xl border ${s.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' :
                        s.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' :
                            'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                        }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Lightbulb size={12} className={s.type === 'warning' ? 'text-amber-500' : s.type === 'success' ? 'text-emerald-500' : 'text-blue-500'} />
                            <p className={`text-xs font-bold uppercase leading-none ${s.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                s.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                    'text-blue-600 dark:text-blue-400'
                                }`}>{s.subjectName}</p>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed pl-5">
                            {s.message}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
};

export default AISuggestions;
