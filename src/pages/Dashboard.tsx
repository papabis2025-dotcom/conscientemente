
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, LineChart, Line } from 'recharts';

import { Subject, StudySession, Concurso, Simulado, ActivityType } from '../types';
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
  onAddSession?: (session: StudySession) => void;
}

interface WidgetState {
  id: string;
  title: string;
  isVisible: boolean;
  size: 'normal' | 'wide' | 'full';
}

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: 'general_stats', title: 'Desempenho Geral', isVisible: true, size: 'normal' },
  { id: 'study_frequency', title: 'Frequência de Estudo', isVisible: true, size: 'normal' },
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
  onToggleReorderMode,
  onAddSession
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    const saved = localStorage.getItem('cp_dashboard_layout_v13');
    // Merge with defaults to ensure new widgets appear
    if (!saved) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(saved);
    // Check if new widget is missing
    if (!parsed.find((w: any) => w.id === 'study_frequency')) {
      return [...DEFAULT_WIDGETS];
    }
    return parsed;
  });

  const [formData, setFormData] = useState({
    subjectId: '',
    topicId: '',
    activityType: 'Questões' as ActivityType,
    duration: '',
    questionsDone: '',
    questionsCorrect: '',
    date: new Date().toISOString().split('T')[0]
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

  const handleSaveActivity = () => {
    if (!formData.subjectId || !onAddSession) return;

    onAddSession({
      id: crypto.randomUUID(),
      subjectId: formData.subjectId,
      topicId: formData.topicId || undefined,
      durationInMinutes: parseInt(formData.duration) || 0,
      date: new Date(`${formData.date}T12:00:00`).toISOString(),
      questionsDone: formData.activityType === 'Questões' ? (parseInt(formData.questionsDone) || undefined) : undefined,
      questionsCorrect: formData.activityType === 'Questões' ? (parseInt(formData.questionsCorrect) || undefined) : undefined,
      activityType: formData.activityType
    });

    setShowModal(false);
    setFormData({
      subjectId: '',
      topicId: '',
      activityType: 'Questões',
      duration: '',
      questionsDone: '',
      questionsCorrect: '',
      date: new Date().toISOString().split('T')[0]
    });
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

  const frequencyData = useMemo(() => {
    // Generate last 28 days (4 weeks)
    const today = new Date();
    const days = [];
    let streak = 0;
    let maxStreak = 0;
    let currentStreak = 0;

    // Calculate streaks
    const uniqueDays = new Set(sessions.map(s => s.date.split('T')[0]));
    const sortedDates = Array.from(uniqueDays).sort() as string[];

    // Simple streak calc
    for (let i = 0; i < sortedDates.length; i++) {
      const d = new Date(sortedDates[i]);
      const prev = i > 0 ? new Date(sortedDates[i - 1]) : null;
      if (prev && (d.getTime() - prev.getTime()) <= (86400000 * 1.5)) { // within 1.5 days approx
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    // Check if today/yesterday is in list for active streak
    const todayStr = today.toISOString().split('T')[0];
    const yestStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
    if (uniqueDays.has(todayStr) || uniqueDays.has(yestStr)) {
      streak = currentStreak;
    }

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasStudy = sessions.some(s => s.date.startsWith(dateStr));
      days.push({ date: dateStr, hasStudy, dayName: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()] });
    }
    return { days, streak };
  }, [sessions]);

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'general_stats':
        const totalDone = subjectStats.questionsData.reduce((acc, s) => acc + s.done, 0);
        const totalCorrect = subjectStats.questionsData.reduce((acc, s) => acc + s.correct, 0);
        const globalAccuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;
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
      case 'study_frequency':
        return (
          <div className="mt-2 flex flex-col h-full justify-between">
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-amber-500 leading-none">{frequencyData.streak}</span>
              <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Dias Seguidos 🔥</span>
            </div>
            <div className="flex justify-between gap-1">
              {frequencyData.days.map((day, i) => (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-full aspect-square rounded-md transition-all ${day.hasStudy ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800'}`} title={`${day.date}: ${day.hasStudy ? 'Estudou' : 'Não estudou'}`} />
                  {i >= 21 && <span className="text-[6px] font-bold text-slate-300 uppercase">{day.dayName}</span>}
                </div>
              ))}
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
          <div className="h-48 w-full mt-2" style={{ minHeight: '192px' }}>
            {weeklyData.some(d => d.h > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: chartTextColor }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Area type="monotone" dataKey="h" stroke="#2563eb" fill="#2563eb22" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados de estudo na semana</div>}
          </div>
        );
      case 'questions_by_subject':
        return (
          <div className="h-64 w-full mt-2" style={{ minHeight: '256px' }}>
            {subjectStats.questionsData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
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
            ) : <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem questões resolvidas</div>}
          </div>
        );
      case 'time_by_subject':
        return (
          <div className="h-64 w-full mt-2" style={{ minHeight: '256px' }}>
            {subjectStats.timeData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
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
            ) : <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados</div>}
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
            <span className="text-base font-black text-slate-800 dark:text-white leading-none mb-1">{sessions.reduce((acc, s) => {
              // If specific concurso selected, only count questions if subject belongs to it
              if (selectedConcursoId !== 'all') {
                const subjectIds = subjects.map(sub => sub.id);
                if (!subjectIds.includes(s.subjectId)) return acc;
              }
              return acc + (s.questionsDone || 0);
            }, 0)}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Questões</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-800 dark:text-white leading-none mb-1">
              {(sessions.reduce((acc, s) => {
                if (selectedConcursoId !== 'all') {
                  const subjectIds = subjects.map(sub => sub.id);
                  if (!subjectIds.includes(s.subjectId)) return acc;
                }
                return acc + s.durationInMinutes;
              }, 0) / 60).toFixed(1)}h
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Tempo Total</span>
          </div>
        </div>
      </div>

      <header className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Análise Estratégica 🔥</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
          >
            <span>+</span> Adicionar Atividade
          </button>
        </div>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 transition-colors"
            >
              ✕
            </button>

            <h3 className="text-xl font-black uppercase tracking-tighter mb-6 dark:text-white">Nova Atividade 📝</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Tipo</label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value as any })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500">
                    <option value="Leitura">Leitura</option>
                    <option value="Questões">Questões</option>
                    <option value="Aula">Aula</option>
                    <option value="Simulado">Simulado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Data</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Disciplina</label>
                <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicId: '' })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500">
                  <option value="">Selecione a matéria...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {formData.subjectId && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Assunto / Tópico</label>
                  <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500">
                    <option value="">Geral / Outros</option>
                    {subjects.find(s => s.id === formData.subjectId)?.topics.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Tempo Dedicado (min)</label>
                <input type="number" placeholder="Ex: 45" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500" />
              </div>

              {formData.activityType === 'Questões' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Resolvidas</label>
                    <input type="number" placeholder="0" value={formData.questionsDone} onChange={(e) => setFormData({ ...formData, questionsDone: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Acertos</label>
                    <input type="number" placeholder="0" value={formData.questionsCorrect} onChange={(e) => setFormData({ ...formData, questionsCorrect: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveActivity}
                disabled={!formData.subjectId}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all mt-4"
              >
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
