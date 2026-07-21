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
  X,
  ExternalLink,
  BookMarked
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
  onResetConcursoSchedule?: (concursoId: string) => Promise<void>;
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
  onToggleScheduledStudyStatus,
  onResetConcursoSchedule
}) => {
  // UI States
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [isCronogramaEnabled, setIsCronogramaEnabled] = useState(true);

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
        if (prefs.isCronogramaEnabled !== undefined) setIsCronogramaEnabled(prefs.isCronogramaEnabled);
      } else {
        // defaults
        setDurWeeks(8);
        setDailyHours(3);
        setSubjectsPerDay(2);
        setTopicsPerSubjectPerDay(1);
        setActiveDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
        setStartDateStr(new Date().toISOString().split('T')[0]);
        setIsCronogramaEnabled(true);
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
      startDateStr,
      isCronogramaEnabled
    };
    localStorage.setItem(`cp_cronograma_prefs_${selectedConcursoId}`, JSON.stringify(prefs));
    alert('Preferências salvas com sucesso!');
  };

  const handleToggleCronogramaEnabled = async (enabled: boolean) => {
    if (!selectedConcursoId || selectedConcursoId === 'all') {
      alert('Por favor, selecione um concurso primeiro.');
      return;
    }
    setIsCronogramaEnabled(enabled);

    // Salvar preferência
    try {
      const saved = localStorage.getItem(`cp_cronograma_prefs_${selectedConcursoId}`);
      let prefs: any = {};
      if (saved) {
        prefs = JSON.parse(saved);
      }
      const updatedPrefs = {
        ...prefs,
        isCronogramaEnabled: enabled
      };
      localStorage.setItem(`cp_cronograma_prefs_${selectedConcursoId}`, JSON.stringify(updatedPrefs));
    } catch (e) {
      console.error('Error saving cronograma toggle:', e);
    }

    // Se estiver desativando, apagar apenas as atividades criadas automaticamente que ainda estão pendentes
    if (!enabled) {
      const autoGeneratedTasks = (scheduledStudies || []).filter(s => s.generatedByCronograma && s.status !== 'realizado');
      if (autoGeneratedTasks.length > 0) {
        const ids = autoGeneratedTasks.map(t => t.id);
        await onDeleteScheduledStudiesBatch(ids);
      }
    }
  };

  // Completion Dialog States
  const [completingTask, setCompletingTask] = useState<ScheduledStudy | null>(null);
  const [actualDuration, setActualDuration] = useState('');
  const [actualDone, setActualDone] = useState('');
  const [actualCorrect, setActualCorrect] = useState('');
  const [actualLinks, setActualLinks] = useState<string[]>(['']);

  // Tarefa expandida (exibe links do caderno de questões ao clicar)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const toggleExpandTask = (id: string) => setExpandedTaskId(prev => prev === id ? null : id);

  // Mapa de links do Caderno de Questões agrupado por disciplina+tópico.
  // Chave = "subjectId_topicId" (topicId vazio = "geral"), assim revisões futuras
  // de um mesmo assunto encontram os links do estudo de origem, independente da data.
  const notebookLinksMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (sessions || []).forEach(s => {
      if (!s.questionsLink || !s.subjectId) return;
      // Excluir sessões que são simulados ou revisões (só indexar estudos de origem)
      const isSim = s.isSimulado || s.activityType === 'Simulado';
      const isRev = s.activityType && (
        s.activityType.toLowerCase().includes('revisão') ||
        s.activityType.toLowerCase().includes('revisao')
      );
      if (isSim || isRev) return;

      let links: string[] = [];
      try {
        const parsed = JSON.parse(s.questionsLink);
        links = Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [parsed] : []);
      } catch {
        links = [s.questionsLink];
      }
      if (links.length === 0) return;

      // Chave por disciplina + tópico (sem data, para abranger todas as revisões futuras)
      const topicKey = s.topicId || 'geral';
      const key = `${s.subjectId}_${topicKey}`;
      const existing = map.get(key) || [];
      const merged = Array.from(new Set([...existing, ...links]));
      map.set(key, merged);
    });
    return map;
  }, [sessions]);

  // Active Concurso
  const activeConcurso = useMemo(() => {
    return concursos.find(c => c.id === selectedConcursoId);
  }, [concursos, selectedConcursoId]);

  // Filter scheduled studies related to subjects of active concurso
  const activeConcursoSubjectIds = useMemo(() => {
    return new Set((subjects || []).map(s => s.id));
  }, [subjects]);

  const cronogramaStudies = useMemo(() => {
    return (scheduledStudies || []).filter(s => 
      s.generatedByCronograma && 
      (activeConcursoSubjectIds.has(s.subjectId) || s.activityType === 'Simulado')
    );
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
      const weeklyStudiedSubjects: Set<string> = new Set();

      for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + dayOffset);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Reset weekly studied subjects on Mondays
        const dayOfWeekStr = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (dayOfWeekStr === 'Monday') {
          weeklyStudiedSubjects.clear();
        }

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
            weeklyStudiedSubjects.add(profile.subject.name);
            for (let tIdx = 0; tIdx < topicsPerSubjectPerDay; tIdx++) {
              const topic = profile.queue[profile.queueIndex % profile.queue.length];
              if (topic) {
                profile.queueIndex++;
              }

              // Group reading and questions into a single planner task
              items.push({
                date: dateStr,
                subjectId: profile.subject.id,
                topicId: topic?.id,
                activityType: 'Leitura, Questões',
                notes: `Leitura e Questões: ${topic?.title || 'Conteúdo geral'}`,
                durationInMinutes: totalMinutesPerTopic,
                questionsDone: 10,
                questionsCorrect: 7,
                generatedByCronograma: true
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
              questionsCorrect: 0,
              generatedByCronograma: true
            });
          }
        } else {
          // Off-day / Sunday: schedule a Simulado session including only subjects studied during the week
          const fallbackSubject = subjects[0] || { id: '' };
          const studiedListStr = weeklyStudiedSubjects.size > 0 
            ? Array.from(weeklyStudiedSubjects).join(', ') 
            : 'Matérias do edital';

          items.push({
            date: dateStr,
            subjectId: fallbackSubject.id,
            activityType: 'Simulado',
            notes: `Simulado Semanal: ${studiedListStr}`,
            durationInMinutes: 300,
            questionsDone: 60,
            questionsCorrect: 42,
            generatedByCronograma: true
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

  // Reset/Clear all schedule & history
  const handleResetAll = async () => {
    if (!selectedConcursoId || selectedConcursoId === 'all') return;
    if (confirm('ATENÇÃO: Esta ação irá excluir definitivamente todas as atividades (planejadas e realizadas) no Planner deste concurso, e também limpará todo o histórico de sessões e simulados deste concurso. Deseja continuar?')) {
      if (onResetConcursoSchedule) {
        await onResetConcursoSchedule(selectedConcursoId);
        alert('Cronograma e histórico limpos com sucesso!');
      }
    }
  };

  // Clear / Delete schedule (only uncompleted)
  const handleClearSchedule = async () => {
    if (confirm('Tem certeza de que deseja apagar todo o cronograma de estudos planejado? Esta ação não afetará as sessões de estudo já concluídas ou revisões agendadas.')) {
      const ids = cronogramaStudies
        .filter(s => s.generatedByCronograma && s.status !== 'realizado')
        .map(s => s.id);
      await onDeleteScheduledStudiesBatch(ids);
    }
  };

  // Complete click handler
  const handleCompleteClick = (task: ScheduledStudy) => {
    setCompletingTask(task);
    setActualDuration(String(task.durationInMinutes || ''));
    setActualDone(String(task.questionsDone || ''));
    setActualCorrect(String(task.questionsCorrect || ''));
    
    let linkList: string[] = [''];
    if (task.questionsLink) {
      try {
        const parsed = JSON.parse(task.questionsLink);
        if (Array.isArray(parsed)) {
          linkList = parsed.length > 0 ? parsed : [''];
        } else if (typeof parsed === 'string') {
          linkList = [parsed];
        }
      } catch (e) {
        linkList = [task.questionsLink];
      }
    }
    setActualLinks(linkList);
  };

  const submitCompletion = async () => {
    if (!completingTask) return;
    try {
      const doneVal = parseInt(actualDone) || 0;
      const correctVal = parseInt(actualCorrect) || 0;
      const durVal = parseInt(actualDuration) || completingTask.durationInMinutes || 0;

      const filteredLinks = actualLinks.filter(Boolean);
      const linkPayload = filteredLinks.length > 0 ? JSON.stringify(filteredLinks) : undefined;

      // Update study properties first
      completingTask.durationInMinutes = durVal;
      completingTask.questionsDone = doneVal;
      completingTask.questionsCorrect = Math.min(correctVal, doneVal); // correct cannot exceed total done
      completingTask.questionsLink = linkPayload;

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

              <div className="border-t border-zinc-150 dark:border-zinc-800 pt-8 flex justify-center flex-wrap gap-4">
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

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-500 font-black uppercase tracking-widest text-xs px-8 py-4 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <Trash2 size={14} />
                  Zerar Cronograma
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isCronogramaEnabled) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm space-y-6 mt-10">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <X size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">
              Cronograma Inteligente Desativado
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Você desativou as sugestões automáticas do cronograma inteligente para o seu Planner. O seu Planner agora exibirá apenas as atividades criadas manualmente por você para seguir o seu planejamento externo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleCronogramaEnabled(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs py-3.5 px-8 rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            Ativar Cronograma Inteligente
          </button>
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
            onClick={() => {
              if (confirm('Deseja desativar o Cronograma Inteligente? Isso removerá todas as atividades geradas automaticamente do seu Planner, mantendo apenas as suas atividades manuais.')) {
                handleToggleCronogramaEnabled(false);
              }
            }}
            className="text-zinc-400 hover:text-rose-500 transition-colors p-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5"
            title="Desativar Cronograma Inteligente"
          >
            <X size={14} /> Desativar
          </button>
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
            title="Apagar Cronograma Planejado"
          >
            <Trash2 size={14} /> Limpar
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="text-rose-500 hover:text-rose-600 transition-colors p-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-rose-500/20 rounded-xl px-3 hover:bg-rose-500/5"
            title="Zerar Cronograma e Histórico"
          >
            <Trash2 size={14} /> Zerar Cronograma
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
                        
                        const nbKey = `${act.subjectId}_${act.topicId || 'geral'}`;
                        const nbLinks = notebookLinksMap.get(nbKey) || [];
                        const isExpanded = expandedTaskId === act.id;

                        return (
                          <div key={act.id} className="space-y-0">
                            <div
                              style={{ borderLeftColor: sub?.color || '#10B981' }}
                              onClick={() => { if (nbLinks.length > 0) toggleExpandTask(act.id); }}
                              className={`p-3.5 rounded-2xl border-l-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50 flex justify-between items-center transition-all ${
                                isDone ? 'opacity-40 hover:opacity-60' : ''
                              } ${
                                nbLinks.length > 0 ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/70' : ''
                              } ${
                                isExpanded ? 'rounded-b-none border-b-0' : ''
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
                                  {nbLinks.length > 0 && (
                                    <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center gap-0.5 border border-amber-200/60 dark:border-amber-800/40">
                                      <BookMarked size={7} /> {nbLinks.length}
                                    </span>
                                  )}
                                </div>
                                <h5 className={`text-xs font-black text-zinc-755 dark:text-white leading-tight ${isDone ? 'line-through' : ''}`}>
                                  {topic ? topic.title : act.notes}
                                </h5>
                                <p className="text-[9px] text-zinc-400 font-bold mt-1.5 flex items-center gap-1 font-mono">
                                  <Clock size={9} /> {act.durationInMinutes} min
                                </p>
                                {act.questionsLink && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {(() => {
                                      let links: string[] = [];
                                      try {
                                        const parsed = JSON.parse(act.questionsLink);
                                        links = Array.isArray(parsed) ? parsed : [parsed];
                                      } catch (e) {
                                        links = [act.questionsLink];
                                      }
                                      return links.filter(Boolean).map((link, idx) => (
                                        <a
                                          key={idx}
                                          href={link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                                          title={link}
                                        >
                                          <ExternalLink size={8} /> Q{idx + 1}
                                        </a>
                                      ));
                                    })()}
                                  </div>
                                )}
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

                            {/* Painel colapsável de links do Caderno de Questões */}
                            {isExpanded && nbLinks.length > 0 && (
                              <div
                                style={{ borderLeftColor: sub?.color || '#10B981' }}
                                className="border-l-4 border border-t-0 border-amber-200/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/20 rounded-b-2xl px-3 pb-2.5 pt-2"
                              >
                                <p className="text-[7px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                                  <BookMarked size={7} /> Caderno de Questões
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {nbLinks.map((link, idx) => (
                                    <a
                                      key={idx}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-white dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors flex items-center gap-1 cursor-pointer border border-amber-300/60 dark:border-amber-700/40 shadow-xs"
                                      title={link}
                                    >
                                      <BookMarked size={8} /> C{idx + 1}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
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

                  const nbKey = `${act.subjectId}_${act.topicId || 'geral'}`;
                  const nbLinks = notebookLinksMap.get(nbKey) || [];
                  const isExpanded = expandedTaskId === act.id;

                  return (
                    <div key={act.id} className="space-y-0">
                      <div
                        style={{ borderLeftColor: sub?.color || '#10B981' }}
                        onClick={() => { if (nbLinks.length > 0) toggleExpandTask(act.id); }}
                        className={`p-4 border-l-4 bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-700/50 flex justify-between items-start gap-4 transition-all ${
                          isDone ? 'opacity-40' : ''
                        } ${
                          nbLinks.length > 0 ? 'cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50' : ''
                        } ${
                          isExpanded ? 'rounded-t-3xl border-b-0' : 'rounded-3xl'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
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
                            {nbLinks.length > 0 && (
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1 border transition-colors ${
                                isExpanded
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300/70 dark:border-amber-700/50'
                                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40'
                              }`}>
                                <BookMarked size={8} />
                                {nbLinks.length} {nbLinks.length === 1 ? 'caderno' : 'cadernos'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-zinc-800 dark:text-white leading-tight">{topic ? topic.title : act.notes}</h4>
                          {topic && act.notes && <p className="text-xs text-zinc-400 mt-1 font-semibold">{act.notes}</p>}
                          <p className="text-xs text-zinc-400 font-bold mt-2 flex items-center gap-1 font-mono">
                            <Clock size={11} /> {act.durationInMinutes} minutos
                          </p>
                          {act.questionsLink && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {(() => {
                                let links: string[] = [];
                                try {
                                  const parsed = JSON.parse(act.questionsLink);
                                  links = Array.isArray(parsed) ? parsed : [parsed];
                                } catch (e) {
                                  links = [act.questionsLink];
                                }
                                return links.filter(Boolean).map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2 py-1 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                                    title={link}
                                  >
                                    <ExternalLink size={9} /> Q{idx + 1}
                                  </a>
                                ));
                              })()}
                            </div>
                          )}
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
                          className={`shrink-0 px-4 py-2.5 rounded-2xl border transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 ${
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

                      {/* Painel colapsável de links do Caderno de Questões */}
                      {isExpanded && nbLinks.length > 0 && (
                        <div
                          style={{ borderLeftColor: sub?.color || '#10B981' }}
                          className="border-l-4 border border-t-0 border-amber-200/70 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/15 rounded-b-3xl px-5 pb-4 pt-3"
                        >
                          <p className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                            <BookMarked size={8} /> Caderno de Questões
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {nbLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300/60 dark:border-amber-700/40 shadow-xs hover:shadow-sm"
                                title={link}
                              >
                                <BookMarked size={11} /> Caderno {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
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

              {completingTask.activityType && completingTask.activityType.includes('Questões') && (
                <div className="space-y-2 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Links do Caderno de Questões</label>
                    <button
                      type="button"
                      onClick={() => setActualLinks([...actualLinks, ''])}
                      className="text-[9px] font-bold text-indigo-500 hover:text-indigo-650 transition-colors flex items-center gap-1 uppercase cursor-pointer"
                    >
                      <Plus size={10} /> Adicionar
                    </button>
                  </div>
                  {actualLinks.map((lnk, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={lnk}
                        onChange={(e) => {
                          const next = [...actualLinks];
                          next[idx] = e.target.value;
                          setActualLinks(next);
                        }}
                        className="flex-1 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-750 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-white focus:outline-none"
                      />
                      {lnk && (
                        <a
                          href={lnk}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors cursor-pointer"
                          title="Testar Link"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const next = actualLinks.filter((_, i) => i !== idx);
                          setActualLinks(next);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {actualLinks.length === 0 && (
                    <p className="text-[10px] text-zinc-400 italic">Nenhum link adicionado.</p>
                  )}
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
