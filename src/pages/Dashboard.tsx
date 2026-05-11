
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LabelList
} from 'recharts';
import { Eye, EyeOff, X, Plus, Save, Trash2, Trophy, Target, Calendar, Clock, CheckCircle, AlertTriangle, TrendingUp, Maximize2, Minimize2, Check } from 'lucide-react';

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
  studyTasks?: { id: string, subjectId: string, subjectName: string, done: boolean, date: string }[];
  onUpdateTasks?: (tasks: { id: string, subjectId: string, subjectName: string, topicId?: string, topicName?: string, done: boolean, date: string }[]) => void;
}

interface WidgetState {
  id: string;
  title: string;
  isVisible: boolean;
  size: 'normal' | 'wide' | 'full';
}

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: 'general_stats', title: 'Desempenho Geral', isVisible: true, size: 'wide' },
  { id: 'study_frequency', title: 'InformaÃ§Ãµes e Metas', isVisible: true, size: 'normal' },
  { id: 'study_tasks', title: 'Tarefas de Hoje', isVisible: true, size: 'normal' },
  { id: 'weekly_chart', title: 'Volume de Estudo', isVisible: true, size: 'normal' },
  { id: 'unified_subject_analysis', title: 'AnÃ¡lise por Disciplina', isVisible: true, size: 'wide' },
];

import { getColorHex } from '../utils/colors';

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
  onUpdateTasks
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'questions' | 'time' | 'performance'>('questions');
  const [activeWeeklyTab, setActiveWeeklyTab] = useState<'hours' | 'questions'>('hours');
  const [activeWeeklyPeriod, setActiveWeeklyPeriod] = useState<'weekly' | 'monthly' | 'annual'>('weekly');

  const handleToggleTask = (taskId: string) => {
    if (!onUpdateTasks) return;
    const newTasks = studyTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, done: !t.done };
      }
      return t;
    });
    onUpdateTasks(newTasks);
  };

  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    const saved = localStorage.getItem('cp_dashboard_layout_v16');
    // Merge with defaults to ensure new widgets appear
    if (!saved) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(saved);

    // Remove legacy widgets explicitly
    const legacyIds = ['focus_timer', 'study_suggestions', 'questions_by_subject', 'time_by_subject', 'performance_by_subject'];
    const filtered = parsed.filter((w: any) => !legacyIds.includes(w.id));

    // Check if new unified widget is missing and add it
    const existingIds = new Set(filtered.map((w: any) => w.id));
    const missingWidgets = DEFAULT_WIDGETS.filter(w => !existingIds.has(w.id));

    if (missingWidgets.length > 0) {
      return [...filtered, ...missingWidgets];
    }

    // Update widget titles from defaults to ensure latest names
    return filtered.map((w: any) => {
      const defaultWidget = DEFAULT_WIDGETS.find(dw => dw.id === w.id);
      return defaultWidget ? { ...w, title: defaultWidget.title } : w;
    });
  });

  const [formData, setFormData] = useState({
    subjectId: '',
    topicId: '',
    activityType: 'QuestÃµes' as ActivityType,
    duration: '',
    questionsDone: '',
    questionsCorrect: '',
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })()
  });

  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';
  const chartTextColor = isDarkMode ? '#94a3b8' : '#64748b';

  useEffect(() => { localStorage.setItem('cp_dashboard_layout_v16', JSON.stringify(widgets)); }, [widgets]);

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
      questionsDone: formData.activityType === 'QuestÃµes' ? (parseInt(formData.questionsDone) || undefined) : undefined,
      questionsCorrect: formData.activityType === 'QuestÃµes' ? (parseInt(formData.questionsCorrect) || undefined) : undefined,
      activityType: formData.activityType
    });

    setShowModal(false);
    setFormData({
      subjectId: '',
      topicId: '',
      activityType: 'QuestÃµes',
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
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b'];

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
                VocÃª estudou em <strong className="text-zinc-900 dark:text-zinc-100 dark:text-zinc-100">{frequencyData.last7DaysCount}</strong> dos Ãºltimos 7 dias.
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
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Meta DiÃ¡ria</span>
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{doneToday} / {goal}</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full bg-gradient-to-r ${getProgressColor(pct)} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {remaining === 0 ? (
                      <div className="flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/10 py-1 rounded border border-emerald-100 dark:border-emerald-800/30">
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Meta Batida!</span>
                      </div>
                    ) : (
                      <p className="text-[9px] text-right text-zinc-400 font-medium">Faltam {remaining} questÃµes</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        );
      case 'study_tasks':
        return (
          <div className="flex flex-col h-full relative overflow-hidden group/container">
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
              {(() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;

                return studyTasks.filter(t => t.date === todayStr).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-60 space-y-1.5">
                    <div className="w-9 h-9 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-base shadow-sm">ðŸŽ‰</div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Tudo em dia!</p>
                    </div>
                  </div>
                ) : (
                  studyTasks.filter(t => t.date === todayStr).map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${task.done ? 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800 opacity-60' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-zinc-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                        {task.done && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-bold truncate leading-tight ${task.done ? 'text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-200'}`}>
                          {task.subjectName}
                        </p>
                        {task.topicName && <p className="text-[8px] text-zinc-400 truncate mt-0.5">{task.topicName}</p>}
                      </div>
                    </div>
                  ))
                );
              })()}
            </div>

            {/* Total badge */}
            <div className="absolute bottom-0 right-0 bg-zinc-900 dark:bg-zinc-700 text-white text-[8px] font-bold px-2 py-0.5 rounded-tl-xl shadow-sm z-10 opacity-0 group-hover/container:opacity-100 transition-all pointer-events-none tranzinc-y-full group-hover/container:tranzinc-y-0">
              {studyTasks.filter(t => t.date === new Date().toISOString().split('T')[0] && !t.done).length} Pendentes
            </div>
          </div>
        );

      case 'weekly_chart':
        return (
          <div className="flex flex-col h-full">
            {/* Tabs: Tempo / QuestÃµes - Aligned to Left */}
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
                  QuestÃµes
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
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem questÃµes feitas</div>
              )}
            </div>
          </div>
        );
      case 'unified_subject_analysis':
        return (
          <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden relative">
            {/* Header / Tabs */}
            <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setActiveAnalysisTab('questions')}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${activeAnalysisTab === 'questions' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                QuestÃµes
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
                ) : <div className="h-full flex items-center justify-center text-xs text-zinc-400">Sem questÃµes resolvidas</div>
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
             <Trophy size={14} className="text-zinc-900 dark:text-zinc-300" />
             <select
                value={selectedConcursoId}
                onChange={(e) => onSelectConcursoId(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-white cursor-pointer w-32"
             >
                <option value="all">VisÃ£o Global</option>
                {concursos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="bg-zinc-900 dark:bg-zinc-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide hover:bg-zinc-800 dark:hover:bg-zinc-600 shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Adicionar Atividade
          </button>
        </div>
        <button onClick={() => {
          setIsEditMode(!isEditMode);
          onToggleReorderMode?.(!isEditMode);
        }} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${isEditMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'}`}>
          {isEditMode ? 'Salvar Painel' : 'Ajustar Layout'}
        </button>
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
            if (widget.id === 'weekly_chart') return 'h-[380px]';
            if (widget.id === 'unified_subject_analysis') return 'h-[380px]';
            return 'h-auto';
          })();

          return (
            <div
              key={widget.id}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${sizeClass} ${heightClass} ${widget.isVisible ? 'opacity-100' : 'opacity-40'} bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative group hover:shadow-md transition-all duration-300 ${isEditMode ? 'cursor-move ring-2 ring-emerald-500/20' : ''} ${draggedWidgetIndex === index ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{widget.title}</h4>
                <div className="flex gap-2 items-center">
                  {!isEditMode && ['weekly_chart', 'questions_by_subject', 'time_by_subject', 'performance_by_subject'].includes(widget.id) && (
                    <button
                      onClick={() => setFullscreenWidgetId(widget.id)}
                      className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-300 transition-colors p-1"
                      title="Expandir GrÃ¡fico"
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
              <h3 className="text-2xl font-bold text-zinc-800 dark:text-white uppercase tracking-tight">
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
              {/* Hack to ensure responsive container works in fullscreen */}
              {(() => {
                const content = renderWidgetContent(fullscreenWidgetId);
                // We need to clone the element to potentially override styles or ensure it takes full height
                // But renderWidgetContent returns a div with fixed/min height. 
                // We'll wrap it in a div that forces 100% height and overrides the child's min-height via CSS if needed, 
                // or we rely on the ResponsiveContainer to adapt if the parent has size.
                // The original renderWidgetContent returns a Div with height classes. We need to strip that or wrap it.
                // Actually, ResponsiveContainer needs a defined parent height.
                return (
                  <div className="w-full h-full [&>div]:!h-full [&>div]:!min-h-0">
                    {content}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold uppercase tracking-tight mb-6 dark:text-white flex items-center gap-2">Nova Atividade <Clock size={20} className="text-zinc-900 dark:text-zinc-300" /></h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Tipo</label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value as any })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500">
                    <option value="Leitura">Leitura</option>
                    <option value="QuestÃµes">QuestÃµes</option>
                    <option value="Aula">Aula</option>
                    <option value="Simulado">Simulado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Data</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Disciplina</label>
                <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicId: '' })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500">
                  <option value="">Selecione a matÃ©ria...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {formData.subjectId && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Assunto / TÃ³pico</label>
                  <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500">
                    <option value="">Geral / Outros</option>
                    {subjects.find(s => s.id === formData.subjectId)?.topics.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Tempo Dedicado (min)</label>
                <input type="number" placeholder="Ex: 45" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-bold dark:text-white ring-1 ring-zinc-100 dark:ring-zinc-800 focus:ring-zinc-500" />
              </div>

              {formData.activityType === 'QuestÃµes' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Resolvidas</label>
                    <input type="number" placeholder="0" value={formData.questionsDone} onChange={(e) => setFormData({ ...formData, questionsDone: e.target.value })} className="w-full p-3 bg-white dark:bg-zinc-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Acertos</label>
                    <input type="number" placeholder="0" value={formData.questionsCorrect} onChange={(e) => setFormData({ ...formData, questionsCorrect: e.target.value })} className="w-full p-3 bg-white dark:bg-zinc-900 border-none rounded-xl outline-none text-sm font-bold dark:text-white shadow-sm" />
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveActivity}
                disabled={!formData.subjectId}
                className="w-full py-4 bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/50 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
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
