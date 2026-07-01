
import React, { useMemo, useState } from 'react';
import { Subject, StudySession, Concurso } from '../types';
import { ChevronDown, ChevronRight, Trophy, PieChart as PieChartIcon, Table } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StatisticsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  concursos?: Concurso[];
  selectedConcursoId?: string | 'all';
  onSelectConcursoId?: (id: string | 'all') => void;
}

function getAccuracyBg(accuracy: number, hasData: boolean): string {
  if (!hasData) return '';
  // Brutalista: cores sólidas com opacidade baixa — mais próximo do vermelho = mais urgente
  if (accuracy < 40)  return 'bg-rose-100 dark:bg-rose-900/30';
  if (accuracy < 60)  return 'bg-orange-100 dark:bg-orange-900/20';
  if (accuracy < 75)  return 'bg-amber-50 dark:bg-amber-900/10';
  return 'bg-emerald-50 dark:bg-emerald-900/10';
}

function getAccuracyText(accuracy: number, hasData: boolean): string {
  if (!hasData) return 'text-zinc-300 dark:text-zinc-600';
  if (accuracy < 40)  return 'text-rose-700 dark:text-rose-300 font-black';
  if (accuracy < 60)  return 'text-orange-700 dark:text-orange-300 font-bold';
  if (accuracy < 75)  return 'text-amber-700 dark:text-amber-300 font-bold';
  return 'text-emerald-700 dark:text-emerald-300 font-bold';
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ subjects, sessions, concursos, selectedConcursoId, onSelectConcursoId }) => {
  const [sortBy, setSortBy] = useState<'name' | 'questions' | 'correct' | 'questionsGoal' | 'time' | 'accuracy' | 'weight' | 'priority'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showTopics, setShowTopics] = useState(false);
  const [viewTab, setViewTab] = useState<'table' | 'chart'>('table');

  // Dynamic weights loaded from localStorage with default sum of 100
  const [weightAcc, setWeightAcc] = useState(() => {
    const saved = localStorage.getItem('estudos_weight_acc');
    return saved !== null ? parseInt(saved) : 50;
  });
  const [weightSubj, setWeightSubj] = useState(() => {
    const saved = localStorage.getItem('estudos_weight_subj');
    return saved !== null ? parseInt(saved) : 25;
  });
  const [weightQtd, setWeightQtd] = useState(() => {
    const saved = localStorage.getItem('estudos_weight_qtd');
    return saved !== null ? parseInt(saved) : 15;
  });
  const [weightTime, setWeightTime] = useState(() => {
    const saved = localStorage.getItem('estudos_weight_time');
    return saved !== null ? parseInt(saved) : 10;
  });

  const handleWeightAccChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightSubj + weightQtd + weightTime;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightAcc(finalVal);
    localStorage.setItem('estudos_weight_acc', String(finalVal));
  };

  const handleWeightSubjChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightAcc + weightQtd + weightTime;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightSubj(finalVal);
    localStorage.setItem('estudos_weight_subj', String(finalVal));
  };

  const handleWeightQtdChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightAcc + weightSubj + weightTime;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightQtd(finalVal);
    localStorage.setItem('estudos_weight_qtd', String(finalVal));
  };

  const handleWeightTimeChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    const sumOthers = weightAcc + weightSubj + weightQtd;
    const finalVal = safeVal + sumOthers > 100 ? 100 - sumOthers : safeVal;
    setWeightTime(finalVal);
    localStorage.setItem('estudos_weight_time', String(finalVal));
  };

  const subjectData = useMemo(() => {
    return subjects.map(sub => {
      const subSessions = sessions.filter(s => s.subjectId === sub.id);
      const questions = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
      const correct = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
      const accuracy = questions > 0 ? Math.min(100, Math.round((correct / questions) * 100)) : 0;
      const weight = sub.weight || 1;
      const questionsGoal = sub.questionsGoal || 0;
      const minutes = subSessions.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);

      return { sub, questions, correct, accuracy, weight, questionsGoal, minutes };
    });
  }, [subjects, sessions]);


  const maxWeight = useMemo(() => Math.max(1, ...subjectData.map(d => d.weight)), [subjectData]);
  const maxQuestions = useMemo(() => Math.max(1, ...subjectData.map(d => d.questions)), [subjectData]);
  const maxMinutes = useMemo(() => Math.max(1, ...subjectData.map(d => d.minutes)), [subjectData]);

  // Priority uses dynamic weights, where less minutes studies gives higher priority
  const getPriority = (weight: number, accuracy: number, questions: number, minutes: number): number => {
    const wNorm = weight / maxWeight;
    const accPenalty = questions > 0 ? (100 - accuracy) / 100 : 0.5;
    const qPenalty = Math.max(0, 1 - questions / Math.max(1, maxQuestions));
    const tPenalty = Math.max(0, 1 - minutes / Math.max(1, maxMinutes));
    
    const totalW = weightAcc + weightSubj + weightQtd + weightTime;
    if (totalW === 0) return 0;

    return (
      accPenalty * (weightAcc / totalW) + 
      wNorm * (weightSubj / totalW) + 
      qPenalty * (weightQtd / totalW) +
      tPenalty * (weightTime / totalW)
    );
  };

  const sortedData = useMemo(() => {
    return [...subjectData].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'name') diff = a.sub.name.localeCompare(b.sub.name);
      else if (sortBy === 'questions') diff = a.questions - b.questions;
      else if (sortBy === 'correct') diff = a.correct - b.correct;
      else if (sortBy === 'questionsGoal') diff = a.questionsGoal - b.questionsGoal;
      else if (sortBy === 'time') diff = a.minutes - b.minutes;
      else if (sortBy === 'accuracy') diff = a.accuracy - b.accuracy;
      else if (sortBy === 'weight') diff = a.weight - b.weight;
      else diff = getPriority(a.weight, a.accuracy, a.questions, a.minutes) - getPriority(b.weight, b.accuracy, b.questions, b.minutes);
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [subjectData, sortBy, sortOrder, weightAcc, weightSubj, weightQtd, weightTime, maxWeight, maxQuestions, maxMinutes]);

  const getHeatmapColor = (pct: number) => {
    if (pct >= 75) return '#be123c'; // rose-700
    if (pct >= 60) return '#f97316'; // orange-500
    if (pct >= 40) return '#eab308'; // yellow-500
    return '#10b981'; // emerald-500
  };

  const chartData = useMemo(() => {
    return subjectData.map(d => {
      const priority = getPriority(d.weight, d.accuracy, d.questions, d.minutes);
      const priorityPct = Math.round(priority * 100);
      return {
        name: d.sub.name,
        value: priorityPct,
        color: getHeatmapColor(priorityPct),
        accuracy: d.accuracy,
        minutes: d.minutes,
        questions: d.questions
      };
    }).sort((a, b) => b.value - a.value);
  }, [subjectData, maxWeight, maxQuestions, maxMinutes, weightAcc, weightSubj, weightQtd, weightTime]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
          <p className="text-sm font-semibold text-zinc-500">Nenhuma disciplina cadastrada para gerar o gráfico.</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-around">
          {/* Gráfico */}
          <div className="w-full max-w-[300px] h-[300px] relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={600}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-1">
                          <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{data.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Prioridade: <span className="font-extrabold" style={{ color: data.color }}>{data.value}%</span>
                          </p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Acertos: <span className="text-zinc-800 dark:text-zinc-200 font-extrabold">{data.accuracy}%</span>
                          </p>
                          <p className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-widest">
                            Tempo: <span className="text-zinc-800 dark:text-zinc-200 font-extrabold">{data.minutes} min</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest leading-none">Mapa de</span>
              <span className="text-base font-black text-zinc-800 dark:text-white uppercase tracking-tighter mt-1 leading-none">Calor</span>
            </div>
          </div>

          {/* Legenda de Prioridade */}
          <div className="flex-1 w-full space-y-4">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Disciplinas por Prioridade</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chartData.map((d, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-150 dark:border-zinc-800 rounded-2xl hover:scale-[1.01] transition-all"
                >
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm animate-pulse" style={{ backgroundColor: d.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{d.name}</p>
                    <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider mt-0.5">
                      Prioridade: <span className="font-extrabold" style={{ color: d.color }}>{d.value}%</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barra Informativa de Calor */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#be123c' }} />
            <span>Crítica (≥ 75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span>Alta (60% - 74%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
            <span>Média (40% - 59%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span>Baixa (&lt; 40%)</span>
          </div>
        </div>
      </div>
    );
  };

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const th = (col: typeof sortBy, label: string, align = 'text-left') =>
    <th
      className={`px-4 py-2.5 ${align} text-[10px] font-black uppercase tracking-widest cursor-pointer select-none border-b-2 border-zinc-200 dark:border-zinc-700 whitespace-nowrap ${sortBy === col ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortBy === col ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {concursos && onSelectConcursoId && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
                <Trophy size={14} className="text-amber-500" />
                <select
                  value={selectedConcursoId}
                  onChange={(e) => onSelectConcursoId(e.target.value as string | 'all')}
                  className="bg-white dark:bg-zinc-900 border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-100 cursor-pointer w-32 uppercase tracking-wide focus:ring-0"
                >
                  <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">Visão Global</option>
                  {concursos.map(c => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setShowTopics(!showTopics)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                showTopics
                  ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-700 dark:border-zinc-700 hover:opacity-90'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-800/50'
              }`}
            >
              {showTopics ? 'Ocultar Assuntos' : 'Mostrar Assuntos'}
            </button>

            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shadow-inner border border-zinc-200/20 dark:border-zinc-800/50 select-none">
              <button
                type="button"
                onClick={() => setViewTab('table')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  viewTab === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm font-black'
                    : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Table size={12} /> Tabela
              </button>
              <button
                type="button"
                onClick={() => setViewTab('chart')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  viewTab === 'chart'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm font-black'
                    : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <PieChartIcon size={12} /> Calor (Pizza)
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Prioridade é um cálculo balanceado para focar no que mais precisa de atenção.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase text-zinc-400 px-2">Pesos:</span>
          
          <label className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            Aproveitamento
            <input type="number" min="0" max="100" value={weightAcc} onChange={e => handleWeightAccChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white" />
          </label>
          
          <label className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            Peso Discip.
            <input type="number" min="0" max="100" value={weightSubj} onChange={e => handleWeightSubjChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white" />
          </label>

          <label className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            Volume Qs
            <input type="number" min="0" max="100" value={weightQtd} onChange={e => handleWeightQtdChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white" />
          </label>

          <label className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            Tempo Dedicado
            <input type="number" min="0" max="100" value={weightTime} onChange={e => handleWeightTimeChange(Number(e.target.value))} className="w-14 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-center font-mono dark:text-white" />
          </label>
        </div>
      </header>

      {viewTab === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm border-collapse bg-white dark:bg-zinc-900">
            <thead>
              <tr>
                {th('name', 'Disciplina')}
                {th('questions', 'Resolvidas', 'text-right')}
                {th('correct', 'Certas', 'text-right')}
                {th('questionsGoal', 'Previstas', 'text-right')}
                {th('time', 'Tempo', 'text-right')}
                {th('accuracy', 'Aproveitamento', 'text-right')}
                {th('weight', 'Peso', 'text-right')}
                {th('priority', 'Prioridade', 'text-right')}
              </tr>
            </thead>
            <tbody>
              {sortedData.map(({ sub, questions, correct, accuracy, weight, questionsGoal, minutes }) => {
                const priority = getPriority(weight, accuracy, questions, minutes);
                const priorityPct = Math.round(priority * 100);
                const hasData = questions > 0;

                return (
                  <React.Fragment key={sub.id}>
                    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors border-b border-zinc-100 dark:border-zinc-850 font-medium">
                      <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                        {sub.name}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono">{questions}</td>
                      <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-400 font-mono">{correct}</td>
                      <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-400 font-mono">{questionsGoal}</td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono">{minutes}m</td>
                      <td className={`px-4 py-3 text-right font-mono ${getAccuracyText(accuracy, hasData)}`}>
                        <span className={`px-2.5 py-1 rounded-full ${getAccuracyBg(accuracy, hasData)}`}>
                          {hasData ? `${accuracy}%` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono font-bold">{weight}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={`px-2.5 py-1 rounded-full font-black ${
                          priorityPct >= 75 ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                          : priorityPct >= 60 ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                          : priorityPct >= 40 ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {priorityPct}%
                        </span>
                      </td>
                    </tr>

                    {showTopics && sub.topics && sub.topics.length > 0 && (
                      <>
                        {sub.topics.map(topic => {
                          const topicSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id);
                          const tDone = topicSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
                          const tCorrect = topicSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
                          const tAccuracy = tDone > 0 ? Math.min(100, Math.round((tCorrect / tDone) * 100)) : 0;
                          const tMinutes = topicSessions.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);
                          const tHasData = tDone > 0;

                          return (
                            <tr key={topic.id} className="bg-zinc-50/30 dark:bg-zinc-900/10 text-xs border-b border-zinc-100/50 dark:border-zinc-850/50 font-medium">
                              <td className="px-8 py-2.5 text-zinc-500 dark:text-zinc-400 pl-12 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                                {topic.title}
                              </td>
                              <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">{tDone}</td>
                              <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">{tCorrect}</td>
                              <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">-</td>
                              <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-500 font-mono">{tMinutes}m</td>
                              <td className={`px-4 py-2.5 text-right font-mono ${getAccuracyText(tAccuracy, tHasData)}`}>
                                <span className={`px-2 py-0.5 rounded-md ${getAccuracyBg(tAccuracy, tHasData)}`}>
                                  {tHasData ? `${tAccuracy}%` : '-'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-zinc-400 dark:text-zinc-550">-</td>
                              <td className="px-4 py-2.5 text-right font-mono">
                                <span className={`px-2 py-0.5 rounded-md font-bold ${
                                  topic.priority === 'Alta' ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30'
                                  : topic.priority === 'Média' ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30'
                                  : 'bg-zinc-150/50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}>
                                  {topic.priority}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </React.Fragment>
                );
              })}

              {subjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-zinc-400 text-sm">
                    Nenhuma disciplina encontrada. Adicione disciplinas e registre sessões de estudo para ver a análise.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        renderChart()
      )}
    </div>
  );
};

export default StatisticsView;
