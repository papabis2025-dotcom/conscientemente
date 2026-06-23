import React, { useState, useEffect } from 'react';
import { Calendar, Moon, Plus, Trash2, Clock, Brain, RefreshCw, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  notes?: string;
}

interface MonitoramentoSonoProps {
  onUpdateSleepLogs?: () => void;
}

export const MonitoramentoSono: React.FC<MonitoramentoSonoProps> = ({ onUpdateSleepLogs }) => {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>(() => {
    const saved = localStorage.getItem('cn_saude_sleep_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cn_saude_sleep_logs', JSON.stringify(sleepLogs));
    if (onUpdateSleepLogs) {
      onUpdateSleepLogs();
    }
    // Dispatch local sync event
    window.dispatchEvent(new Event('local-storage-sync'));
  }, [sleepLogs]);

  // Form states
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deepH, setDeepH] = useState('1');
  const [deepM, setDeepM] = useState('30');
  const [lightH, setLightH] = useState('4');
  const [lightM, setLightM] = useState('0');
  const [remH, setRemH] = useState('1');
  const [remM, setRemM] = useState('30');
  const [awakeH, setAwakeH] = useState('0');
  const [awakeM, setAwakeM] = useState('15');
  const [notes, setNotes] = useState('');

  const formatDuration = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const calculateScore = (log: SleepLog) => {
    const total = log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes;
    if (total === 0) return 0;
    
    // Sleep score formula based on optimal distribution:
    // - Deep sleep (20-25%): high value
    // - REM sleep (20-25%): high value
    // - Light sleep (50-60%): medium value
    // - Awake (less than 10%): penalty
    const deepPct = log.deepMinutes / total;
    const remPct = log.remMinutes / total;
    const awakePct = log.awakeMinutes / total;
    
    let score = 100;
    
    // Deduct for too much awake time (optimal is < 10%)
    if (awakePct > 0.1) {
      score -= (awakePct - 0.1) * 150;
    }
    
    // Deduct for lack of deep sleep (optimal is > 18%)
    if (deepPct < 0.18) {
      score -= (0.18 - deepPct) * 120;
    }
    
    // Deduct for lack of REM sleep (optimal is > 18%)
    if (remPct < 0.18) {
      score -= (0.18 - remPct) * 100;
    }
    
    // Deduct for sleeping too little (optimal is 7 to 9 hours)
    const totalHours = total / 60;
    if (totalHours < 7) {
      score -= (7 - totalHours) * 15;
    } else if (totalHours > 9.5) {
      score -= (totalHours - 9.5) * 8;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const handleAddSleepLog = (e: React.FormEvent) => {
    e.preventDefault();
    
    const deep = (parseInt(deepH) || 0) * 60 + (parseInt(deepM) || 0);
    const light = (parseInt(lightH) || 0) * 60 + (parseInt(lightM) || 0);
    const rem = (parseInt(remH) || 0) * 60 + (parseInt(remM) || 0);
    const awake = (parseInt(awakeH) || 0) * 60 + (parseInt(awakeM) || 0);
    
    if (deep + light + rem + awake === 0) {
      alert('Por favor, preencha os tempos de sono.');
      return;
    }

    // Check for duplicate date
    if (sleepLogs.some(log => log.date === formDate)) {
      if (!window.confirm('Já existe um registro para esta data. Deseja sobrescrevê-lo?')) {
        return;
      }
      setSleepLogs(prev => prev.filter(log => log.date !== formDate));
    }

    const newLog: SleepLog = {
      id: crypto.randomUUID(),
      date: formDate,
      deepMinutes: deep,
      lightMinutes: light,
      remMinutes: rem,
      awakeMinutes: awake,
      notes: notes.trim() || undefined
    };

    setSleepLogs(prev => [...prev, newLog].sort((a, b) => b.date.localeCompare(a.date)));
    
    // Reset form
    setNotes('');
  };

  const handleDeleteLog = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de sono?')) return;
    setSleepLogs(prev => prev.filter(log => log.id !== id));
  };

  // Prepare chart data (last 10 nights)
  const chartData = [...sleepLogs]
    .slice(0, 10)
    .reverse()
    .map(log => ({
      name: formatDate(log.date),
      'Profundo (h)': Number((log.deepMinutes / 60).toFixed(2)),
      'Leve (h)': Number((log.lightMinutes / 60).toFixed(2)),
      'REM (h)': Number((log.remMinutes / 60).toFixed(2)),
      'Acordado (h)': Number((log.awakeMinutes / 60).toFixed(2)),
      totalHours: Number(((log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes) / 60).toFixed(2))
    }));

  const avgSleepMinutes = sleepLogs.length > 0 
    ? Math.round(sleepLogs.reduce((acc, log) => acc + log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes, 0) / sleepLogs.length)
    : 0;

  const avgScore = sleepLogs.length > 0
    ? Math.round(sleepLogs.reduce((acc, log) => acc + calculateScore(log), 0) / sleepLogs.length)
    : 0;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">
            Monitoramento do Sono
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Registre suas noites e analise os estágios do sono para melhorar sua recuperação física e mental.
          </p>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500 shrink-0">
            <Moon size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Média de Sono</p>
            <p className="text-2xl font-black dark:text-white">{avgSleepMinutes > 0 ? formatDuration(avgSleepMinutes) : '—'}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 shrink-0">
            <Brain size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Score Médio</p>
            <p className="text-2xl font-black text-purple-500">{avgScore > 0 ? `${avgScore}/100` : '—'}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Noites Registradas</p>
            <p className="text-2xl font-black text-emerald-500">{sleepLogs.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico dos estágios (2/3 colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-4">
              Estágios do Sono por Noite (Últimas 10 noites)
            </h3>
            <div className="flex-1 w-full min-h-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.08} />
                    <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#888' }} unit="h" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${value}h`, '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 10 }} />
                    <Bar dataKey="Profundo (h)" stackId="sleep" fill="#4338ca" />
                    <Bar dataKey="REM (h)" stackId="sleep" fill="#a855f7" />
                    <Bar dataKey="Leve (h)" stackId="sleep" fill="#0ea5e9" />
                    <Bar dataKey="Acordado (h)" stackId="sleep" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-medium">Nenhum registro de sono para exibir o gráfico.</div>
              )}
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Histórico de Noites
              </h3>
            </div>

            {sleepLogs.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-semibold">
                Nenhum registro de sono adicionado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Tempo Total</th>
                      <th className="py-3 px-4">Profundo</th>
                      <th className="py-3 px-4">Leve</th>
                      <th className="py-3 px-4">REM</th>
                      <th className="py-3 px-4">Acordado</th>
                      <th className="py-3 px-4">Qualidade</th>
                      <th className="py-3 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {sleepLogs.map(log => {
                      const total = log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes;
                      const score = calculateScore(log);
                      
                      let scoreColor = 'text-red-500';
                      if (score >= 85) scoreColor = 'text-emerald-500';
                      else if (score >= 70) scoreColor = 'text-cyan-500';
                      else if (score >= 50) scoreColor = 'text-amber-500';

                      return (
                        <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                          <td className="py-3 px-4 font-bold text-zinc-800 dark:text-white">
                            {new Date(`${log.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-black dark:text-white">
                            {formatDuration(total)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium">
                            {formatDuration(log.deepMinutes)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium">
                            {formatDuration(log.lightMinutes)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium">
                            {formatDuration(log.remMinutes)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium">
                            {formatDuration(log.awakeMinutes)}
                          </td>
                          <td className={`py-3 px-4 font-black ${scoreColor}`}>
                            {score} pts
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                              title="Excluir registro"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Formulário de adicionar (1/3 coluna) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Registrar Noite de Sono
            </h3>

            <form onSubmit={handleAddSleepLog} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Data de Dormida / Acordada</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
                />
              </div>

              {/* Profundo */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30">
                <label className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Brain size={12} /> Sono Profundo
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={deepH}
                      onChange={e => setDeepH(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">h</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={deepM}
                      onChange={e => setDeepM(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">m</span>
                  </div>
                </div>
              </div>

              {/* REM */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/30">
                <label className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <RefreshCw size={12} /> Sono REM
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={remH}
                      onChange={e => setRemH(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">h</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={remM}
                      onChange={e => setRemM(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">m</span>
                  </div>
                </div>
              </div>

              {/* Leve */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-sky-50/30 dark:bg-sky-950/10 border border-sky-100/30">
                <label className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Clock size={12} /> Sono Leve
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={lightH}
                      onChange={e => setLightH(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">h</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={lightM}
                      onChange={e => setLightM(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">m</span>
                  </div>
                </div>
              </div>

              {/* Acordado */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/30">
                <label className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-455 flex items-center gap-1.5">
                  <Info size={12} /> Tempo Acordado
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={awakeH}
                      onChange={e => setAwakeH(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">h</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={awakeM}
                      onChange={e => setAwakeM(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400">m</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Observações (opcional)</label>
                <textarea
                  placeholder="Ex: Acordei com dor de cabeça, sonhei muito..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650 h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-98"
              >
                <Plus size={14} /> Registrar Noite
              </button>
            </form>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-800/30 rounded-2xl p-4 flex items-start gap-3">
            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
              <p className="font-bold mb-0.5">Distribuição Recomendada</p>
              <p className="mb-1">Para um sono restaurador, a distribuição esperada por estágio é de aproximadamente:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Profundo</strong>: 15% - 25% (recuperação física)</li>
                <li><strong>REM</strong>: 20% - 25% (recuperação mental/memória)</li>
                <li><strong>Leve</strong>: 50% - 60% (transição)</li>
                <li><strong>Acordado</strong>: menos de 10%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
