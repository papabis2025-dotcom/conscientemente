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

export interface SleepCalibration {
  id: string;
  date: string;
  watchDeep: number;
  actualDeep: number;
  watchLight: number;
  actualLight: number;
  watchREM: number;
  actualREM: number;
  watchAwake: number;
  actualAwake: number;
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

  const [calibrations, setCalibrations] = useState<SleepCalibration[]>(() => {
    const saved = localStorage.getItem('cn_saude_sleep_calibrations');
    return saved ? JSON.parse(saved) : [];
  });

  const [subTab, setSubTab] = useState<'painel' | 'historico' | 'calibracao'>('painel');

  useEffect(() => {
    localStorage.setItem('cn_saude_sleep_logs', JSON.stringify(sleepLogs));
    if (onUpdateSleepLogs) {
      onUpdateSleepLogs();
    }
    // Dispatch local sync event
    window.dispatchEvent(new Event('local-storage-sync'));
    window.dispatchEvent(new Event('local-settings-changed'));
  }, [sleepLogs]);

  useEffect(() => {
    localStorage.setItem('cn_saude_sleep_calibrations', JSON.stringify(calibrations));
  }, [calibrations]);

  // Calibration Form states
  const [calibDate, setCalibDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cWatchDeep, setCWatchDeep] = useState('90');
  const [cActualDeep, setCActualDeep] = useState('100');
  const [cWatchLight, setCWatchLight] = useState('240');
  const [cActualLight, setCActualLight] = useState('220');
  const [cWatchREM, setCWatchREM] = useState('90');
  const [cActualREM, setCActualREM] = useState('95');
  const [cWatchAwake, setCWatchAwake] = useState('15');
  const [cActualAwake, setCActualAwake] = useState('15');

  // Form states for Sleep Logs
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

  // Cálculo de fatores de calibração dando peso de 60% para a última calibração e 40% para a média histórica
  const calibrationFactors = React.useMemo(() => {
    if (calibrations.length === 0) {
      return { deep: 1.0, light: 1.0, rem: 1.0, awake: 1.0 };
    }
    const sorted = [...calibrations].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];

    const getRatio = (actual: number, watch: number) => (watch > 0 ? actual / watch : 1.0);

    const latestRatios = {
      deep: getRatio(latest.actualDeep, latest.watchDeep),
      light: getRatio(latest.actualLight, latest.watchLight),
      rem: getRatio(latest.actualREM, latest.watchREM),
      awake: getRatio(latest.actualAwake, latest.watchAwake)
    };

    const avgRatios = {
      deep: sorted.reduce((acc, c) => acc + getRatio(c.actualDeep, c.watchDeep), 0) / sorted.length,
      light: sorted.reduce((acc, c) => acc + getRatio(c.actualLight, c.watchLight), 0) / sorted.length,
      rem: sorted.reduce((acc, c) => acc + getRatio(c.actualREM, c.watchREM), 0) / sorted.length,
      awake: sorted.reduce((acc, c) => acc + getRatio(c.actualAwake, c.watchAwake), 0) / sorted.length
    };

    return {
      deep: Number((latestRatios.deep * 0.6 + avgRatios.deep * 0.4).toFixed(2)),
      light: Number((latestRatios.light * 0.6 + avgRatios.light * 0.4).toFixed(2)),
      rem: Number((latestRatios.rem * 0.6 + avgRatios.rem * 0.4).toFixed(2)),
      awake: Number((latestRatios.awake * 0.6 + avgRatios.awake * 0.4).toFixed(2))
    };
  }, [calibrations]);

  const calculateScore = (log: SleepLog) => {
    const total = log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes;
    if (total === 0) return 0;
    
    const deepPct = log.deepMinutes / total;
    const remPct = log.remMinutes / total;
    const awakePct = log.awakeMinutes / total;
    
    let score = 100;
    
    if (awakePct > 0.1) {
      score -= (awakePct - 0.1) * 150;
    }
    if (deepPct < 0.18) {
      score -= (0.18 - deepPct) * 120;
    }
    if (remPct < 0.18) {
      score -= (0.18 - remPct) * 100;
    }
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
    setNotes('');
  };

  const handleAddCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    const newCalib: SleepCalibration = {
      id: crypto.randomUUID(),
      date: calibDate,
      watchDeep: parseInt(cWatchDeep) || 0,
      actualDeep: parseInt(cActualDeep) || 0,
      watchLight: parseInt(cWatchLight) || 0,
      actualLight: parseInt(cActualLight) || 0,
      watchREM: parseInt(cWatchREM) || 0,
      actualREM: parseInt(cActualREM) || 0,
      watchAwake: parseInt(cWatchAwake) || 0,
      actualAwake: parseInt(cActualAwake) || 0
    };

    setCalibrations(prev => [newCalib, ...prev.filter(c => c.date !== calibDate)]);
    alert('Calibração salva com sucesso!');
  };

  const handleDeleteCalibration = (id: string) => {
    if (!window.confirm('Excluir esta calibração?')) return;
    setCalibrations(prev => prev.filter(c => c.id !== id));
  };

  const handleDeleteLog = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de sono?')) return;
    setSleepLogs(prev => prev.filter(log => log.id !== id));
  };

  // Garante que o gráfico exibe sempre os ÚLTIMOS 10 DIAS de registro em ordem cronológica
  const sortedLogsAsc = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
  const recentLogs = sortedLogsAsc.slice(-10);

  const chartData = recentLogs.map(log => ({
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
    <div className="space-y-4 max-w-[1200px] mx-auto pb-4 animate-in fade-in duration-500 flex flex-col h-full overflow-hidden">


      {/* Sub-tabs Selector */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
        <button
          onClick={() => setSubTab('painel')}
          className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            subTab === 'painel'
              ? 'border-cyan-500 text-cyan-500'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350'
          }`}
        >
          Painel & Registro
        </button>
        <button
          onClick={() => setSubTab('historico')}
          className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'historico'
              ? 'border-cyan-500 text-cyan-500'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350'
          }`}
        >
          Histórico de Noites
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold">
            {sleepLogs.length}
          </span>
        </button>
        <button
          onClick={() => setSubTab('calibracao')}
          className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'calibracao'
              ? 'border-cyan-500 text-cyan-500'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350'
          }`}
        >
          <RefreshCw size={13} /> Calibração de Relógio
          {calibrations.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 font-bold">
              {calibrations.length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'painel' ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500 shrink-0">
                <Moon size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Média de Sono</p>
                <p className="text-xl font-black dark:text-white">{avgSleepMinutes > 0 ? formatDuration(avgSleepMinutes) : '—'}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 shrink-0">
                <Brain size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Score Médio</p>
                <p className="text-xl font-black text-purple-500">{avgScore > 0 ? `${avgScore}/100` : '—'}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Noites Registradas</p>
                <p className="text-xl font-black text-emerald-500">{sleepLogs.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Gráfico dos estágios (2/3 colunas) */}
            <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
              <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm flex flex-col h-[270px] shrink-0">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
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
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 5 }} />
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

            {/* Formulário de adicionar (1/3 coluna) */}
            <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3">
                Registrar Noite de Sono
              </h3>

              <form onSubmit={handleAddSleepLog} className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Data de Dormida / Acordada</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Profundo */}
                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30">
                    <label className="text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Brain size={12} /> Profundo
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={deepH}
                          onChange={e => setDeepH(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">h</span>
                      </div>
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={deepM}
                          onChange={e => setDeepM(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">m</span>
                      </div>
                    </div>
                  </div>

                  {/* REM */}
                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/30">
                    <label className="text-[9px] font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <RefreshCw size={12} /> REM
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={remH}
                          onChange={e => setRemH(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">h</span>
                      </div>
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={remM}
                          onChange={e => setRemM(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">m</span>
                      </div>
                    </div>
                  </div>

                  {/* Leve */}
                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-sky-50/30 dark:bg-sky-950/10 border border-sky-100/30">
                    <label className="text-[9px] font-bold uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <Clock size={12} /> Leve
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={lightH}
                          onChange={e => setLightH(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">h</span>
                      </div>
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={lightM}
                          onChange={e => setLightM(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">m</span>
                      </div>
                    </div>
                  </div>

                  {/* Acordado */}
                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/30">
                    <label className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-455 flex items-center gap-1.5">
                      <Info size={12} /> Acordado
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={awakeH}
                          onChange={e => setAwakeH(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">h</span>
                      </div>
                      <div className="flex-1 flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={awakeM}
                          onChange={e => setAwakeM(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center outline-none"
                        />
                        <span className="text-[9px] font-bold text-zinc-400">m</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Observações (opcional)</label>
                  <textarea
                    placeholder="Ex: Acordei com dor de cabeça..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-650 h-12 resize-none animate-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-98"
                >
                  <Plus size={14} /> Registrar Noite
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : subTab === 'historico' ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Histórico de Noites de Sono
              </h3>
            </div>

            {sleepLogs.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-semibold flex-1 flex items-center justify-center">
                Nenhum registro de sono adicionado ainda.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Profundo</th>
                      <th className="py-3 px-4">Leve</th>
                      <th className="py-3 px-4">REM</th>
                      <th className="py-3 px-4">Acordado</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4 text-right">Ações</th>
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
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
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
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
          {/* Card de Resumo de Fatores */}
          <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw size={16} className="text-cyan-500" /> Fatores de Calibração Atuais (Relógio/Smartwatch)
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                  A calibração pondera 60% para a última calibração efetuada e 40% para o histórico de calibrações anteriores.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-black bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                {calibrations.length} {calibrations.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-cyan-50/40 dark:bg-cyan-950/20 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/30 text-center">
                <span className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-300 tracking-widest block">Profundo</span>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 mt-1 block">x{calibrationFactors.deep}</span>
              </div>
              <div className="bg-blue-50/40 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 tracking-widest block">Leve</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1 block">x{calibrationFactors.light}</span>
              </div>
              <div className="bg-purple-50/40 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 text-center">
                <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-widest block">REM</span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1 block">x{calibrationFactors.rem}</span>
              </div>
              <div className="bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-widest block">Acordado</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 block">x{calibrationFactors.awake}</span>
              </div>
            </div>
          </div>

          {/* Form de Nova Calibração */}
          <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Plus size={14} className="text-cyan-500" /> Registrar Nova Calibração
            </h4>

            <form onSubmit={handleAddCalibration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Data</label>
                  <input type="date" value={calibDate} onChange={e => setCalibDate(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">Profundo (Rel / Real min)</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Relógio" value={cWatchDeep} onChange={e => setCWatchDeep(e.target.value)} className="w-1/2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 text-xs text-center font-bold" />
                    <input type="number" placeholder="Real" value={cActualDeep} onChange={e => setCActualDeep(e.target.value)} className="w-1/2 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-700 rounded-xl p-1.5 text-xs text-center font-black text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Leve (Rel / Real min)</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Relógio" value={cWatchLight} onChange={e => setCWatchLight(e.target.value)} className="w-1/2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 text-xs text-center font-bold" />
                    <input type="number" placeholder="Real" value={cActualLight} onChange={e => setCActualLight(e.target.value)} className="w-1/2 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-xl p-1.5 text-xs text-center font-black text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">REM (Rel / Real min)</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Relógio" value={cWatchREM} onChange={e => setCWatchREM(e.target.value)} className="w-1/2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 text-xs text-center font-bold" />
                    <input type="number" placeholder="Real" value={cActualREM} onChange={e => setCActualREM(e.target.value)} className="w-1/2 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 rounded-xl p-1.5 text-xs text-center font-black text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Acordado (Rel / Real min)</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Relógio" value={cWatchAwake} onChange={e => setCWatchAwake(e.target.value)} className="w-1/2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 text-xs text-center font-bold" />
                    <input type="number" placeholder="Real" value={cActualAwake} onChange={e => setCActualAwake(e.target.value)} className="w-1/2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-1.5 text-xs text-center font-black text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-cyan-500/20 transition-all">
                  Salvar Calibração
                </button>
              </div>
            </form>
          </div>

          {/* Histórico de Calibrações */}
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Histórico de Calibrações
              </h3>
            </div>

            {calibrations.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs font-semibold">
                Nenhuma calibração realizada ainda. Adicione os dados do seu relógio acima para calibrar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] uppercase font-black tracking-wider text-zinc-400">
                      <th className="py-2.5 px-4">Data</th>
                      <th className="py-2.5 px-4">Profundo (Rel / Real)</th>
                      <th className="py-2.5 px-4">Leve (Rel / Real)</th>
                      <th className="py-2.5 px-4">REM (Rel / Real)</th>
                      <th className="py-2.5 px-4">Acordado (Rel / Real)</th>
                      <th className="py-2.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {calibrations.map(c => (
                      <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20">
                        <td className="py-2.5 px-4 font-bold text-zinc-800 dark:text-white">
                          {new Date(`${c.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-cyan-600 dark:text-cyan-400">
                          {c.watchDeep}m / {c.actualDeep}m
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                          {c.watchLight}m / {c.actualLight}m
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-purple-600 dark:text-purple-400">
                          {c.watchREM}m / {c.actualREM}m
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-amber-600 dark:text-amber-400">
                          {c.watchAwake}m / {c.actualAwake}m
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCalibration(c.id)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                            title="Excluir calibração"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
