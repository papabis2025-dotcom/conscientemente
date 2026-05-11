
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LabelList
} from 'recharts';
import { Eye, EyeOff, X, Save, Trash2, Trophy, Target, Clock, CheckCircle, AlertTriangle, TrendingUp, Maximize2, Minimize2, Check } from 'lucide-react';

import { Subject, StudySession, Concurso, Simulado, ActivityType, ScheduledStudy } from '../types';
import { getColorHex } from '../utils/colors';
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
  { id: 'study_frequency', title: 'Informações e Metas', isVisible: true, size: 'normal' },
  { id: 'study_tasks', title: 'Revisões Pendentes', isVisible: true, size: 'normal' },
  { id: 'weekly_chart', title: 'Volume de Estudo', isVisible: true, size: 'wide' },
  { id: 'activity_calendar', title: 'Calendário de Atividades', isVisible: true, size: 'wide' },
  { id: 'unified_subject_analysis', title: 'Análise por Disciplina', isVisible: true, size: 'wide' },
];

const getAcronym = (name: string) => {
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
    const saved = localStorage.getItem('cp_dashboard_layout_v19');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';
  const chartTextColor = isDarkMode ? '#94a3b8' : '#64748b';

  useEffect(() => { localStorage.setItem('cp_dashboard_layout_v19', JSON.stringify(widgets)); }, [widgets]);

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

  // Filter sessions relevant to the current view (active context)
  const relevantSessions = useMemo(() => {
    const activeSubjectIds = new Set(subjects.map(s => s.id));
    return sessions.filter(s => activeSubjectIds.has(s.subjectId));
  }, [sessions, subjects]);

  const progress = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const done = sessions
      .filter(s => s.date.startsWith(todayStr) && s.questionsDone !== undefined)
      .reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    return { total: done, goal: globalDailyGoal || 20 };
  }, [sessions, globalDailyGoal]);

  const { weeklyData, weeklyQuestionsData } = useMemo(() => {
    const today = new Date();

    if (activeWeeklyPeriod === 'weekly') {
      // Weekly view: Rolling last 7 days
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      const dataMap = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dataMap.push({
          n: days[d.getDay()],
          h: 0,
          q: 0,
          dateStr: d.toDateString() // Use Key for matching strings
        });
      }

      relevantSessions.forEach(s => {
        const sDate = new Date(s.date);
        const match = dataMap.find(d => d.dateStr === sDate.toDateString());
        if (match) {
          match.h += (s.durationInMinutes / 60);
          match.q += (s.questionsDone || 0);
        }
      });

      const finalData = dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(1)) }));
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
        const sDate = new Date(s.date);
        if (sDate >= startOfMonth && sDate <= endOfMonth) {
          const dayOfMonth = sDate.getDate();
          const weekIndex = Math.floor((dayOfMonth - 1 + firstDayOfWeek) / 7);
          if (weekIndex < weeksInMonth) {
            dataMap[weekIndex].h += (s.durationInMinutes / 60);
            dataMap[weekIndex].q += (s.questionsDone || 0);
          }
        }
      });

      const finalData = dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(1)) }));
      return { weeklyData: finalData, weeklyQuestionsData: finalData };
    }

    else {
      // Annual view: Months of current year
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const dataMap = months.map(month => ({ n: month, h: 0, q: 0 }));
      const currentYear = today.getFullYear();

      relevantSessions.forEach(s => {
        const sDate = new Date(s.date);
        if (sDate.getFullYear() === currentYear) {
          const monthIdx = sDate.getMonth();
          dataMap[monthIdx].h += (s.durationInMinutes / 60);
          dataMap[monthIdx].q += (s.questionsDone || 0);
        }
      });

      const finalData = dataMap.map(d => ({ ...d, h: parseFloat(d.h.toFixed(1)) }));
      return { weeklyData: finalData, weeklyQuestionsData: finalData };
    }
  }, [relevantSessions, activeWeeklyPeriod]);

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
        const totalDone = subjectStats.questionsData.reduce((acc, s) => acc + s.done, 0);
        const totalCorrect = subjectStats.questionsData.reduce((acc, s) => acc + s.correct, 0);
        const globalAccuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;

        const simDone = simulados.reduce((acc, s) => acc + s.results.reduce((a, r) => a + r.done, 0), 0);
        const simCorrect = simulados.reduce((acc, s) => acc + s.results.reduce((a, r) => a + r.correct, 0), 0);
        const simAccuracy = simDone > 0 ? Math.round((simCorrect / simDone) * 100) : 0;

        const globalColor = getPerformanceColor(globalAccuracy);
        const globalColorHex = getPerformanceColorHex(globalAccuracy);
        const simColor = getPerformanceColor(simAccuracy);
        const simColorHex = getPerformanceColorHex(simAccuracy);

        return (
          <div className="flex flex-row items-center justify-around h-full gap-3 px-3">
            {/* General Stats */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="relative w-[110px] h-[110px] flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-zinc-100 dark:text-zinc-800"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * globalAccuracy) / 100}
                    className={`${globalColor} transition-all duration-1000 ease-out`}
                    strokeLinecap="round"
                    style={{ color: globalColorHex }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black ${globalColor}`} style={{ color: globalColorHex }}>{globalAccuracy}%</span>
                </div>
              </div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mt-1">Geral</p>
            </div>

            {/* Simulado Stats */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="relative w-[110px] h-[110px] flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-zinc-100 dark:text-zinc-800"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * simAccuracy) / 100}
                    className={`${simColor} transition-all duration-1000 ease-out`}
                    strokeLinecap="round"
                    style={{ color: simColorHex }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black ${simColor}`} style={{ color: simColorHex }}>{simAccuracy}%</span>
                </div>
              </div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mt-1">Simulados</p>
            </div>
          </div>
        );
      case 'study_frequency':
        return (
          <div className="flex flex-col h-full justify-between py-2 px-2">
            {/* Frequency Section - Compacted */}
            <div className="flex-1 flex flex-col justify-center min-h-0">
              <div className="flex items-end gap-2 mb-1">
                <span className="text-2xl font-bold text-amber-500 leading-none">{frequencyData.streak}</span>
                <span className="text-[9px] font-semibold uppercase text-zinc-400 mb-0.5">Dias Seguidos</span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                Você estudou em <strong className="text-zinc-900 dark:text-zinc-100 dark:text-zinc-100">{frequencyData.last7DaysCount}</strong> dos últimos 7 dias.
              </p>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${(frequencyData.last7DaysCount / 7) * 100}%` }} />
              </div>
            </div>

            {/* Daily Goal Section - With more space */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1">
              {(() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;

                const doneToday = sessions
                  .filter(s => s.date.startsWith(todayStr) && s.questionsDone !== undefined)
                  .reduce((acc, s) => acc + (s.questionsDone || 0), 0);
                const goal = globalDailyGoal || 20;
                const remaining = Math.max(0, goal - doneToday);
                const pct = Math.min(100, Math.round((doneToday / goal) * 100));

                const getProgressColor = (p: number) => {
                  if (p >= 100) return 'from-emerald-500 to-emerald-600';
                  if (p >= 50) return 'from-amber-500 to-amber-600';
                  return 'from-red-500 to-red-600';
                };

                return (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Meta Diária</span>
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{doneToday} / {goal}</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full bg-gradient-to-r ${getProgressColor(pct)} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {remaining > 0 && (
                      <p className="text-[9px] text-right text-zinc-400 font-medium">Faltam {remaining} questões</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        );
      case 'study_tasks': {
        // Find upcoming reviews (topics with sessions 7 or 30 days ago)
        const todayMs = new Date().setHours(0, 0, 0, 0);
        const upcomingReviews: { subjectName: string; topicName: string; daysUntil: number; reviewType: string }[] = [];

        subjects.forEach(sub => {
          sub.topics.forEach(topic => {
            const topicSessions = sessions.filter(s => s.subjectId === sub.id && s.topicId === topic.id);
            if (topicSessions.length > 0) {
              const lastTopicDate = new Date([...topicSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date);
              lastTopicDate.setHours(0, 0, 0, 0);
              const diffDays = Math.round((todayMs - lastTopicDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysTo7 = 7 - diffDays;
              const daysTo30 = 30 - diffDays;
              if (daysTo7 >= 0 && daysTo7 <= 7) {
                upcomingReviews.push({ subjectName: sub.name, topicName: topic.title, daysUntil: daysTo7, reviewType: '7d' });
              } else if (daysTo30 >= 0 && daysTo30 <= 7) {
                upcomingReviews.push({ subjectName: sub.name, topicName: topic.title, daysUntil: daysTo30, reviewType: '30d' });
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
                <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Nenhuma revisão pendente!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingReviews.slice(0, 2).map((rev, i) => (
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
            {/* Tabs: Tempo / Questões - Aligned to Left */}
            <div className="flex justify-start mb-2">
              <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setActiveWeeklyTab('hours')}
                  className={`py-1 px-3 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${activeWeeklyTab === 'hours' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  Tempo
                </button>
                <button
                  onClick={() => setActiveWeeklyTab('questions')}
                  className={`py-1 px-3 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${activeWeeklyTab === 'questions' ? 'bg-white dark:bg-zinc-700 text-purple-600 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  Questões
                </button>
              </div>
            </div>

            {/* Period Filter Buttons */}
            <div className="flex items-center gap-1 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveWeeklyPeriod('weekly')}
                className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${activeWeeklyPeriod === 'weekly' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Semanal
              </button>
              <button
                onClick={() => setActiveWeeklyPeriod('monthly')}
                className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${activeWeeklyPeriod === 'monthly' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setActiveWeeklyPeriod('annual')}
                className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${activeWeeklyPeriod === 'annual' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Anual
              </button>
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
          const dateStr = date.toISOString().split('T')[0];
          const daySessions = sessions.filter(s => s.date.startsWith(dateStr));
          const dayPlannerRealized = scheduledStudies.filter(s => s.date === dateStr && s.status === 'realizado');
          
          const sessionSubjectIds = daySessions.map(s => s.subjectId);
          const plannerSubjectIds = dayPlannerRealized.map(s => s.subjectId);
          
          const allDaySubjectIds = Array.from(new Set([...sessionSubjectIds, ...plannerSubjectIds]));
          const daySubjects = allDaySubjectIds
            .map(id => subjects.find(sub => sub.id === id))
            .filter(Boolean);

          return {
            day: i + 1,
            subjects: daySubjects,
            isToday: date.toDateString() === today.toDateString()
          };
        });

        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{monthName} {year}</span>
            </div>
            <div className="grid grid-cols-7 gap-2 flex-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map(d => (
                <div key={d.day} className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative group border ${d.isToday ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all'}`}>
                  <span className={`text-xs font-bold ${d.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`}>{d.day}</span>
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5 max-w-[80%]">
                    {d.subjects.map(sub => (
                      <div key={sub.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: getColorHex(sub.color) }} title={sub.name} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'unified_subject_analysis':
        return (
          <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden relative">
            {/* Header / Tabs */}
            <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setActiveAnalysisTab('questions')}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'questions' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Questões
              </button>
              <button
                onClick={() => setActiveAnalysisTab('time')}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'time' ? 'bg-white dark:bg-zinc-700 text-purple-600 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Tempo
              </button>
              <button
                onClick={() => setActiveAnalysisTab('performance')}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'performance' ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                Desempenho
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full px-2 pt-2 pb-2 min-h-0">
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">Dashboard</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Bem-vindo de volta! Aqui está o resumo do seu desempenho.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-auto">
        {widgets.map((widget, index) => {
          if (!widget.isVisible && !isEditMode) return null;
          const sizeClass = widget.size === 'full' ? 'md:col-span-3' : widget.size === 'wide' ? 'md:col-span-2' : 'md:col-span-1';

          // Define heights for different widgets
          const heightClass = (() => {
            if (widget.id === 'general_stats') return 'h-[180px]';
            if (widget.id === 'study_frequency') return 'h-[180px]';
            if (widget.id === 'study_tasks') return 'h-[180px]';
            if (widget.id === 'weekly_chart') return 'h-[400px]';
            if (widget.id === 'activity_calendar') return 'h-[400px]';
            if (widget.id === 'unified_subject_analysis') return 'h-[400px]';
            return 'h-auto';
          })();

          return (
            <div
              key={widget.id}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${sizeClass} ${heightClass} ${widget.isVisible ? 'opacity-100' : 'opacity-40'} bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative group hover:shadow-md transition-all duration-300 ${isEditMode ? 'cursor-move ring-2 ring-emerald-500/20' : ''} ${draggedWidgetIndex === index ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1 rounded-full">{widget.title}</h4>
                <div className="flex gap-2 items-center">
                  {!isEditMode && ['weekly_chart', 'questions_by_subject', 'time_by_subject', 'performance_by_subject'].includes(widget.id) && (
                    <button
                      onClick={() => setFullscreenWidgetId(widget.id)}
                      className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-300 transition-colors p-1"
                      title="Expandir Gráfico"
                    >
                      <Maximize2 size={14} />
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
              {renderWidgetContent(widget.id)}
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
