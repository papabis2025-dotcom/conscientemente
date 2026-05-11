import React, { useMemo } from 'react';
import { LogEntry } from '../types';

interface LogViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onDeleteLog: (id: string) => void;
}

const LogView: React.FC<LogViewProps> = ({ logs, onClearLogs, onDeleteLog }) => {
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">Registro de Atividades 📋</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Histórico técnico de alterações e eventos do sistema.</p>
        </div>
        <button
          onClick={() => confirm('Limpar todos os logs?') && onClearLogs()}
          className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl font-bold uppercase text-xs transition-colors"
          disabled={logs.length === 0}
        >
          Limpar Histórico
        </button>
      </header>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm overflow-hidden">
        {sortedLogs.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <span className="text-4xl block mb-2">📜</span>
            <p className="font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 uppercase tracking-widest text-[10px] font-black text-zinc-400">
                <tr>
                  <th className="px-6 py-4 rounded-l-2xl">Data/Hora</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 w-full">Mensagem</th>
                  <th className="px-6 py-4 rounded-r-2xl text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-zinc-500">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${log.type === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                          log.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            log.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-700/30 dark:text-zinc-100'
                        }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Delete disabled for generic logs usually, but keeping prop if needed */}
                      <span className="text-zinc-300 text-xs font-mono">#{log.id.slice(0, 4)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogView;
