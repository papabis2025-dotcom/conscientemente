
import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LabelList
} from 'recharts';
import { Eye, EyeOff, X, Trophy, Maximize2, Clock, Target } from 'lucide-react';

import { Subject, StudySession, Concurso, Simulado, ScheduledStudy } from '../types';
import { getColorHex } from '../utils/colors';

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
  studyTasks?: { id: string, subjectId: string, subjectName: string, done: boolean, date: string }[];
  onUpdateTasks?: (tasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => void;
  scheduledStudies?: ScheduledStudy[];
  onToggleReorderMode?: (isReorder: boolean) => void;
}

interface WidgetState {
  id: string;
  title: string;
  isVisible: boolean;
  size: 'normal' | 'wide' | 'full';
}

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: 'general_stats', title: 'Desempenho Geral', isVisible: true, size: 'wide' },
  { id: 'study_frequency', title: 'Disciplina e Assunto', isVisible: true, size: 'normal' },
  { id: 'study_tasks', title: 'Tarefas Pendentes', isVisible: true, size: 'normal' },
  { id: 'weekly_chart', title: 'Volume de Estudo', isVisible: true, size: 'wide' },
  { id: 'activity_calendar', title: 'Calendário de Atividades', isVisible: true, size: 'wide' },
  { id: 'unified_subject_analysis', title: 'Análise por Disciplina', isVisible: true, size: 'normal' },
];

const getAcronym = (name: string) => {
  if (!name) return '??';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase();
  }
  return name.substring(0, 4).toUpperCase();
};
const getPerformanceColor = (percentage: number) => {
  if (percentage < 50) return 'text-red-500';
  if (percentage < 75) return 'text-amber-500';
  return 'text-emerald-500';
};

const getPerformanceColorHex = (percentage: number) => {
  if (percentage < 50) return '#ef4444';
  if (percentage < 75) return '#f59e0b';
  return '#10b981';
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
  onStartTimer, onPauseTimer, onResumeTimer, onResetTimer, onStopAlarm,
  studyTasks = [],
  onUpdateTasks,
  scheduledStudies = []
}) => {
  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    const saved = localStorage.getItem('cp_dashboard_layout_v20');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);
  const [activeWeeklyPeriod, setActiveWeeklyPeriod] = useState<'weekly' | 'monthly' | 'annual'>('weekly');
  const [activeWeeklyTab, setActiveWeeklyTab] = useState<'hours' | 'questions'>('hours');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'questions' | 'time' | 'performance'>('questions');

  const isDarkMode = theme === 'dark';
  const chartTextColor = isDarkMode ? '#94a3b8' : '#64748b';

  useEffect(() => { localStorage.setItem('cp_dashboard_layout_v20', JSON.stringify(widgets)); }, [widgets]);

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

  // A session is a simulado session only if it explicitly says so via its own flags.
  // Do NOT cross-reference scheduledStudies by ID — both session and scheduledStudy
  // share the same ID in this app, so st.id === session.id would wrongly filter
  // out normal study sessions.
  const isSimuladoSession = (session: any): boolean =>
    !!(session.isSimulado || session.activityType === 'Simulado');

  // Convert UTC timestamp to local YYYY-MM-DD string to avoid timezone bugs
  // where a session done at 22:00 local time becomes "tomorrow" in UTC.
  const getLocalSessionDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return dateStr;
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
        stats[sub.name].minutes += (session.durationInMinutes || 0);
      }
    });

    const list = Object.values(stats)
      .map(s => ({
        ...s,
        accuracy: s.done > 0 ? Math.round((s.correct / s.done) * 100) : 0,
        hours: parseFloat((s.minutes / 60).toFixed(2)),
        hexColor: getColorHex(s.colorClass),
        acronym: getAcronym(s.name)
      }));

    return {
      all: list,
      questionsData: list.filter(s => s.done > 0).sort((a, b) => b.done - a.done),
      timeData: list.filter(s => s.minutes > 0).sort((a, b) => b.minutes - a.minutes),
      performanceData: list.filter(s => s.done > 0).sort((a, b) => b.accuracy - a.accuracy),
      best: [...list].filter(s => s.done > 0).sort((a, b) => b.accuracy - a.accuracy)[0] || null,
      worst: list.filter(s => s.done > 0).length > 0 ? [...list].filter(s => s.done > 0).sort((a, b) => a.accuracy - b.accuracy)[0] : null
    };
  }, [sessions, subjects]);

  const topicStats = useMemo(() => {
    const stats: Record<string, { done: number, correct: number, title: string, subjectName: string }> = {};

    sessions.forEach(session => {
      if (!session.topicId) return;

      const sub = subjects.find(s => s.id === session.subjectId);
      if (!sub) return;

      const topic = sub.topics?.find(t => t.id === session.topicId);
      if (!topic) return;

      const key = `${session.subjectId}_${session.topicId}`;
      if (!stats[key]) {
        stats[key] = {
          done: 0,
          correct: 0,
          title: topic.title,
          subjectName: sub.name
        };
      }
      stats[key].done += (session.questionsDone || 0);
      stats[key].correct += (session.questionsCorrect || 0);
    });

    const list = Object.values(stats)
      .filter(t => t.done > 0)
      .map(t => ({
        ...t,
        accuracy: Math.round((t.correct / t.done) * 100)
      }));

    const sorted = [...list].sort((a, b) => b.accuracy - a.accuracy);
    const best = sorted[0] || null;
    const worst = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    return { best, worst };
  }, [sessions, subjects]);

  // Build a set of subject IDs for the selected concurso/edital.
  const allSubjectIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedConcursoId === 'all') {
      concursos.forEach(c => (c.subjects || []).forEach(s => ids.add(s.id)));
    } else {
      const activeC = concursos.find(c => c.id === selectedConcursoId);
      if (activeC) {
        (activeC.subjects || []).forEach(s => ids.add(s.id));
      }
    }
    // Also include the currently filtered subjects
    subjects.forEach(s => ids.add(s.id));
    console.debug('[Dashboard] allSubjectIds:', ids.size, 'total sessions:', sessions.length);
    return ids;
  }, [concursos, subjects, selectedConcursoId]);

  // Filter sessions relevant to the weekly chart (all subjects, including simulados)
  const relevantSessions = useMemo(() => {
    const filtered = sessions.filter(s => allSubjectIds.has(s.subjectId));
    console.debug('[Dashboard] relevantSessions:', filtered.length, '/', sessions.length,
      '| sample dates:', filtered.slice(0, 3).map(s => s.date),
      '| allSubjectIds has sessions?', sessions.slice(0, 3).map(s => ({ id: s.subjectId, has: allSubjectIds.has(s.subjectId), isSimulado: isSimuladoSession(s) }))
    );
    return filtered;
  }, [sessions, allSubjectIds]);

  const progress = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const done = sessions
      .filter(s => getLocalSessionDate(s.date) === todayStr && s.questionsDone !== undefined)
      .reduce((acc, s) => acc + (Number(s.questionsDone) || 0), 0);
    return { total: done, goal: globalDailyGoal || 20 };
  }, [sessions, globalDailyGoal]);

  const { weeklyData, weeklyQuestionsData } = useMemo(() => {
    const today = new Date();

    if (activeWeeklyPeriod === 'weekly') {
      // Weekly view: Rolling last 7 days
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      const dataMap: { n: string; h: number; q: number; dateStr: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dataMap.push({
          n: days[d.getDay()],
          h: 0,
          q: 0,
          dateStr: dStr
        });
      }

      relevantSessions.forEach(s => {
        const sDateStr = getLocalSessionDate(s.date);
        if (!sDateStr) return;
        const match = dataMap.find(d => d.dateStr === sDateStr);
        if (match) {
          match.h += (Number(s.durationInMinutes) || 0) / 60;
          match.q += (Number(s.questionsDone) || 0);
        }
      });

      const finalData = dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(2)) }));
      return { weeklyData: finalData, weeklyQuestionsData: finalData };
    }

    else if (activeWeeklyPeriod === 'monthly') {
      // Monthly view: Weeks of current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Calculate number of weeks in month
      const firstDayOfWeek = startOfMonth.getDay();
      const daysInMonth = endOfMonth.getDate();
      const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);

      const dataMap = Array.from({ length: weeksInMonth }, (_, i) => ({
        n: `Sem ${i + 1}`,
        h: 0,
        q: 0
      }));

      relevantSessions.forEach(s => {
        const sDateStr = getLocalSessionDate(s.date);
        if (!sDateStr) return;
        const [sYear, sMonth, sDay] = sDateStr.split('-').map(Number);
        
        if (sYear === today.getFullYear() && sMonth - 1 === today.getMonth()) {
          const weekIndex = Math.floor((sDay - 1 + firstDayOfWeek) / 7);
          if (weekIndex < weeksInMonth) {
            dataMap[weekIndex].h += (Number(s.durationInMinutes) || 0) / 60;
            dataMap[weekIndex].q += (Number(s.questionsDone) || 0);
          }
        }
      });

      const finalData = dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(2)) }));
      return { weeklyData: finalData, weeklyQuestionsData: finalData };
    }

    else {
      // Annual view: Months of current year
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const dataMap = months.map(month => ({ n: month, h: 0, q: 0 }));
      const currentYear = today.getFullYear();

      relevantSessions.forEach(s => {
        const sDateStr = getLocalSessionDate(s.date);
        if (!sDateStr) return;
        const [sYear, sMonth] = sDateStr.split('-').map(Number);
        
        if (sYear === currentYear) {
          const monthIdx = sMonth - 1;
          dataMap[monthIdx].h += (Number(s.durationInMinutes) || 0) / 60;
          dataMap[monthIdx].q += (Number(s.questionsDone) || 0);
        }
      });

      const finalData = dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(2)) }));
      return { weeklyData: finalData, weeklyQuestionsData: finalData };
    }
  }, [relevantSessions, activeWeeklyPeriod]);

  const frequencyData = useMemo(() => {
    // Determine current streak
    const uniqueDays = new Set(relevantSessions.map(s => getLocalSessionDate(s.date)).filter(Boolean));
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

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
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
        const generalDone = sessions.filter(s => !isSimuladoSession(s)).reduce((acc, s) => acc + (s.questionsDone || 0), 0);
        const generalCorrect = sessions.filter(s => !isSimuladoSession(s)).reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
        const globalAccuracy = generalDone > 0 ? Math.round((generalCorrect / generalDone) * 100) : 0;

        const simDone = simulados.reduce((acc, s) => acc + (s.results || []).reduce((a, r) => a + r.done, 0), 0);
        const simCorrect = simulados.reduce((acc, s) => acc + (s.results || []).reduce((a, r) => a + r.correct, 0), 0);
        const simAccuracy = simDone > 0 ? Math.round((simCorrect / simDone) * 100) : 0;

        const globalColor = getPerformanceColor(globalAccuracy);
        const globalColorHex = getPerformanceColorHex(globalAccuracy);
        const simColor = getPerformanceColor(simAccuracy);
        const simColorHex = getPerformanceColorHex(simAccuracy);

        const totalMinutes = relevantSessions.reduce((acc, s) => acc + (Number(s.durationInMinutes) || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);

        return (
          <div className="flex flex-row items-center justify-around h-full gap-6 px-6 max-w-2xl mx-auto py-1">
            {/* General Stats */}
            <div className="flex flex-col items-center justify-center flex-1 gap-2">
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                <div className="relative w-full h-full max-w-[110px] max-h-[110px] md:max-w-[120px] md:max-h-[120px]">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100 dark:text-zinc-800" />
                    <circle
                      cx="50" cy="50" r="40"
                      stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * globalAccuracy) / 100}
                      className={`${globalColor} transition-all duration-1000 ease-out`}
                      strokeLinecap="round"
                      style={{ color: globalColorHex }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black leading-none text-zinc-900 dark:text-white" style={{ color: globalColorHex }}>{globalAccuracy}%</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-bold mt-1">{generalDone} q</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0 mt-1">Questões</p>
            </div>

            {/* Divider */}
            <div className="w-px bg-zinc-100 dark:bg-zinc-800 self-stretch my-3 shrink-0" />

            {/* Simulado Stats */}
            <div className="flex flex-col items-center justify-center flex-1 gap-2">
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                <div className="relative w-full h-full max-w-[110px] max-h-[110px] md:max-w-[120px] md:max-h-[120px]">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100 dark:text-zinc-800" />
                    <circle
                      cx="50" cy="50" r="40"
                      stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * simAccuracy) / 100}
                      className={`${simColor} transition-all duration-1000 ease-out`}
                      strokeLinecap="round"
                      style={{ color: simColorHex }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black leading-none text-zinc-900 dark:text-white" style={{ color: simColorHex }}>{simAccuracy}%</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-bold mt-1">{simDone} q</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0 mt-1">Simulados</p>
            </div>
          </div>
        );
      case 'study_frequency':
        const bestSub = subjectStats.best;
        const worstSub = subjectStats.worst;
        const bestTop = topicStats.best;
        const worstTop = topicStats.worst;

        if (!bestSub && !bestTop) {
          return (
            <div className="flex flex-col items-center justify-center h-full opacity-60 space-y-2 py-4">
              <div className="text-2xl animate-pulse">📚</div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 text-center uppercase tracking-wide">
                Nenhuma disciplina ou assunto estudado ainda.
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-2 gap-3 h-full py-0.5 px-0.5 min-h-0">
            {/* Melhor Desempenho */}
            <div className="flex flex-col gap-1.5 min-h-0">
              <div className="flex items-center gap-1 mb-0.5 shrink-0">
                <span className="w-1.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Melhor</span>
              </div>
              
              <div className="flex flex-col gap-1.5 flex-1 min-h-0 justify-between">
                {bestSub ? (
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-2 flex items-center justify-between gap-1.5 flex-1 min-h-[42px]">
                    <div className="min-w-0">
                      <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none">Disciplina</p>
                      <h5 className="text-[10px] font-black text-zinc-700 dark:text-zinc-200 truncate mt-0.5 leading-tight" title={bestSub.name}>{bestSub.name}</h5>
                    </div>
                    <span className="text-xs font-black text-emerald-500 shrink-0 ml-auto">{bestSub.accuracy}%</span>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-2 flex items-center justify-center text-[8px] text-zinc-400 font-bold flex-1 min-h-[42px]">Sem dados</div>
                )}
                
                {bestTop ? (
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-2 flex items-center justify-between gap-1.5 flex-1 min-h-[42px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none">Assunto</p>
                      <h5 className="text-[9px] font-black text-zinc-700 dark:text-zinc-200 truncate mt-0.5 leading-tight" title={bestTop.title}>{bestTop.title}</h5>
                      <p className="text-[7px] text-zinc-400 truncate leading-none mt-0.5">{bestTop.subjectName}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-500 shrink-0 ml-1.5">{bestTop.accuracy}%</span>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-2 flex items-center justify-center text-[8px] text-zinc-400 font-bold flex-1 min-h-[42px]">Sem dados</div>
                )}
              </div>
            </div>

            {/* Pior Desempenho */}
            <div className="flex flex-col gap-1.5 min-h-0">
              <div className="flex items-center gap-1 mb-0.5 shrink-0">
                <span className="w-1.5 h-2.5 bg-rose-500 rounded-full" />
                <span className="text-[8px] font-black text-rose-655 dark:text-rose-450 uppercase tracking-wider">Atenção (Pior)</span>
              </div>
              
              <div className="flex flex-col gap-1.5 flex-1 min-h-0 justify-between">
                {worstSub ? (
                  <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-2 flex items-center justify-between gap-1.5 flex-1 min-h-[42px]">
                    <div className="min-w-0">
                      <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none">Disciplina</p>
                      <h5 className="text-[10px] font-black text-zinc-700 dark:text-zinc-200 truncate mt-0.5 leading-tight" title={worstSub.name}>{worstSub.name}</h5>
                    </div>
                    <span className="text-xs font-black text-rose-500 shrink-0 ml-auto">{worstSub.accuracy}%</span>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-2 flex items-center justify-center text-[8px] text-zinc-400 font-bold flex-1 min-h-[42px]">Sem dados</div>
                )}

                {worstTop ? (
                  <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-2 flex items-center justify-between gap-1.5 flex-1 min-h-[42px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none">Assunto</p>
                      <h5 className="text-[9px] font-black text-zinc-700 dark:text-zinc-200 truncate mt-0.5 leading-tight" title={worstTop.title}>{worstTop.title}</h5>
                      <p className="text-[7px] text-zinc-400 truncate leading-none mt-0.5">{worstTop.subjectName}</p>
                    </div>
                    <span className="text-xs font-black text-rose-500 shrink-0 ml-1.5">{worstTop.accuracy}%</span>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-2 flex items-center justify-center text-[8px] text-zinc-400 font-bold flex-1 min-h-[42px]">Sem dados</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'study_tasks': {
        const todayMs = new Date().setHours(0, 0, 0, 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const upcomingReviews: { subjectName: string; topicName: string; daysUntil: number; reviewType: string }[] = [];

        // Add Planner Pending Tasks (Planejado para hoje ou atrasado)
        const pendingStudies = (scheduledStudies || []).filter(s => s.status === 'planejado' && s.date <= todayStr && s.activityType !== 'Simulado');
        pendingStudies.forEach(s => {
          const sub = subjects.find(sub => sub.id === s.subjectId);
          if (sub) {
            const topic = sub.topics?.find(t => t.id === s.topicId);
            let sDateMs = new Date(s.date).getTime();
            // Handle timezone issues manually
            sDateMs += new Date(s.date).getTimezoneOffset() * 60000;
            const sDateNoon = new Date(sDateMs).setHours(12, 0, 0, 0);
            const todayNoon = new Date().setHours(12, 0, 0, 0);
            
            const diffDays = Math.round((todayNoon - sDateNoon) / (1000 * 60 * 60 * 24));
            upcomingReviews.push({ 
              subjectName: sub.name, 
              topicName: topic?.title || s.activityType || 'Estudo Pendente', 
              daysUntil: diffDays < 0 ? 0 : diffDays, // 0 means Today, diffDays > 0 means Delayed
              reviewType: diffDays > 0 ? 'Tarefa Atrasada' : 'Tarefa Programada'
            });
          }
        });

        // Find upcoming reviews (topics with sessions 7 or 30 days ago)

        subjects.forEach(sub => {
          (sub.topics || []).forEach(topic => {
            const topicSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id && !isSimuladoSession(s));
            if (topicSessions.length > 0) {
              const lastTopicDate = new Date([...topicSessions].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]?.date || 0);
              lastTopicDate.setHours(0, 0, 0, 0);
              const diffDays = Math.round((todayMs - lastTopicDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysTo7 = 7 - diffDays;
              const daysTo30 = 30 - diffDays;
              const daysTo90 = 90 - diffDays;
              if (daysTo7 >= 0 && daysTo7 <= 7) {
                upcomingReviews.push({ subjectName: sub.name, topicName: topic.title, daysUntil: daysTo7, reviewType: 'Revisão 7d' });
              } else if (daysTo30 >= 0 && daysTo30 <= 7) {
                upcomingReviews.push({ subjectName: sub.name, topicName: topic.title, daysUntil: daysTo30, reviewType: 'Revisão 30d' });
              } else if (daysTo90 >= 0 && daysTo90 <= 7) {
                upcomingReviews.push({ subjectName: sub.name, topicName: topic.title, daysUntil: daysTo90, reviewType: 'Revisão 90d' });
              }
            }
          });
        });

        upcomingReviews.sort((a, b) => a.daysUntil - b.daysUntil);

        return (
          <div className="flex flex-col h-full gap-2">
            {upcomingReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-60 space-y-2">
                <div className="w-9 h-9 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-base shadow-sm">✅</div>
                <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Nenhuma atividade pendente!</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-full pr-1">
                {upcomingReviews.slice(0, 3).map((rev, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black ${
                      rev.daysUntil === 0 ? 'bg-rose-500 text-white' : rev.daysUntil <= 2 ? 'bg-amber-400 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {rev.daysUntil === 0 ? 'Hoje' : `${rev.daysUntil}d`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 truncate">{rev.subjectName}</p>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">{rev.topicName}</p>
                    </div>
                    <span className="shrink-0 text-[8px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">{rev.reviewType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'weekly_chart':
        return (
          <div className="flex flex-col h-full">
            {/* Controls Row */}
            <div className="flex items-center justify-between mb-2 shrink-0 flex-wrap gap-1">
              <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-800/50 p-0.5 rounded-lg">
                <button
                  onClick={() => setActiveWeeklyTab('hours')}
                  className={`py-0.5 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${activeWeeklyTab === 'hours' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Tempo
                </button>
                <button
                  onClick={() => setActiveWeeklyTab('questions')}
                  className={`py-0.5 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${activeWeeklyTab === 'questions' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Questões
                </button>
              </div>

              <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-800/50 p-0.5 rounded-lg">
                <button
                  onClick={() => setActiveWeeklyPeriod('weekly')}
                  className={`py-0.5 px-1.5 rounded-md text-[8px] font-bold uppercase tracking-wide transition-all ${activeWeeklyPeriod === 'weekly' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Sem
                </button>
                <button
                  onClick={() => setActiveWeeklyPeriod('monthly')}
                  className={`py-0.5 px-1.5 rounded-md text-[8px] font-bold uppercase tracking-wide transition-all ${activeWeeklyPeriod === 'monthly' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Mês
                </button>
                <button
                  onClick={() => setActiveWeeklyPeriod('annual')}
                  className={`py-0.5 px-1.5 rounded-md text-[8px] font-bold uppercase tracking-wide transition-all ${activeWeeklyPeriod === 'annual' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Ano
                </button>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              {activeWeeklyTab === 'hours' ? (
                weeklyData.some(d => d.h > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData} margin={{ top: 5, right: 0, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="colorH" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                      <YAxis width={30} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} formatter={(val: any) => `${val}h`} />
                      <Area type="monotone" dataKey="h" stroke="#3b82f6" fill="url(#colorH)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem dados de tempo</div>
              ) : (
                weeklyQuestionsData.some(d => d.q > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyQuestionsData} margin={{ top: 20, right: 0, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                      <YAxis width={30} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} formatter={(val: any) => `${val} q`} />
                      <Bar dataKey="q" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20}>
                        <LabelList
                          dataKey="q"
                          position="top"
                          offset={5}
                          fill={isDarkMode ? '#e2e8f0' : '#64748b'}
                          style={{ fontSize: '10px', fontWeight: 'bold' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem questões feitas</div>
              )}
            </div>
          </div>
        );
      case 'activity_calendar': {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const monthName = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][month];

        const days = Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, month, i + 1);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const simuladoSessions = scheduledStudies.filter(st => st.activityType === 'Simulado');
          const daySessions = sessions.filter(s => getLocalSessionDate(s.date) === dateStr && !isSimuladoSession(s));
          const dayPlannerRealized = scheduledStudies.filter(s => s.date === dateStr && s.status === 'realizado' && s.activityType !== 'Simulado');
          
          const sessionSubjectIds = daySessions.map(s => s.subjectId);
          const plannerSubjectIds = dayPlannerRealized.map(s => s.subjectId);
          
          const allDaySubjectIds = Array.from(new Set([...sessionSubjectIds, ...plannerSubjectIds]));
          const daySubjects = allDaySubjectIds
            .map(id => subjects.find(sub => sub.id === id))
            .filter(Boolean) as Subject[];

          return {
            day: i + 1,
            subjects: daySubjects,
            isToday: date.toDateString() === today.toDateString()
          };
        });

        return (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header: month + weekday labels */}
            <div className="shrink-0 mb-1">
              <div className="flex justify-between items-center mb-1.5 px-0.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{monthName} {year}</span>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[9px] font-black text-zinc-300 dark:text-zinc-600 uppercase">{d}</div>
                ))}
              </div>
            </div>
            {/* Calendar grid — fills remaining space without overflow */}
            <div className="grid grid-cols-7 gap-1 flex-1 min-h-0" style={{ gridAutoRows: '1fr' }}>
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map(d => (
                <div
                  key={d.day}
                  className={`rounded-lg flex flex-col items-center justify-center relative border overflow-hidden ${
                    d.isToday
                      ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/15'
                      : 'border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors'
                  }`}
                >
                  <span className={`text-[10px] font-bold leading-none ${d.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {d.day}
                  </span>
                  {d.subjects.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-[2px] mt-0.5 max-w-full px-0.5">
                      {d.subjects.slice(0, 3).map(sub => (
                        <div key={sub.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: getColorHex(sub.color) }} title={sub.name} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'unified_subject_analysis':
        return (
          <div className="flex flex-col h-full">
            {/* Header / Tabs */}
            <div className="flex items-center gap-1 mb-2 bg-zinc-50 dark:bg-zinc-800/50 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setActiveAnalysisTab('questions')}
                className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'questions' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Questões
              </button>
              <button
                onClick={() => setActiveAnalysisTab('time')}
                className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'time' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Tempo
              </button>
              <button
                onClick={() => setActiveAnalysisTab('performance')}
                className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'performance' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Desempenho
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 w-full">
              {activeAnalysisTab === 'questions' && (
                subjectStats.questionsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectStats.questionsData} margin={{ top: 5, right: 0, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                      <YAxis width={30} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} domain={[0, 'auto']} allowDataOverflow={false} padding={{ top: 20 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                      <Bar dataKey="done" radius={[6, 6, 0, 0]} barSize={35} animationDuration={500}>
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
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem questões resolvidas</div>
              )}

              {activeAnalysisTab === 'time' && (
                subjectStats.timeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectStats.timeData} margin={{ top: 5, right: 0, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                      <YAxis width={30} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} domain={[0, 'auto']} allowDataOverflow={false} padding={{ top: 20 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                      <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={35} animationDuration={500}>
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
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem dados de tempo</div>
              )}

              {activeAnalysisTab === 'performance' && (
                subjectStats.performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectStats.performanceData} margin={{ top: 5, right: 0, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="acronym" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartTextColor }} />
                      <YAxis width={30} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor }} domain={[0, 100]} padding={{ top: 20 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff' }} />
                      <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} barSize={35} animationDuration={500}>
                        {subjectStats.performanceData.map((entry, index) => (
                          <Cell key={index} fill={entry.hexColor} />
                        ))}
                        <LabelList
                          dataKey="accuracy"
                          position="top"
                          offset={5}
                          formatter={(val: number) => `${val}%`}
                          fill={isDarkMode ? '#94a3b8' : '#64748b'}
                          style={{ fontSize: '11px', fontWeight: 'bold' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem dados de desempenho</div>
              )}
            </div>
          </div>
        );
      default: return null;
    }
  };


    return (
    <div className="space-y-4 lg:space-y-3 animate-in fade-in duration-500 lg:pb-0 pb-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-1">
        <div>
          <h2 className="text-xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">Dashboard</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm">
             <Trophy size={16} className="text-amber-500" />
             <select
                value={selectedConcursoId}
                onChange={(e) => onSelectConcursoId(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-black text-zinc-800 dark:text-white cursor-pointer w-32 uppercase tracking-wide"
             >
                <option value="all">Visão Global</option>
                {concursos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
          
          <button onClick={() => {
            setIsEditMode(!isEditMode);
            onToggleReorderMode?.(!isEditMode);
          }} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'}`}>
            {isEditMode ? 'Salvar Painel' : 'Ajustar Layout'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-auto lg:h-[calc(100vh-125px)] lg:grid-rows-[28fr_36fr_36fr]">
        {widgets.map((widget, index) => {
          if (!widget.isVisible && !isEditMode) return null;
          const sizeClass = widget.size === 'full' ? 'md:col-span-3' : widget.size === 'wide' ? 'md:col-span-2' : 'md:col-span-1';

          // Define heights for different widgets
          const heightClass = (() => {
            if (widget.id === 'general_stats') return 'lg:h-full md:h-[180px] h-[180px] min-h-[170px]';
            if (widget.id === 'study_frequency') return 'lg:h-full md:h-[200px] h-[200px] min-h-[180px]';
            if (widget.id === 'study_tasks') return 'lg:h-full md:h-[250px] h-[250px] min-h-[230px]';
            if (widget.id === 'weekly_chart') return 'lg:h-full md:h-[250px] h-[250px] min-h-[230px]';
            if (widget.id === 'activity_calendar') return 'lg:h-full md:h-[250px] h-[250px] min-h-[230px]';
            if (widget.id === 'unified_subject_analysis') return 'lg:h-full md:h-[250px] h-[250px] min-h-[230px]';
            return 'h-auto';
          })();

          return (
            <div
              key={widget.id}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${sizeClass} ${heightClass} ${widget.isVisible ? 'opacity-100' : 'opacity-40'} bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative group hover:shadow-md transition-all duration-300 flex flex-col ${isEditMode ? 'cursor-move ring-2 ring-emerald-500/20' : ''} ${draggedWidgetIndex === index ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h4 className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-full">{widget.id === 'study_tasks' ? 'Tarefas Pendentes' : widget.id === 'study_frequency' ? 'Disciplina e Assunto' : widget.title}</h4>
                <div className="flex gap-2 items-center">
                  {!isEditMode && ['weekly_chart', 'activity_calendar', 'unified_subject_analysis'].includes(widget.id) && (
                    <button
                      onClick={() => setFullscreenWidgetId(widget.id)}
                      className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-300 transition-colors p-1"
                      title="Expandir Gráfico"
                    >
                      <Maximize2 size={13} />
                    </button>
                  )}
                  {isEditMode && (
                    <div className="flex gap-2">
                      <button onClick={() => cycleSize(widget.id)} className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight text-zinc-500">Tam: {widget.size}</button>
                      <button onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, isVisible: !w.isVisible } : w))} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-300">{widget.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {renderWidgetContent(widget.id)}
              </div>
            </div>
          );
        })}
      </div>

      {fullscreenWidgetId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full h-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl p-8 relative flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">
                {widgets.find(w => w.id === fullscreenWidgetId)?.title}
              </h3>
              <button
                onClick={() => setFullscreenWidgetId(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <div className="w-full h-full [&>div]:!h-full [&>div]:!min-h-0">
                {renderWidgetContent(fullscreenWidgetId)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
