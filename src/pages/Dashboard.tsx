
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LabelList
} from 'recharts';
import { Eye, EyeOff, X, Plus, Save, Trash2, Trophy, Target, Calendar, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

import { Subject, StudySession, Concurso, Simulado, ActivityType } from '../types';
import AISuggestions from '../components/dashboard/AISuggestions';
import TimerWidget from '../components/dashboard/TimerWidget';

interface DashboardProps {
  subjects: Subject[];
  sessions: StudySession[];
  simulados: Simulado[];
  activeConcurso?: Concurso;
  selectedConcursoId: string | 'all';
  onSelectConcursoId: (id: string | 'all') => void;
  concursos: Concurso[];
  theme?: 'light' | 'dark';

  onAddSession?: (session: StudySession) => void;
  globalDailyGoal?: number;
  // Timer Props
  timeLeft?: number;
  isActive?: boolean;
  isAlarmPlaying?: boolean;
  onStartTimer?: (minutes: number) => void;
  onPauseTimer?: () => void;
  onResumeTimer?: () => void;
  onResetTimer?: () => void;
  onStopAlarm?: () => void;
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
  onAddSession,
  globalDailyGoal,
  // Timer Props
  timeLeft, isActive, isAlarmPlaying,
  onStartTimer, onPauseTimer, onResumeTimer, onResetTimer, onStopAlarm
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    const saved = localStorage.getItem('cp_dashboard_layout_v13');
    // Merge with defaults to ensure new widgets appear
    if (!saved) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(saved);
    // Remove focus_timer if present
    const filtered = parsed.filter((w: any) => w.id !== 'focus_timer');

    // Check if new widget is missing
    if (!filtered.find((w: any) => w.id === 'study_frequency')) {
      return [...DEFAULT_WIDGETS];
    }
    return filtered;
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

  // Filter sessions relevant to the current view (active context)
  const relevantSessions = useMemo(() => {
    const activeSubjectIds = new Set(subjects.map(s => s.id));
    return sessions.filter(s => activeSubjectIds.has(s.subjectId));
  }, [sessions, subjects]);

  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    // Initialize map for current week (Sunday to Saturday)
    const dataMap = days.map(day => ({ n: day, h: 0 }));

    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)

    // Calculate start of the week (last Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Filter sessions within this range
    relevantSessions.forEach(s => {
      const sDate = new Date(s.date);
      // Check if session is within the current week window
      if (sDate >= startOfWeek && sDate < endOfWeek) {
        const dayIdx = sDate.getDay();
        dataMap[dayIdx].h += (s.durationInMinutes / 60);
      }
    });

    return dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(1)) }));
  }, [relevantSessions]);

  const frequencyData = useMemo(() => {
    // Determine current streak
    const uniqueDays = new Set(relevantSessions.map(s => s.date.split('T')[0]));
    const sortedDates = Array.from(uniqueDays).sort() as string[];

    let streak = 0;
    let currentStreak = 0;

    // Calculate streak
    for (let i = 0; i < sortedDates.length; i++) {
      const d = new Date(sortedDates[i]);
      // Normalize time to noon to avoid DST issues
      d.setHours(12, 0, 0, 0);

      const prev = i > 0 ? new Date(sortedDates[i - 1]) : null;
      if (prev) prev.setHours(12, 0, 0, 0);

      if (prev) {
        const diffDays = Math.round((d.getTime() - prev.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];

    // If analyzed up to today/yesterday, that's the active streak
    if (uniqueDays.has(todayStr) || uniqueDays.has(yestStr)) {
      streak = currentStreak;
    } else {
      // Streak broken
      streak = 0;
    }

    // Calculate days studied in last 7 days
    let last7DaysCount = 0;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (uniqueDays.has(d.toISOString().split('T')[0])) last7DaysCount++;
    }

    return { streak, last7DaysCount };
  }, [relevantSessions]);

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'general_stats':
        const totalDone = subjectStats.questionsData.reduce((acc, s) => acc + s.done, 0);
        const totalCorrect = subjectStats.questionsData.reduce((acc, s) => acc + s.correct, 0);
        const globalAccuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;
        return (
          <div className="mt-2 space-y-4">
            <div>
              <p className="text-4xl font-bold text-slate-800 dark:text-white leading-none mb-1">{globalAccuracy}%</p>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Aproveitamento Global</p>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${globalAccuracy}%` }} />
            </div>
          </div>
        );
      case 'study_frequency':
        return (
          <div className="mt-2 flex flex-col h-full justify-between pb-2">
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-bold text-amber-500 leading-none">{frequencyData.streak}</span>
                <span className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 ">Dias Seguidos</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Você estudou em <strong className="text-blue-600 dark:text-blue-400">{frequencyData.last7DaysCount}</strong> dos últimos 7 dias.
              </p>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${(frequencyData.last7DaysCount / 7) * 100}%` }} />
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
              <p className="text-4xl font-bold text-emerald-500 leading-none mb-1">{simAccuracy}%</p>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Média em Simulados</p>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${simAccuracy}%` }} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{simulados.length} simulados realizados</p>
          </div>
        );
      case 'weekly_chart':
        return (
          <div className="h-48 w-full mt-2" style={{ minHeight: '192px' }}>
            {weeklyData.some(d => d.h > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: chartTextColor }} />
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
                  <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} domain={[0, 'auto']} allowDataOverflow={false} padding={{ top: 20 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                  <Bar dataKey="done" radius={[6, 6, 0, 0]} barSize={35}>
                    {subjectStats.questionsData.map((entry, index) => <Cell key={index} fill={entry.hexColor} />)}
                    <LabelList
                      dataKey="done"
                      position="top"
                      offset={5}
                      fill={isDarkMode ? '#94a3b8' : '#64748b'}
                      style={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
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
                  <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} domain={[0, 'auto']} allowDataOverflow={false} padding={{ top: 20 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={35}>
                    {subjectStats.timeData.map((entry, index) => <Cell key={index} fill={entry.hexColor} />)}
                    <LabelList
                      dataKey="hours"
                      position="top"
                      offset={5}
                      formatter={(val: number) => `${val}h`}
                      fill={isDarkMode ? '#94a3b8' : '#64748b'}
                      style={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
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
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400"><Trophy size={20} /></div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wide leading-none mb-1.5">Meta Ativa</p>
            <select
              value={selectedConcursoId}
              onChange={(e) => onSelectConcursoId(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="all">Visão Global</option>
              {concursos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-6 px-4">
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-800 dark:text-white leading-none mb-1">
              {activeConcurso ? Math.floor((new Date().getTime() - new Date(activeConcurso.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
            </span>
            <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wide">Decorridos</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-base font-bold leading-none mb-1 ${activeConcurso?.targetDate ? 'text-rose-500' : 'text-slate-300'}`}>
              {activeConcurso?.targetDate ? Math.ceil((new Date(activeConcurso.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : '-'}
            </span>
            <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wide">Restantes</span>
          </div>
          <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-2" />
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-800 dark:text-white leading-none mb-1">{subjects.length}</span>
            <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wide">Matérias</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-800 dark:text-white leading-none mb-1">{sessions.reduce((acc, s) => {
              // If specific concurso selected, only count questions if subject belongs to it
              if (selectedConcursoId !== 'all') {
                const subjectIds = subjects.map(sub => sub.id);
                if (!subjectIds.includes(s.subjectId)) return acc;
              }
              return acc + (s.questionsDone || 0);
            }, 0)}</span>
            <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wide">Questões</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-800 dark:text-white leading-none mb-1">
              {(sessions.reduce((acc, s) => {
                if (selectedConcursoId !== 'all') {
                  const subjectIds = subjects.map(sub => sub.id);
                  if (!subjectIds.includes(s.subjectId)) return acc;
                }
                return acc + s.durationInMinutes;
              }, 0) / 60).toFixed(1)}h
            </span>
            <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wide">Tempo Total</span>
          </div>
        </div>

        {/* Daily Goal Widget */}
        <div className="hidden lg:flex flex-col items-end justify-center pl-6 border-l border-slate-100 dark:border-slate-800 ml-auto min-w-[150px]">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Meta Diária</span>
          <div className="flex items-end gap-2">
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const doneToday = sessions
                .filter(s => s.date.startsWith(todayStr) && s.questionsDone !== undefined)
                .reduce((acc, s) => acc + (s.questionsDone || 0), 0);
              const goal = globalDailyGoal || 20; // fallback default
              const remaining = Math.max(0, goal - doneToday);

              if (remaining === 0) {
                return (
                  <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg animate-in fade-in zoom-in-95 duration-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-base">🏆</span>
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none">Meta Diária Batida!</span>
                  </div>
                );
              }

              return (
                <>
                  <span className="text-2xl font-black leading-none text-slate-800 dark:text-white">
                    {remaining}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Faltam</span>
                </>
              );
            })()}
          </div>
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const doneToday = sessions
              .filter(s => s.date.startsWith(todayStr) && s.questionsDone !== undefined)
              .reduce((acc, s) => acc + (s.questionsDone || 0), 0);
            const goal = globalDailyGoal || 20;
            const pct = Math.min(100, Math.round((doneToday / goal) * 100));
            return (
              <div className="w-full flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{doneToday} / {goal} Feitas</span>
              </div>
            )
          })()}
        </div>
      </div>

      <header className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">Análise Estratégica <TrendingUp size={20} className="text-blue-500" /></h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Adicionar Atividade
          </button>
        </div>
        <button onClick={() => {
          setIsEditMode(!isEditMode);
          onToggleReorderMode?.(!isEditMode);
        }} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${isEditMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>
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
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{widget.title}</h4>
                {isEditMode && (
                  <div className="flex gap-2">
                    <button onClick={() => cycleSize(widget.id)} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight text-slate-500">Tam: {widget.size}</button>
                    <button onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, isVisible: !w.isVisible } : w))} className="text-slate-500 hover:text-blue-500">{widget.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
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
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold uppercase tracking-tight mb-6 dark:text-white flex items-center gap-2">Nova Atividade <Clock size={20} className="text-blue-500" /></h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Tipo</label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value as any })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500">
                    <option value="Leitura">Leitura</option>
                    <option value="Questões">Questões</option>
                    <option value="Aula">Aula</option>
                    <option value="Simulado">Simulado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Data</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Disciplina</label>
                <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicId: '' })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500">
                  <option value="">Selecione a matéria...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {formData.subjectId && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Assunto / Tópico</label>
                  <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500">
                    <option value="">Geral / Outros</option>
                    {subjects.find(s => s.id === formData.subjectId)?.topics.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Tempo Dedicado (min)</label>
                <input type="number" placeholder="Ex: 45" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-blue-500" />
              </div>

              {formData.activityType === 'Questões' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Resolvidas</label>
                    <input type="number" placeholder="0" value={formData.questionsDone} onChange={(e) => setFormData({ ...formData, questionsDone: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Acertos</label>
                    <input type="number" placeholder="0" value={formData.questionsCorrect} onChange={(e) => setFormData({ ...formData, questionsCorrect: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveActivity}
                disabled={!formData.subjectId}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
              >
                <Save size={16} /> Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
