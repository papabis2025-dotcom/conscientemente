
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, LineChart, Line } from 'recharts';

import { Subject, StudySession, Concurso, Simulado } from '../types';
import AISuggestions from '../components/dashboard/AISuggestions';

interface DashboardProps {
  subjects: Subject[];
  sessions: StudySession[];
  simulados: Simulado[];
  activeConcurso?: Concurso;
  selectedConcursoId: string | 'all';
  onSelectConcursoId: (id: string | 'all') => void;
  concursos: Concurso[];
  theme?: 'light' | 'dark';
  onToggleReorderMode?: (isReorder: boolean) => void;
}

interface WidgetState {
  id: string;
  title: string;
  isVisible: boolean;
  size: 'normal' | 'wide' | 'full';
}

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: 'general_stats', title: 'Desempenho Geral', isVisible: true, size: 'normal' },
  { id: 'study_suggestions', title: 'Sugestões Estratégicas', isVisible: true, size: 'normal' },
  { id: 'simulados_summary', title: 'Desempenho em Simulados', isVisible: true, size: 'normal' },
  { id: 'weekly_chart', title: 'Volume de Estudo Semanal', isVisible: true, size: 'normal' },
  { id: 'questions_by_subject', title: 'Questões por Disciplina', isVisible: true, size: 'wide' },
  { id: 'time_by_subject', title: 'Tempo por Disciplina (Horas)', isVisible: true, size: 'wide' },
];

const tailwindToHex = (twColor: string) => {
  const mapping: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-purple-500': '#a855f7',
    'bg-emerald-500': '#10b981',
    'bg-amber-500': '#f59e0b',
    'bg-rose-500': '#f43f5e',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-orange-500': '#f97316',
    'bg-slate-500': '#64748b'
  };
  return mapping[twColor] || '#3b82f6';
};

const getAcronym = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase();
  }
  return name.substring(0, 4).toUpperCase();
};

const Dashboard: React.FC<DashboardProps> = ({
  subjects,
  sessions,
  simulados,
  activeConcurso,
  selectedConcursoId,
  onSelectConcursoId,
  concursos,
  theme = 'light',
  onToggleReorderMode
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    const saved = localStorage.getItem('cp_dashboard_layout_v13');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);

  const isDarkMode = theme === 'dark';
  const chartTextColor = isDarkMode ? '#94a3b8' : '#64748b';

  useEffect(() => { localStorage.setItem('cp_dashboard_layout_v13', JSON.stringify(widgets)); }, [widgets]);

  const handleDragStart = (index: number) => {
    setDraggedWidgetIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedWidgetIndex === null || draggedWidgetIndex === index) return;

    const newWidgets = [...widgets];
    const draggedItem = newWidgets[draggedWidgetIndex];
    newWidgets.splice(draggedWidgetIndex, 1);
    newWidgets.splice(index, 0, draggedItem);

    setWidgets(newWidgets);
    setDraggedWidgetIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedWidgetIndex(null);
  };

  const cycleSize = (id: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id === id) {
        const sizes: WidgetState['size'][] = ['normal', 'wide', 'full'];
        const nextIdx = (sizes.indexOf(w.size) + 1) % sizes.length;
        return { ...w, size: sizes[nextIdx] };
      }
      return w;
    }));
  };

  const subjectStats = useMemo(() => {
    const stats: Record<string, { done: number, correct: number, minutes: number, name: string, colorClass: string }> = {};

    subjects.forEach(s => {
      if (!stats[s.name]) {
        stats[s.name] = { done: 0, correct: 0, minutes: 0, name: s.name, colorClass: s.color };
      }
    });

    sessions.forEach(session => {
      const sub = subjects.find(s => s.id === session.subjectId);
      if (sub && stats[sub.name]) {
        stats[sub.name].done += (session.questionsDone || 0);
        stats[sub.name].correct += (session.questionsCorrect || 0);
        stats[sub.name].minutes += session.durationInMinutes;
      }
    });

    const list = Object.values(stats)
      .map(s => ({
        ...s,
        accuracy: s.done > 0 ? Math.round((s.correct / s.done) * 100) : 0,
        hours: parseFloat((s.minutes / 60).toFixed(2)),
        hexColor: tailwindToHex(s.colorClass),
        acronym: getAcronym(s.name)
      }));

    return {
      all: list,
      questionsData: list.filter(s => s.done > 0).sort((a, b) => b.done - a.done),
      timeData: list.filter(s => s.minutes > 0).sort((a, b) => b.minutes - a.minutes),
      best: [...list].filter(s => s.done > 0).sort((a, b) => b.accuracy - a.accuracy)[0] || null,
      worst: list.filter(s => s.done > 0).length > 0 ? [...list].filter(s => s.done > 0).sort((a, b) => a.accuracy - b.accuracy)[0] : null
    };
  }, [sessions, subjects]);

  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dataMap = days.map(day => ({ n: day, h: 0 }));
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    sessions.forEach(s => {
      const sDate = new Date(s.date);
      if (sDate >= startOfWeek) {
        const dayIdx = sDate.getDay();
        dataMap[dayIdx].h += (s.durationInMinutes / 60);
      }
    });

    const reordered = [...dataMap.slice(1), dataMap[0]];
    return reordered.map(d => ({ ...d, h: parseFloat(d.h.toFixed(2)) }));
  }, [sessions]);

  const renderWidgetContent = (id: string) => {
    const totalDone = subjectStats.questionsData.reduce((acc, s) => acc + s.done, 0);
    const totalCorrect = subjectStats.questionsData.reduce((acc, s) => acc + s.correct, 0);
    const globalAccuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;

    switch (id) {
      case 'general_stats':
        return (
          <div className="mt-2 space-y-4">
            <div>
              <p className="text-4xl font-black text-slate-800 dark:text-white leading-none mb-1">{globalAccuracy}%</p>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aproveitamento Global</p>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${globalAccuracy}%` }} />
            </div>
          </div>
        );
      case 'study_suggestions':
        const suggestions = subjectStats.all.reduce((acc, s) => {
          if (s.done > 10 && s.accuracy < 60) {
            acc.push({ subjectName: s.name, type: 'warning', message: `Base fraca em ${s.name} (${s.accuracy}%). Revise a teoria antes de mais questões.` });
          } else if (s.done > 20 && s.accuracy > 85) {
            acc.push({ subjectName: s.name, type: 'success', message: `Dominando ${s.name}! Considere reduzir frequência e priorizar outras.` });
          } else if (s.minutes < 60 && s.done < 5) {
            acc.push({ subjectName: s.name, type: 'info', message: `Pouco estudo em ${s.name}. Que tal um ciclo hoje?` });
          }
          return acc;
        }, [] as any[]);
        return <AISuggestions suggestions={suggestions} />;
      case 'simulados_summary':
        const simDone = simulados.reduce((acc, s) => acc + s.results.reduce((a, r) => a + r.done, 0), 0);
        const simCorrect = simulados.reduce((acc, s) => acc + s.results.reduce((a, r) => a + r.correct, 0), 0);
        const simAccuracy = simDone > 0 ? Math.round((simCorrect / simDone) * 100) : 0;
        return (
          <div className="mt-2 space-y-4">
            <div>
              <p className="text-4xl font-black text-emerald-500 leading-none mb-1">{simAccuracy}%</p>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Média em Simulados</p>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${simAccuracy}%` }} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{simulados.length} simulados realizados</p>
          </div>
        );
      case 'weekly_chart':
        return (
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: chartTextColor }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="h" stroke="#2563eb" fill="#2563eb22" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case 'questions_by_subject':
        return (
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectStats.questionsData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: chartTextColor }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                <Bar dataKey="done" radius={[6, 6, 0, 0]} barSize={35}>
                  {subjectStats.questionsData.map((entry, index) => <Cell key={index} fill={entry.hexColor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'time_by_subject':
        return (
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectStats.timeData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: chartTextColor }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={35}>
                  {subjectStats.timeData.map((entry, index) => <Cell key={index} fill={entry.hexColor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-4 pr-6 border-r border-slate-100 dark:border-slate-800 shrink-0">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-xl">🏆</div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest leading-none mb-1.5">Meta Ativa</p>
            <select
              value={selectedConcursoId}
              onChange={(e) => onSelectConcursoId(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-black text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="all">Visão Global</option>
              {concursos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-10 px-4">
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-800 dark:text-white leading-none mb-1">{subjects.length}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Matérias</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-800 dark:text-white leading-none mb-1">{sessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0)}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Questões</span>
          </div>
        </div>
      </div>

      <header className="flex justify-between items-center px-1">
        <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Análise Estratégica 🔥</h2>
        <button onClick={() => {
          setIsEditMode(!isEditMode);
          onToggleReorderMode?.(!isEditMode);
        }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>
          {isEditMode ? 'Salvar Painel' : 'Ajustar Layout'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
        {widgets.map((widget, index) => {
          if (!widget.isVisible && !isEditMode) return null;
          const sizeClass = widget.size === 'full' ? 'md:col-span-3' : widget.size === 'wide' ? 'md:col-span-2' : 'md:col-span-1';
          return (

            <div
              key={widget.id}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${sizeClass} ${widget.isVisible ? 'opacity-100' : 'opacity-40'} bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all duration-300 ${isEditMode ? 'cursor-move ring-2 ring-emerald-500/20' : ''} ${draggedWidgetIndex === index ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{widget.title}</h4>
                {isEditMode && (
                  <div className="flex gap-2">
                    <button onClick={() => cycleSize(widget.id)} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight">Tam: {widget.size}</button>
                    <button onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, isVisible: !w.isVisible } : w))} className="text-sm">{widget.isVisible ? '👁️' : '🚫'}</button>
                  </div>
                )}
              </div>
              {renderWidgetContent(widget.id)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
