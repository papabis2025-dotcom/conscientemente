
import React from 'react';
import { LogEntry } from '../types';

interface LogViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onDeleteLog: (id: string) => void;
}

const LogView: React.FC<LogViewProps> = ({ logs, onClearLogs, onDeleteLog }) => {
  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'danger': return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
      default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Log de Atividade 📜</h2>
          <p className="text-slate-500 dark:text-slate-400">Histórico de alterações e integrações do sistema.</p>
        </div>
        <button 
          onClick={() => confirm("Deseja limpar o histórico de logs?") && onClearLogs()}
          className="px-4 py-2 text-xs font-black uppercase text-slate-400 hover:text-rose-500 transition-colors"
        >
          Limpar Tudo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="p-20 text-center">
              <span className="text-4xl mb-4 block">📭</span>
              <p className="text-slate-400 font-medium">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Horário</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição da Atividade</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-400">{formatTimestamp(log.timestamp)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${getTypeColor(log.type).split(' ')[1]}`}></div>
                        <p className={`text-sm font-medium ${log.type === 'danger' ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          {log.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onDeleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                        title="Remover este log"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogView;
