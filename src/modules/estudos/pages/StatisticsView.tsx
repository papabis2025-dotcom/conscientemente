
import React, { useMemo, useState } from 'react';
import { Subject, StudySession } from '../types';
import { ChevronDown, ChevronRight, Trophy } from 'lucide-react';

interface StatisticsViewProps {
  subjects: Subject[];
  sessions: StudySession[];
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

const StatisticsView: React.FC<StatisticsViewProps> = ({ subjects, sessions }) => {
  const [sortBy, setSortBy] = useState<'name' | 'questions' | 'time' | 'accuracy' | 'weight' | 'priority'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
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
      else if (sortBy === 'time') diff = a.minutes - b.minutes;
      else if (sortBy === 'accuracy') diff = a.accuracy - b.accuracy;
      else if (sortBy === 'weight') diff = a.weight - b.weight;
      else diff = getPriority(a.weight, a.accuracy, a.questions, a.minutes) - getPriority(b.weight, b.accuracy, b.questions, b.minutes);
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [subjectData, sortBy, sortOrder, weightAcc, weightSubj, weightQtd, weightTime, maxWeight, maxQuestions, maxMinutes]);

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
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">
            Análise Estatística
          </h2>
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm border-collapse bg-white dark:bg-zinc-900">
          <thead>
            <tr>
              {th('name', 'Disciplina')}
              {th('questions', 'Questões', 'text-right')}
              {th('time', 'Tempo', 'text-right')}
              {th('accuracy', 'Aproveitamento', 'text-right')}
              {th('weight', 'Peso', 'text-right')}
              {th('priority', 'Prioridade', 'text-right')}
            </tr>
          </thead>
          <tbody>
            {sortedData.map(({ sub, questions, accuracy, weight, questionsGoal, minutes }) => {
              const priority = getPriority(weight, accuracy, questions, minutes);
              const priorityPct = Math.round(priority * 100);

              return (
                <tr
                  key={sub.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-zinc-800 dark:text-white">{sub.name}</span>
                    {questionsGoal > 0 && (
                      <span className="ml-2 text-[10px] text-zinc-400">Prev. {questionsGoal} Qs</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums font-bold ${questions > 0 ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-300 dark:text-zinc-600'}`}>
                    {questions > 0 ? questions : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums ${minutes > 0 ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-300 dark:text-zinc-600'}`}>
                    {minutes > 0 ? `${parseFloat((minutes / 60).toFixed(1))}h` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums ${getAccuracyText(accuracy, questions > 0)}`}>
                    {questions > 0 ? `${accuracy}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400 font-bold">
                    {weight}x
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black tabular-nums ${
                      priorityPct >= 65 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                      : priorityPct >= 40 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {priorityPct}%
                    </span>
                  </td>
                </tr>
              );
            })}

            {subjects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-zinc-400 text-sm">
                  Nenhuma disciplina encontrada. Adicione disciplinas e registre sessões de estudo para ver a análise.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatisticsView;
