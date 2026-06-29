import React, { useState, useMemo } from 'react';
import { Subject, StudySession, Concurso, ScheduledStudy, Simulado, ActivityType } from '../types';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  HelpCircle,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Check,
  TrendingUp,
  Award,
  Trophy,
  Activity,
  Zap,
  Settings,
  ChevronDown,
  Info,
  X
} from 'lucide-react';

interface CronogramaViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  simulados: Simulado[];
  concursos: Concurso[];
  selectedConcursoId: string;
  scheduledStudies: ScheduledStudy[];
  onAddScheduledStudiesBatch: (items: (Omit<ScheduledStudy, 'id' | 'status'> & { id?: string })[]) => Promise<void>;
  onDeleteScheduledStudiesBatch: (ids: string[]) => Promise<void>;
  onToggleScheduledStudyStatus: (id: string) => Promise<void>;
}

const WEEKDAYS = [
  { id: 'Monday', label: 'Segunda-feira' },
  { id: 'Tuesday', label: 'Terça-feira' },
  { id: 'Wednesday', label: 'Quarta-feira' },
  { id: 'Thursday', label: 'Quinta-feira' },
  { id: 'Friday', label: 'Sexta-feira' },
  { id: 'Saturday', label: 'Sábado' },
  { id: 'Sunday', label: 'Domingo' }
];

const CronogramaView: React.FC<CronogramaViewProps> = ({
  subjects,
  sessions,
  simulados,
  concursos,
  selectedConcursoId,
  scheduledStudies,
  onAddScheduledStudiesBatch,
  onDeleteScheduledStudiesBatch,
  onToggleScheduledStudyStatus
}) => {
  // UI States
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);

  // Configuration States for generation
  const [durWeeks, setDurWeeks] = useState(8);
  const [dailyHours, setDailyHours] = useState(3);
  const [activeDays, setActiveDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [startDateStr, setStartDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [subjectsPerDay, setSubjectsPerDay] = useState(2);
  const [topicsPerSubjectPerDay, setTopicsPerSubjectPerDay] = useState(1);

  // Load preferences from localStorage based on selectedConcursoId
  React.useEffect(() => {
    if (!selectedConcursoId) return;
    try {
      const saved = localStorage.getItem(`cp_cronograma_prefs_${selectedConcursoId}`);
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.durWeeks !== undefined) setDurWeeks(prefs.durWeeks);
        if (prefs.dailyHours !== undefined) setDailyHours(prefs.dailyHours);
        if (prefs.subjectsPerDay !== undefined) setSubjectsPerDay(prefs.subjectsPerDay);
        if (prefs.topicsPerSubjectPerDay !== undefined) setTopicsPerSubjectPerDay(prefs.topicsPerSubjectPerDay);
        if (prefs.activeDays !== undefined) setActiveDays(prefs.activeDays);
        if (prefs.startDateStr !== undefined) setStartDateStr(prefs.startDateStr);
      } else {
        // defaults
        setDurWeeks(8);
        setDailyHours(3);
        setSubjectsPerDay(2);
        setTopicsPerSubjectPerDay(1);
        setActiveDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
        setStartDateStr(new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error('Error loading cronograma preferences:', e);
    }
  }, [selectedConcursoId]);

  const handleSavePreferences = () => {
    if (!selectedConcursoId || selectedConcursoId === 'all') {
      alert('Por favor, selecione um concurso primeiro.');
      return;
    }
    const prefs = {
      durWeeks,
      dailyHours,
      subjectsPerDay,
      topicsPerSubjectPerDay,
      activeDays,
      startDateStr
    };
    localStorage.setItem(`cp_cronograma_prefs_${selectedConcursoId}`, JSON.stringify(prefs));
    alert('Preferências salvas com sucesso!');
  };

  // Completion Dialog States
  const [completingTask, setCompletingTask] = useState<ScheduledStudy | null>(null);
  const [actualDuration, setActualDuration] = useState('');
  const [actualDone, setActualDone] = useState('');
  const [actualCorrect, setActualCorrect] = useState('');

  // Active Concurso
  const activeConcurso = useMemo(() => {
    return concursos.find(c => c.id === selectedConcursoId);
  }, [concursos, selectedConcursoId]);

  // Filter scheduled studies related to subjects of active concurso
  const activeConcursoSubjectIds = useMemo(() => {
    return new Set((subjects || []).map(s => s.id));
  }, [subjects]);

  const cronogramaStudies = useMemo(() => {
    return (scheduledStudies || []).filter(s => activeConcursoSubjectIds.has(s.subjectId) || s.activityType === 'Simulado');
  }, [scheduledStudies, activeConcursoSubjectIds]);

  const hasGenerated = cronogramaStudies.length > 0;

  // Find start and end dates of the generated schedule
  const scheduleBounds = useMemo(() => {
    if (cronogramaStudies.length === 0) return null;
    const dates = cronogramaStudies.map(s => new Date(s.date).getTime());
    const minTime = Math.min(...dates);
    const maxTime = Math.max(...dates);
    return {
      start: new Date(minTime),
      end: new Date(maxTime)
    };
  }, [cronogramaStudies]);

  // Current calendar month view state
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  // Week calculation based on selectedDateStr
  const currentWeekDays = useMemo(() => {
    const selectedDate = new Date(`${selectedDateStr}T12:00:00`);
    const dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // We want Monday as the first day of the week
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() + diffToMonday);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDateStr]);

  // Current week number relative to schedule start
  const currentWeekNumber = useMemo(() => {
    if (!scheduleBounds) return 1;
    const selectedDate = new Date(`${selectedDateStr}T12:00:00`);
    const diffMs = selectedDate.getTime() - scheduleBounds.start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }, [selectedDateStr, scheduleBounds]);

  // Overall completion progress
  const progressStats = useMemo(() => {
    if (cronogramaStudies.length === 0) return { total: 0, completed: 0, pct: 0 };
    const total = cronogramaStudies.length;
    const completed = cronogramaStudies.filter(s => s.status === 'realizado').length;
    return {
      total,
      completed,
      pct: Math.round((completed / total) * 100)
    };
  }, [cronogramaStudies]);

  // Handle generating new schedule
  const handleGenerate = async () => {
    if (!activeConcurso || subjects.length === 0) return;
    setIsGenerating(true);

    try {
      // 1. Calculate statistical profiles for each subject
      const subjectProfiles = subjects.map(sub => {
        const subSessions = sessions.filter(s => s.subjectId === sub.id);
        const done = subSessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
        const correct = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
        const accuracy = done > 0 ? (correct / done) * 100 : 70; // default to 70% if no sessions
        const minutes = subSessions.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);
        const weight = sub.weight || 1;

        // Priority calculation: higher weight, lower accuracy, fewer study minutes = higher score
        const priorityScore = weight * (105 - accuracy) * (1 / (1 + minutes / 60));

        // Queue uncompleted topics (or all if all are completed)
        const uncompletedTopics = (sub.topics || []).filter(t => !t.isCompleted);
        const topicQueue = uncompletedTopics.length > 0 ? uncompletedTopics : (sub.topics || []);
        
        // Sort queue: High priority first, then medium, then low
        const sortedQueue = [...topicQueue].sort((a, b) => {
          const valA = a.priority === 'Alta' ? 3 : a.priority === 'Média' ? 2 : 1;
          const valB = b.priority === 'Alta' ? 3 : b.priority === 'Média' ? 2 : 1;
          return valB - valA;
        });

        return {
          subject: sub,
          priorityScore,
          queue: sortedQueue,
          queueIndex: 0,
          simulatedMinutes: minutes // used to balance subject selection dynamically
        };
      });

      const totalPriority = subjectProfiles.reduce((acc, p) => acc + p.priorityScore, 0);

      // 2. Determine targetDate limits
      const start = new Date(`${startDateStr}T12:00:00`);
      let end = activeConcurso?.targetDate ? new Date(`${activeConcurso.targetDate.split('T')[0]}T12:00:00`) : null;
      
      let totalDays = durWeeks * 7;
      if (end) {
        const diffTime = end.getTime() - start.getTime();
        totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      // 3. Generate items day by day
      const items: (Omit<ScheduledStudy, 'id' | 'status'> & { id?: string })[] = [];

      for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + dayOffset);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Se este dia já tem alguma atividade cadastrada, pular a geração automática
        const hasExistingActivity = (scheduledStudies || []).some(s => {
          if (!s.date) return false;
          const sDateOnly = s.date.includes('T') ? s.date.split('T')[0] : s.date;
          return sDateOnly === dateStr;
        });

        if (hasExistingActivity) {
          continue;
        }

        // Determine weekday
        const weekdayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const isStudyDay = activeDays.includes(weekdayName);

        if (isStudyDay) {
          // Select todays subjects dynamically based on priority scores
          const todaysSubjects: typeof subjectProfiles[0][] = [];
          for (let s = 0; s < subjectsPerDay; s++) {
            const profilesWithUpdatedPriority = subjectProfiles.map(p => {
              const accuracy = p.queue.length > 0 ? 70 : 70; // placeholder
              const priorityScore = (p.subject.weight || 1) * (105 - accuracy) * (1 / (1 + p.simulatedMinutes / 60));
              return { ...p, priorityScore };
            });

            const available = profilesWithUpdatedPriority
              .filter(p => !todaysSubjects.find(ts => ts.subject.id === p.subject.id))
              .sort((a, b) => b.priorityScore - a.priorityScore);

            if (available.length > 0) {
              const selected = subjectProfiles.find(p => p.subject.id === available[0].subject.id)!;
              todaysSubjects.push(selected);
              selected.simulatedMinutes += 60; // offset weight
            }
          }

          // Study slots per subject
          const totalTopicsCount = todaysSubjects.length * topicsPerSubjectPerDay;
          const totalMinutesPerTopic = Math.round((dailyHours * 60) / totalTopicsCount);

          todaysSubjects.forEach(profile => {
            for (let tIdx = 0; tIdx < topicsPerSubjectPerDay; tIdx++) {
              const topic = profile.queue[profile.queueIndex % profile.queue.length];
              if (topic) {
                profile.queueIndex++;
              }

              // Split into theory and practice
              const readingTime = Math.round(totalMinutesPerTopic * 0.4);
              const questionsTime = totalMinutesPerTopic - readingTime;

              items.push({
                date: dateStr,
                subjectId: profile.subject.id,
                topicId: topic?.id,
                activityType: 'Leitura',
                notes: `Leitura do material: ${topic?.title || 'Conteúdo geral'}`,
                durationInMinutes: readingTime,
                questionsDone: 0,
                questionsCorrect: 0
              });

              items.push({
                date: dateStr,
                subjectId: profile.subject.id,
                topicId: topic?.id,
                activityType: 'Questões',
                notes: `Resolução de questões: ${topic?.title || 'Conteúdo geral'}`,
                durationInMinutes: questionsTime,
                questionsDone: 10,
                questionsCorrect: 7
              });
            }
          });

          // Add Weekly Review on Saturdays / last day of active study week
          const isLastActiveDayOfWeek = dayOffset % 7 === 5; // Saturday
          if (isLastActiveDayOfWeek) {
            const bestSubProfile = [...subjectProfiles].sort((a, b) => b.priorityScore - a.priorityScore)[0];
            items.push({
              date: dateStr,
              subjectId: bestSubProfile.subject.id,
              activityType: 'Revisão',
              notes: `Revisão Semanal dos tópicos prioritários`,
              durationInMinutes: 30,
              questionsDone: 0,
              questionsCorrect: 0
            });
          }
        } else {
          // Off-day / Sunday: schedule a Simulado session (300 min)
          const fallbackSubject = subjects[0];
          items.push({
            date: dateStr,
            subjectId: fallbackSubject.id,
            activityType: 'Simulado',
            notes: `Simulado Geral do Edital (CEISC)`,
            durationInMinutes: 300,
            questionsDone: 60,
            questionsCorrect: 42
          });
        }
      }

      // 3. Batch save to Supabase / AppState
      await onAddScheduledStudiesBatch(items);
      setSelectedDateStr(startDateStr);
    } catch (e) {
      alert('Erro ao gerar cronograma. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear / Delete schedule
  const handleClearSchedule = async () => {
    if (confirm('Tem certeza de que deseja apagar todo o cronograma de estudos planejado? Esta ação não afetará as sessões de estudo já concluídas.')) {
      const ids = cronogramaStudies.map(s => s.id);
      await onDeleteScheduledStudiesBatch(ids);
    }
  };

  // Complete click handler
  const handleCompleteClick = (task: ScheduledStudy) => {
    setCompletingTask(task);
    setActualDuration(String(task.durationInMinutes || ''));
    setActualDone(String(task.questionsDone || ''));
    setActualCorrect(String(task.questionsCorrect || ''));
  };

  const submitCompletion = async () => {
    if (!completingTask) return;
    try {
      const doneVal = parseInt(actualDone) || 0;
      const correctVal = parseInt(actualCorrect) || 0;
      const durVal = parseInt(actualDuration) || completingTask.durationInMinutes || 0;

      // Update study properties first
      completingTask.durationInMinutes = durVal;
      completingTask.questionsDone = doneVal;
      completingTask.questionsCorrect = Math.min(correctVal, doneVal); // correct cannot exceed total done

      // Toggle status inside state/db
      await onToggleScheduledStudyStatus(completingTask.id);
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingTask(null);
    }
  };

  // Mini calendar helpers
  const miniCalendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday...
    
    // Adjusted starting offset to make Monday first
    const startingOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startingOffset; i++) {
      cells.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(new Date(year, month, i));
    }

    // Pad end of array to multiple of 7
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonthDate]);

  // Navigate month
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + 1);
      return d;
    });
  };

  // Navigate week
  const handlePrevWeek = () => {
    const current = new Date(`${selectedDateStr}T12:00:00`);
    current.setDate(current.getDate() - 7);
    setSelectedDateStr(current.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const current = new Date(`${selectedDateStr}T12:00:00`);
    current.setDate(current.getDate() + 7);
    setSelectedDateStr(current.toISOString().split('T')[0]);
  };

  // Group current week activities by day of the week
  const groupedWeekActivities = useMemo(() => {
    const map: Record<string, ScheduledStudy[]> = {};
    currentWeekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      map[dayStr] = cronogramaStudies.filter(s => s.date === dayStr);
    });
    return map;
  }, [currentWeekDays, cronogramaStudies]);

  // Active day activities (for Day view)
  const activeDayActivities = useMemo(() => {
    return cronogramaStudies.filter(s => s.date === selectedDateStr);
  }, [cronogramaStudies, selectedDateStr]);

  // Month activities layout (for Month view)
  const monthActivitiesSummary = useMemo(() => {
    const map: Record<string, { done: number, total: number }> = {};
    cronogramaStudies.forEach(s => {
      if (!map[s.date]) {
        map[s.date] = { done: 0, total: 0 };
      }
      map[s.date].total++;
      if (s.status === 'realizado') map[s.date].done++;
    });
    return map;
  }, [cronogramaStudies]);

  // Render empty generator config page
  if (!hasGenerated) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 shadow-xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CalendarDays size={32} />
            </div>
            <h2 className="text-3xl font-black text-zinc-800 dark:text-white leading-tight">Cronograma Inteligente</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 font-medium">
              Gere um cronograma estruturado e personalizado com base nos pesos das disciplinas do seu edital e na sua taxa de acertos atual.
            </p>
          </div>

          {!selectedConcursoId || selectedConcursoId === 'all' ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl flex gap-4 items-center">
              <Info className="text-amber-500 shrink-0" size={24} />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Por favor, selecione um concurso/curso específico no menu superior para criar um cronograma direcionado.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {activeConcurso?.targetDate ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-6 rounded-2xl flex gap-4 items-center">
                  <CalendarIcon className="text-emerald-500 shrink-0" size={24} />
                  <div>
                    <h5 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Data Limite Definida Pela Prova</h5>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      O cronograma terminará exatamente no dia anterior à prova do seu concurso ({new Date(`${activeConcurso.targetDate.split('T')[0]}T12:00:00`).toLocaleDateString('pt-BR')}).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl flex gap-4 items-center">
                  <Info className="text-amber-500 shrink-0" size={24} />
                  <div>
                    <h5 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Nenhuma Data de Prova Cadastrada</h5>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      O cronograma usará a duração padrão abaixo. Você pode cadastrar uma data de prova editando este curso na aba Cursos.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Duration (Only show if targetDate is not set) */}
                {!activeConcurso?.targetDate && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Duração do Planejamento</label>
                    <select
                      value={durWeeks}
                      onChange={(e) => setDurWeeks(parseInt(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={4}>4 Semanas (1 Mês)</option>
                      <option value={8}>8 Semanas (2 Meses)</option>
                      <option value={12}>12 Semanas (3 Meses)</option>
                      <option value={16}>16 Semanas (4 Meses)</option>
                    </select>
                  </div>
                )}

                {/* Daily hours */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Meta de Horas Diárias</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={dailyHours}
                    onChange={(e) => setDailyHours(Math.max(1, parseInt(e.target.value) || 3))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Subjects Per Day */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Disciplinas por Dia</label>
                  <select
                    value={subjectsPerDay}
                    onChange={(e) => setSubjectsPerDay(parseInt(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>1 Disciplina</option>
                    <option value={2}>2 Disciplinas</option>
                    <option value={3}>3 Disciplinas</option>
                    <option value={4}>4 Disciplinas</option>
                  </select>
                </div>

                {/* Topics Per Subject Per Day */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Assuntos por Disciplina por Dia</label>
                  <select
                    value={topicsPerSubjectPerDay}
                    onChange={(e) => setTopicsPerSubjectPerDay(parseInt(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>1 Assunto</option>
                    <option value={2}>2 Assuntos</option>
                    <option value={3}>3 Assuntos</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Data de Início</label>
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Weekdays */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-3">Dias Disponíveis para Estudo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {WEEKDAYS.map(day => {
                      const isActive = activeDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setActiveDays(activeDays.filter(d => d !== day.id));
                            } else {
                              setActiveDays([...activeDays, day.id]);
                            }
                          }}
                          className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all text-center ${
                            isActive
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-555 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                          }`}
                        >
                          {day.label.split('-')[0]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-2 flex items-center gap-1.5">
                    <Info size={12} /> Os dias não selecionados serão dedicados a Simulados.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-150 dark:border-zinc-800 pt-8 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-black uppercase tracking-widest text-xs px-8 py-4 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <Settings size={14} />
                  Salvar Preferências
                </button>
                
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black uppercase tracking-widest text-xs px-10 py-4 rounded-[2rem] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? 'Gerando Planejamento...' : 'Gerar Cronograma'}
                  <Zap size={14} className="fill-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render scheduler dashboard
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header controls */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === mode
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm'
                    : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Week navigation (or Month/Day navigation depending on mode) */}
        <div className="flex items-center gap-4 self-center sm:self-auto">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Semana {currentWeekNumber}</span>
            <span className="text-sm font-black text-zinc-800 dark:text-white">
              {currentWeekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {currentWeekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextWeek}
            className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPrefsModal(true)}
            className="text-zinc-500 dark:text-zinc-450 hover:text-emerald-500 transition-colors p-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5"
            title="Ajustar Preferências de Estudo"
          >
            <Settings size={14} /> Preferências
          </button>
          <button
            type="button"
            onClick={handleClearSchedule}
            className="text-zinc-400 hover:text-rose-500 transition-colors p-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5"
            title="Apagar Cronograma"
          >
            <Trash2 size={14} /> Limpar
          </button>
        </div>
      </header>

      {/* Main Grid: Left Column (mini calendar & stats), Right Column (schedule cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Progress & Month Calendar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Progress Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2.5rem] shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">Progresso Geral</p>
            <div className="relative w-28 h-28 mx-auto my-5 flex items-center justify-center">
              {/* Circular progress SVG */}
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                <path
                  className="text-zinc-100 dark:text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${progressStats.pct}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-black text-zinc-800 dark:text-white leading-none">{progressStats.pct}%</span>
                <span className="text-[8px] font-bold text-zinc-400 block uppercase tracking-wider mt-1">Concluído</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {progressStats.completed} de {progressStats.total} tarefas realizadas.
            </p>
          </div>

          {/* Mini Calendar Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-[2.5rem] shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                {currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={handlePrevMonth} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                  <ChevronLeft size={14} />
                </button>
                <button type="button" onClick={handleNextMonth} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <span key={i} className="text-[9px] font-black text-zinc-450 uppercase">{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {miniCalendarDays.map((day, i) => {
                if (!day) return <div key={i} className="aspect-square" />;
                const dateStr = day.toISOString().split('T')[0];
                const isSelected = selectedDateStr === dateStr;
                const hasActivities = cronogramaStudies.some(s => s.date === dateStr);
                const dayStatus = monthActivitiesSummary[dateStr];
                const isAllDone = dayStatus && dayStatus.done === dayStatus.total;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`aspect-square rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500 text-white font-black'
                        : isAllDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 font-semibold'
                          : hasActivities
                            ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white border border-zinc-200/50 dark:border-zinc-700/50'
                            : 'text-zinc-350 dark:text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <span>{day.getDate()}</span>
                    {hasActivities && !isSelected && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isAllDone ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Task lists depending on viewMode */}
        <div className="lg:col-span-3">
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentWeekDays.map((day, idx) => {
                const dateStr = day.toISOString().split('T')[0];
                const activities = groupedWeekActivities[dateStr] || [];

                // Calculate stats for header
                const durationTotal = activities.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);
                const doneTotal = activities.filter(s => s.status === 'realizado').length;
                const totalCount = activities.length;

                const labelFormat = day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();
                const isSelected = selectedDateStr === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`bg-white dark:bg-zinc-900 border rounded-[2rem] p-5 shadow-sm transition-all flex flex-col min-h-[300px] cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <header className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4 shrink-0">
                      <div>
                        <h4 className="text-xs font-black text-zinc-800 dark:text-white tracking-wide">{labelFormat}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-bold font-mono">
                          {durationTotal >= 60 
                            ? `${Math.floor(durationTotal / 60)}h ${durationTotal % 60}m` 
                            : `${durationTotal} min`}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-700/40">
                        {doneTotal}/{totalCount} feito
                      </span>
                    </header>

                    {/* Scrollable list of activities */}
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px] pr-1 custom-scrollbar">
                      {activities.map(act => {
                        const isDone = act.status === 'realizado';
                        const sub = subjects.find(s => s.id === act.subjectId);
                        const topic = sub?.topics?.find(t => t.id === act.topicId);
                        
                        return (
                          <div
                            key={act.id}
                            style={{ borderLeftColor: sub?.color || '#10B981' }}
                            className={`p-3.5 rounded-2xl border-l-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50 flex justify-between items-center transition-all ${
                              isDone ? 'opacity-40 hover:opacity-60' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  act.activityType === 'Simulado'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                                    : act.activityType === 'Leitura'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                                      : act.activityType === 'Questões'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                                }`}>
                                  {act.activityType}
                                </span>
                                {sub && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 truncate max-w-[100px]">{sub.name}</span>
                                )}
                              </div>
                              <h5 className={`text-xs font-black text-zinc-755 dark:text-white leading-tight ${isDone ? 'line-through' : ''}`}>
                                {topic ? topic.title : act.notes}
                              </h5>
                              <p className="text-[9px] text-zinc-400 font-bold mt-1.5 flex items-center gap-1 font-mono">
                                <Clock size={9} /> {act.durationInMinutes} min
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDone) {
                                  onToggleScheduledStudyStatus(act.id);
                                } else {
                                  handleCompleteClick(act);
                                }
                              }}
                              className={`shrink-0 transition-colors p-1.5 rounded-full ${
                                isDone
                                  ? 'text-emerald-500 hover:text-zinc-400 dark:hover:text-zinc-500'
                                  : 'text-zinc-350 hover:text-emerald-500 dark:text-zinc-650'
                              }`}
                            >
                              {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                          </div>
                        );
                      })}

                      {activities.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
                          <BookOpen size={24} className="text-zinc-400 mb-1" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Sem estudos hoje</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-6 shadow-sm space-y-6">
              <header className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-black text-zinc-800 dark:text-white">
                    {new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h3>
                  <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">Atividades de estudo do dia selecionado</p>
                </div>
              </header>

              <div className="space-y-4">
                {activeDayActivities.map(act => {
                  const isDone = act.status === 'realizado';
                  const sub = subjects.find(s => s.id === act.subjectId);
                  const topic = sub?.topics?.find(t => t.id === act.topicId);

                  return (
                    <div
                      key={act.id}
                      style={{ borderLeftColor: sub?.color || '#10B981' }}
                      className={`p-4 rounded-3xl border-l-4 bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-700/50 flex justify-between items-center ${
                        isDone ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            act.activityType === 'Simulado'
                              ? 'bg-purple-100 text-purple-755 dark:bg-purple-950/20 dark:text-purple-400'
                              : act.activityType === 'Leitura'
                                ? 'bg-blue-100 text-blue-755 dark:bg-blue-950/20 dark:text-blue-400'
                                : act.activityType === 'Questões'
                                  ? 'bg-emerald-100 text-emerald-755 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                          }`}>
                            {act.activityType}
                          </span>
                          {sub && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{sub.name}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-zinc-800 dark:text-white leading-tight">{topic ? topic.title : act.notes}</h4>
                        {topic && act.notes && <p className="text-xs text-zinc-400 mt-1 font-semibold">{act.notes}</p>}
                        <p className="text-xs text-zinc-400 font-bold mt-2 flex items-center gap-1 font-mono">
                          <Clock size={11} /> {act.durationInMinutes} minutos
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isDone) {
                            onToggleScheduledStudyStatus(act.id);
                          } else {
                            handleCompleteClick(act);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-2xl border transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 ${
                          isDone
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                            : 'bg-white border-zinc-200 hover:border-emerald-500 hover:text-emerald-500 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-555 dark:text-zinc-400'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <Check size={12} strokeWidth={3} /> Concluído
                          </>
                        ) : (
                          'Marcar feito'
                        )}
                      </button>
                    </div>
                  );
                })}

                {activeDayActivities.length === 0 && (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center justify-center gap-3">
                    <BookOpen size={36} className="text-zinc-400" />
                    <p className="font-black uppercase tracking-widest text-xs">Sem tarefas de estudo para este dia</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
              <header className="mb-4">
                <h3 className="text-base font-black text-zinc-800 dark:text-white uppercase tracking-wider">Cronograma do Mês</h3>
              </header>

              <div className="grid grid-cols-7 gap-2">
                {miniCalendarDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-video bg-zinc-50/20 dark:bg-zinc-850/10 rounded-xl" />;
                  const dateStr = day.toISOString().split('T')[0];
                  const dayAct = cronogramaStudies.filter(s => s.date === dateStr);
                  const isSelected = selectedDateStr === dateStr;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(dateStr);
                        setViewMode('day');
                      }}
                      className={`p-2 rounded-2xl border text-left min-h-[70px] flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 ring-1 ring-emerald-500'
                          : 'border-zinc-150 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/10'
                      }`}
                    >
                      <span className="text-xs font-bold text-zinc-400">{day.getDate()}</span>
                      
                      <div className="space-y-0.5 w-full">
                        {dayAct.slice(0, 2).map(act => (
                          <div
                            key={act.id}
                            className={`text-[8px] font-black uppercase tracking-wider truncate px-1 rounded-md max-w-full ${
                              act.status === 'realizado'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 line-through opacity-60'
                                : act.activityType === 'Simulado'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                                  : 'bg-zinc-150 text-zinc-700 dark:bg-zinc-850 dark:text-zinc-300'
                            }`}
                          >
                            {act.activityType}
                          </div>
                        ))}
                        {dayAct.length > 2 && (
                          <div className="text-[7px] font-bold text-zinc-400 text-right">+ {dayAct.length - 2}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Dialog / Popover Form Modal */}
      {completingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h4 className="text-lg font-black text-zinc-800 dark:text-white leading-tight mb-2">Concluir Atividade</h4>
            <p className="text-xs text-zinc-400 font-semibold mb-6">
              Informe os dados reais da sessão para registrar na sua análise estatística.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Tempo Gasto (minutos)</label>
                <input
                  type="number"
                  placeholder={`${completingTask.durationInMinutes || 30}`}
                  value={actualDuration}
                  onChange={(e) => setActualDuration(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-855 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {(completingTask.activityType === 'Questões' || completingTask.activityType === 'Simulado') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Questões Resolvidas</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={actualDone}
                      onChange={(e) => setActualDone(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-855 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Respostas Corretas</label>
                    <input
                      type="number"
                      placeholder="7"
                      value={actualCorrect}
                      onChange={(e) => setActualCorrect(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-855 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="flex-1 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-black uppercase tracking-wider text-zinc-555 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitCompletion}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider text-xs px-4 py-3 rounded-2xl"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrefsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800 my-8">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="text-lg font-black text-zinc-850 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Settings size={18} /> Preferências do Cronograma
              </h3>
              <button
                onClick={() => setShowPrefsModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeConcurso?.targetDate ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-xl flex gap-3 items-center">
                  <CalendarIcon className="text-emerald-500 shrink-0" size={20} />
                  <div>
                    <h5 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Data Limite Definida Pela Prova</h5>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                      O cronograma terminará exatamente no dia anterior à prova do seu concurso ({new Date(`${activeConcurso.targetDate.split('T')[0]}T12:00:00`).toLocaleDateString('pt-BR')}).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex gap-3 items-center">
                  <Info className="text-amber-500 shrink-0" size={20} />
                  <div>
                    <h5 className="font-bold text-amber-800 dark:text-amber-300 text-xs">Nenhuma Data de Prova Cadastrada</h5>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                      O cronograma usará a duração padrão abaixo. Você pode cadastrar uma data de prova editando este curso na aba Cursos.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!activeConcurso?.targetDate && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1.5">Duração do Planejamento</label>
                    <select
                      value={durWeeks}
                      onChange={(e) => setDurWeeks(parseInt(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value={4}>4 Semanas (1 Mês)</option>
                      <option value={8}>8 Semanas (2 Meses)</option>
                      <option value={12}>12 Semanas (3 Meses)</option>
                      <option value={16}>16 Semanas (4 Meses)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1.5">Meta de Horas Diárias</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={dailyHours}
                    onChange={(e) => setDailyHours(Math.max(1, parseInt(e.target.value) || 3))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1.5">Disciplinas por Dia</label>
                  <select
                    value={subjectsPerDay}
                    onChange={(e) => setSubjectsPerDay(parseInt(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={1}>1 Disciplina</option>
                    <option value={2}>2 Disciplinas</option>
                    <option value={3}>3 Disciplinas</option>
                    <option value={4}>4 Disciplinas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1.5">Assuntos por Disciplina por Dia</label>
                  <select
                    value={topicsPerSubjectPerDay}
                    onChange={(e) => setTopicsPerSubjectPerDay(parseInt(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={1}>1 Assunto</option>
                    <option value={2}>2 Assuntos</option>
                    <option value={3}>3 Assuntos</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1.5">Data de Início</label>
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Dias Disponíveis para Estudo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WEEKDAYS.map(day => {
                      const isActive = activeDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setActiveDays(activeDays.filter(d => d !== day.id));
                            } else {
                              setActiveDays([...activeDays, day.id]);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all text-center ${
                            isActive
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                          }`}
                        >
                          {day.label.split('-')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => {
                  handleSavePreferences();
                  setShowPrefsModal(false);
                }}
                className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5"
              >
                Salvar Preferências
              </button>
              <button
                type="button"
                onClick={async () => {
                  handleSavePreferences();
                  await handleGenerate();
                  setShowPrefsModal(false);
                }}
                disabled={isGenerating}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isGenerating ? 'Gerando...' : 'Salvar e Gerar'}
                <Zap size={12} className="fill-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CronogramaView;
