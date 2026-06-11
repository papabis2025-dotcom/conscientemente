import React, { useState, useMemo } from 'react';
import { Subject, ScheduledStudy, ActivityType, Topic, StudySession, Simulado } from '../types';
import { getBadgeStyle } from '../utils/colors';
import { FileText, Layers, Video, BookOpen, Clipboard, Book, Clock, RefreshCw } from 'lucide-react';

interface CalendarViewProps {
  subjects: Subject[]; // For dropdown (filtered)
  allSubjects?: Subject[]; // For lookup (global)
  scheduledStudies: ScheduledStudy[];
  simulados: Simulado[];
  onUpdateSchedule: (studies: ScheduledStudy[]) => void;
  onDelete: (id: string) => void;
  onAddSession?: (session: StudySession) => void;
  onAddSessionsBatch?: (sessions: StudySession[]) => void;
  onToggleStatus?: (idOrIds: string | string[]) => void;
  onUpdateScheduledStudy: (id: string, updates: Partial<ScheduledStudy>) => void;
}

type ViewMode = 'semanal' | 'mensal' | 'anual';

const parseNotesGroup = (notes: string) => {
  const match = notes?.match(/^\[groupId:([^\]]+)\](.*)/s);
  if (match) {
    return { groupId: match[1], cleanNotes: match[2].trim() };
  }
  return { groupId: null, cleanNotes: notes || '' };
};

const CalendarView: React.FC<CalendarViewProps> = ({ 
  subjects, 
  allSubjects, 
  scheduledStudies, 
  simulados,
  onUpdateSchedule, 
  onDelete, 
  onAddSession, 
  onAddSessionsBatch,
  onToggleStatus,
  onUpdateScheduledStudy 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('mensal');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledStudy | null>(null);

  // Use allSubjects for lookup if available, otherwise fallback to subjects
  const lookupSubjects = allSubjects || subjects;

  const handleDragStart = (e: React.DragEvent, idOrIds: string) => {
    e.dataTransfer.setData('text/plain', idOrIds);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const idOrIds = e.dataTransfer.getData('text/plain');
    if (!idOrIds) return;
    const ids = idOrIds.split(',');
    for (const id of ids) {
      onUpdateScheduledStudy(id, { date: targetDate });
    }
  };

  const [formData, setFormData] = useState({
    subjectId: '',
    topicIds: [] as string[],
    activityTypes: ['Leitura'] as string[],
    duration: '',
    questionsDone: '',
    questionsCorrect: '',
    notes: '',
    status: 'planejado' as 'planejado' | 'realizado'
  });

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const getDayKey = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  };

  const handleDayClick = (dayKey: string) => {
    setSelectedDayKey(dayKey);
    setEditingTask(null);
    setFormData({
      subjectId: '',
      topicIds: [],
      activityTypes: ['Leitura'],
      duration: '',
      questionsDone: '',
      questionsCorrect: '',
      notes: '',
      status: 'planejado'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.subjectId || selectedDayKey === null) return;

    const durationVal = parseInt(formData.duration) || 0;
    const selectedTypes = formData.activityTypes;
    const hasQuestions = selectedTypes.includes('Questões') || selectedTypes.includes('Flashcards') || selectedTypes.includes('Revisão');
    const questionsDoneVal = hasQuestions ? (parseInt(formData.questionsDone) || undefined) : undefined;
    const questionsCorrectVal = hasQuestions ? (parseInt(formData.questionsCorrect) || undefined) : undefined;
    const activityTypesStr = selectedTypes.join(', ');

    const selectedTopicIds = formData.topicIds;
    const topicIdsToSave = selectedTopicIds.length > 0 ? selectedTopicIds : [undefined];
    const count = topicIdsToSave.length;

    // 1. Clean up old entries if editing
    if (editingTask) {
      if (editingTask.notes) {
        const { groupId } = parseNotesGroup(editingTask.notes);
        if (groupId) {
          const groupTasks = scheduledStudies.filter(t => t.notes && parseNotesGroup(t.notes).groupId === groupId);
          for (const t of groupTasks) {
            const res = onDelete(t.id);
            if (res instanceof Promise) await res;
          }
        } else {
          const res = onDelete(editingTask.id);
          if (res instanceof Promise) await res;
        }
      } else {
        const res = onDelete(editingTask.id);
        if (res instanceof Promise) await res;
      }
    }

    // 2. Insert new entries
    const newGroupId = count > 1 ? crypto.randomUUID() : null;
    const notesToSave = newGroupId ? `[groupId:${newGroupId}] ${formData.notes}`.trim() : formData.notes;

    const baseDuration = Math.floor(durationVal / count);
    const remDuration = durationVal % count;

    const baseDone = questionsDoneVal !== undefined ? Math.floor(questionsDoneVal / count) : undefined;
    const remDone = questionsDoneVal !== undefined ? questionsDoneVal % count : 0;

    const baseCorrect = questionsCorrectVal !== undefined ? Math.floor(questionsCorrectVal / count) : undefined;
    const remCorrect = questionsCorrectVal !== undefined ? questionsCorrectVal % count : 0;

    const newEntries: ScheduledStudy[] = [];
    const sessionsList: StudySession[] = [];

    for (let i = 0; i < count; i++) {
      const itemDuration = i === 0 ? baseDuration + remDuration : baseDuration;
      const itemDone = questionsDoneVal !== undefined ? (i === 0 ? baseDone! + remDone : baseDone) : undefined;
      const itemCorrect = questionsCorrectVal !== undefined ? (i === 0 ? baseCorrect! + remCorrect : baseCorrect) : undefined;
      const topicId = topicIdsToSave[i];

      if (formData.status === 'realizado') {
        sessionsList.push({
          id: count > 1 ? crypto.randomUUID() : (editingTask ? editingTask.id : crypto.randomUUID()),
          subjectId: formData.subjectId,
          topicId: topicId,
          durationInMinutes: itemDuration,
          date: new Date(`${selectedDayKey}T12:00:00`).toISOString(),
          questionsDone: itemDone,
          questionsCorrect: itemCorrect,
          activityType: activityTypesStr,
          notes: notesToSave
        } as any);
      } else {
        newEntries.push({
          id: crypto.randomUUID(),
          date: selectedDayKey,
          subjectId: formData.subjectId,
          topicId: topicId,
          activityType: activityTypesStr,
          notes: notesToSave,
          durationInMinutes: itemDuration || undefined,
          questionsDone: itemDone,
          questionsCorrect: itemCorrect,
          status: formData.status
        });
      }
    }

    if (formData.status === 'realizado' && sessionsList.length > 0) {
      if (onAddSessionsBatch) {
        await onAddSessionsBatch(sessionsList);
      } else if (onAddSession) {
        for (const s of sessionsList) {
          await onAddSession(s);
        }
      }
    }

    if (newEntries.length > 0) {
      let remainingStudies = [...scheduledStudies];
      if (editingTask) {
        if (editingTask.notes) {
          const { groupId } = parseNotesGroup(editingTask.notes);
          if (groupId) {
            remainingStudies = remainingStudies.filter(t => !t.notes || parseNotesGroup(t.notes).groupId !== groupId);
          } else {
            remainingStudies = remainingStudies.filter(t => t.id !== editingTask.id);
          }
        } else {
          remainingStudies = remainingStudies.filter(t => t.id !== editingTask.id);
        }
      }
      onUpdateSchedule([...remainingStudies, ...newEntries]);
    }

    setEditingTask(null);
    setShowModal(false);
    setFormData({
      subjectId: '',
      topicIds: [],
      activityTypes: ['Leitura'],
      duration: '',
      questionsDone: '',
      questionsCorrect: '',
      notes: '',
      status: 'planejado'
    });
  };

  const handleDelete = async (id: string) => {
    const task = scheduledStudies.find(t => t.id === id);
    if (task && task.notes) {
      const { groupId } = parseNotesGroup(task.notes);
      if (groupId) {
        const groupTasks = scheduledStudies.filter(t => t.notes && parseNotesGroup(t.notes).groupId === groupId);
        for (const t of groupTasks) {
          const res = onDelete(t.id);
          if (res instanceof Promise) await res;
        }
        return;
      }
    }
    const res = onDelete(id);
    if (res instanceof Promise) await res;
  };

  const handleNavigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'mensal') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'semanal') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'anual') {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setCurrentDate(newDate);
  };

  const visibleScheduledStudies = scheduledStudies.filter(s => !(s.activityType === 'Simulado' && s.status === 'realizado'));

  // A helper to get the tasks for a given day (date string YYYY-MM-DD)
  // including both visibleScheduledStudies and the grouped virtual simulados.
  const getDailyTasks = (dayKey: string) => {
    const dayTasks = visibleScheduledStudies.filter(s => s.date && (s.date === dayKey || s.date.split('T')[0] === dayKey));
    const daySims = (simulados || []).filter(sim => sim.date && (sim.date === dayKey || sim.date.split('T')[0] === dayKey));

    // Grouping logic
    const groupedMap = new Map<string, ScheduledStudy[]>();
    const nonGrouped: ScheduledStudy[] = [];

    dayTasks.forEach(task => {
      if (task.notes) {
        const { groupId } = parseNotesGroup(task.notes);
        if (groupId) {
          if (!groupedMap.has(groupId)) {
            groupedMap.set(groupId, []);
          }
          groupedMap.get(groupId)!.push(task);
          return;
        }
      }
      nonGrouped.push(task);
    });

    const groupedVirtualTasks = Array.from(groupedMap.entries()).map(([groupId, tasks]) => {
      const firstTask = tasks[0];
      const { cleanNotes } = parseNotesGroup(firstTask.notes || '');
      const topicIds = tasks.map(t => t.topicId).filter(Boolean) as string[];
      
      const totalDuration = tasks.reduce((acc, t) => acc + (t.durationInMinutes || 0), 0);
      const totalDone = tasks.some(t => t.questionsDone !== undefined)
        ? tasks.reduce((acc, t) => acc + (t.questionsDone || 0), 0)
        : undefined;
      const totalCorrect = tasks.some(t => t.questionsCorrect !== undefined)
        ? tasks.reduce((acc, t) => acc + (t.questionsCorrect || 0), 0)
        : undefined;

      return {
        id: firstTask.id,
        date: firstTask.date,
        subjectId: firstTask.subjectId,
        topicIds: topicIds,
        topicId: firstTask.topicId, 
        activityType: firstTask.activityType,
        notes: cleanNotes,
        durationInMinutes: totalDuration || undefined,
        questionsDone: totalDone,
        questionsCorrect: totalCorrect,
        status: firstTask.status,
        isGroupedVirtual: true,
        groupId: groupId,
        taskIds: tasks.map(t => t.id)
      };
    });

    const virtualSims = daySims.map(sim => ({
      id: `sim-${sim.id}`,
      date: dayKey,
      subjectId: '',
      activityType: 'Simulado' as ActivityType,
      notes: sim.name,
      isSimuladoVirtual: true,
      simuladoId: sim.id,
      name: sim.name,
      durationInMinutes: sim.durationInMinutes || 0,
      questionsDone: sim.results.reduce((acc, r) => acc + r.done, 0),
      questionsCorrect: sim.results.reduce((acc, r) => acc + r.correct, 0),
      status: 'realizado' as const,
      results: sim.results
    }));

    return [...groupedVirtualTasks, ...nonGrouped, ...virtualSims] as any[];
  };

  const tasksForSelectedDay = getDailyTasks(selectedDayKey || '');

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getActivityIcon = (type?: ActivityType) => {
    const size = 12;
    switch (type) {
      case 'Questões': return <FileText size={size} />;
      case 'Flashcards': return <Layers size={size} />;
      case 'Aula': return <Video size={size} />;
      case 'Leitura': return <BookOpen size={size} />;
      case 'Simulado': return <Clipboard size={size} />;
      case 'Revisão': return <RefreshCw size={size} />;
      default: return <Book size={size} />;
    }
  };

  const handleTaskClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    if (task.isSimuladoVirtual) {
      alert(`Simulado: ${task.name}\nDuração: ${task.durationInMinutes} min\nQuestões: ${task.questionsCorrect}/${task.questionsDone} acertos (${task.questionsDone > 0 ? Math.round((task.questionsCorrect / task.questionsDone) * 100) : 0}%)`);
      return;
    }
    setSelectedDayKey(task.date || task.date.split('T')[0]);
    setEditingTask(task);
    const types = task.activityType
      ? task.activityType.split(',').map((t: string) => t.trim())
      : ['Leitura'];

    setFormData({
      subjectId: task.subjectId,
      topicId: task.topicId || '',
      activityTypes: types,
      duration: task.durationInMinutes?.toString() || '',
      questionsDone: task.questionsDone?.toString() || '',
      questionsCorrect: task.questionsCorrect?.toString() || '',
      notes: task.notes || '',
      status: task.status || 'planejado'
    });
    setShowModal(true);
  };

  const renderView = () => {
    switch (viewMode) {
      case 'semanal':
        return (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 flex-1 min-h-0">
            {weekDays.map(date => {
              const key = getDayKey(date);
              const tasks = getDailyTasks(key);
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div 
                  key={key} 
                  onClick={() => handleDayClick(key)} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, key)}
                  className={`bg-white dark:bg-zinc-900 p-3 rounded-3xl border ${isToday ? 'border-blue-400 shadow-lg' : 'border-zinc-100 dark:border-zinc-800'} flex flex-col cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all overflow-hidden`}
                >
                  <div className="mb-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 leading-tight">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]}</p>
                    <h4 className={`text-xl font-black ${isToday ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-200'}`}>{date.getDate()}</h4>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {tasks.map(task => {
                      if (task.isSimuladoVirtual) {
                        return (
                          <div 
                            key={task.id} 
                            onClick={(e) => handleTaskClick(e, task)}
                            className="p-3 rounded-2xl text-xs font-bold border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-900 dark:text-amber-250 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                          >
                            <span className="flex items-center gap-1 font-black text-amber-600 dark:text-amber-400">SIMULADO</span>
                            <p className="font-black truncate mt-1 text-sm">{task.name}</p>
                            <p className="text-[10px] opacity-90 mt-1 font-bold flex items-center gap-1">
                              <Clock size={10} /> {task.durationInMinutes} min | <FileText size={10} /> {task.questionsCorrect}/{task.questionsDone} Qs
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(task.results || []).map((r: any, idx: number) => {
                                const sub = lookupSubjects.find(s => s.id === r.subjectId);
                                return (
                                  <span key={idx} className="px-1.5 py-0.5 rounded-full text-[8px] bg-zinc-200/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold">
                                    {sub?.name || 'Matéria'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      const sub = lookupSubjects.find(s => s.id === task.subjectId);
                      const { style, className } = sub ? getBadgeStyle(sub.color) : { style: {}, className: 'bg-zinc-400 text-white' };
                      return (
                        <div 
                          key={task.id} 
                          style={{ ...style, opacity: task.status === 'realizado' ? 0.45 : 1 }} 
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.isGroupedVirtual ? task.taskIds.join(',') : task.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleStatus) onToggleStatus(task.isGroupedVirtual ? task.taskIds : task.id);
                          }}
                          className={`p-4 rounded-2xl text-xs font-bold border border-white/10 ${className} cursor-pointer transition-all hover:scale-[1.02] active:scale-95`}
                        >
                          <span className="opacity-70 flex items-center gap-1">{getActivityIcon(task.activityType)} {task.activityType}</span>
                          <p className="truncate font-black">{sub ? sub.name : 'Disciplina Removida'}</p>
                          {task.isGroupedVirtual && sub && task.topicIds && task.topicIds.length > 0 && (
                            <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1 font-medium italic">
                              {task.topicIds.map((id: string) => sub.topics.find(t => t.id === id)?.title).filter(Boolean).join(', ')}
                            </p>
                          )}
                          {!task.isGroupedVirtual && task.topicId && sub && (
                            <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1 font-medium italic">
                              {sub.topics.find(t => t.id === task.topicId)?.title || 'Assunto não encontrado'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'mensal':
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const numDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        return (
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
            <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-zinc-50/30 dark:bg-zinc-950/20 border-r border-b border-zinc-100 dark:border-zinc-800/50" />
              ))}
              {Array.from({ length: numDays }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const key = getDayKey(date);
                const tasks = getDailyTasks(key);
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div 
                    key={day} 
                    onClick={() => handleDayClick(key)} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, key)}
                    className="p-1.5 border-r border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all flex flex-col min-h-0 overflow-hidden"
                  >
                    <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-zinc-900 dark:bg-zinc-700 text-white' : 'text-zinc-400'}`}>{day}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto">
                      {tasks.map(t => {
                        if (t.isSimuladoVirtual) {
                          return (
                            <div 
                              key={t.id}
                              onClick={(e) => handleTaskClick(e, t)}
                              className="px-2 py-1.5 rounded-lg text-[10px] leading-tight font-black border-2 border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span>{t.name}</span>
                                <span className="text-[8px] opacity-80 font-bold flex items-center gap-1">
                                  <Clock size={8} /> {t.durationInMinutes}m | <FileText size={8} /> {t.questionsCorrect}/{t.questionsDone} Qs
                                </span>
                              </div>
                            </div>
                          );
                        }
                        const sub = lookupSubjects.find(s => s.id === t.subjectId);
                        const { style, className } = sub ? getBadgeStyle(sub.color) : { style: {}, className: 'bg-zinc-400 text-white' };
                        return (
                          <div 
                            key={t.id} 
                            style={{ ...style, opacity: t.status === 'realizado' ? 0.45 : 1 }} 
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, t.isGroupedVirtual ? t.taskIds.join(',') : t.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleStatus) onToggleStatus(t.isGroupedVirtual ? t.taskIds : t.id);
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10px] leading-tight font-bold line-clamp-2 ${className} cursor-pointer transition-all hover:scale-[1.02] active:scale-95`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate">{sub ? sub.name : 'Disciplina Removida'}</span>
                              {t.isGroupedVirtual && sub && t.topicIds && t.topicIds.length > 0 && (
                                <span className="text-[8px] opacity-80 font-medium line-clamp-1 italic">
                                  {t.topicIds.map((id: string) => sub.topics.find(top => top.id === id)?.title).filter(Boolean).join(', ')}
                                </span>
                              )}
                              {!t.isGroupedVirtual && t.topicId && sub && (
                                <span className="text-[8px] opacity-80 font-medium line-clamp-1 italic">
                                  {sub.topics.find(top => top.id === t.topicId)?.title}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      default: return <div className="p-20 text-center text-zinc-400 font-bold uppercase tracking-widest opacity-30">Selecione uma visualização</div>;
    }
  };

  const getTitle = () => {
    if (viewMode === 'mensal') return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === 'semanal') return `Semana de ${weekDays[0].getDate()} a ${weekDays[6].getDate()} de ${monthNames[weekDays[6].getMonth()]}`;
    return "Planner";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase">Planner de Estudos</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Organize seu cronograma e acompanhe o que já foi cumprido.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 shadow-sm flex">
            {(['semanal', 'mensal', 'anual'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-zinc-950 dark:bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <button onClick={() => handleNavigate(-1)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold transition-colors">◀</button>
            <span className="font-black text-[10px] uppercase tracking-widest min-w-[120px] text-center dark:text-white">{getTitle()}</span>
            <button onClick={() => handleNavigate(1)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold transition-colors">▶</button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">{renderView()}</div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col md:flex-row">
            <div className="w-full md:w-5/12 bg-zinc-50 dark:bg-zinc-800/50 p-8 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto max-h-[80vh]">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase mb-6 tracking-widest">Logs do Dia</h4>
              <div className="space-y-3">
                {tasksForSelectedDay.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => {
                      if (task.isSimuladoVirtual) {
                        alert(`Simulado: ${task.name}\nDuração: ${task.durationInMinutes} min\nQuestões: ${task.questionsCorrect}/${task.questionsDone} acertos`);
                        return;
                      }
                      setEditingTask(task);
                      const types = task.activityType
                        ? task.activityType.split(',').map((t: string) => t.trim())
                        : ['Leitura'];
                      setFormData({
                        subjectId: task.subjectId,
                        topicIds: task.topicIds || (task.topicId ? [task.topicId] : []),
                        activityTypes: types,
                        duration: task.durationInMinutes?.toString() || '',
                        questionsDone: task.questionsDone?.toString() || '',
                        questionsCorrect: task.questionsCorrect?.toString() || '',
                        notes: task.notes || '',
                        status: task.status || 'planejado'
                      });
                    }}
                    className={`p-4 rounded-[1.5rem] border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative ${
                      task.isSimuladoVirtual
                        ? 'border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-250 shadow-sm'
                        : editingTask?.id === task.id 
                          ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800' 
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {!task.isSimuladoVirtual && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDelete(task.id); 
                          if (editingTask?.id === task.id) setEditingTask(null); 
                        }} 
                        className="absolute top-2 right-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        ✕
                      </button>
                    )}
                    <p className="text-[8px] font-black uppercase text-zinc-900 dark:text-zinc-100 mb-1 flex justify-between items-center">
                      <span>{task.isSimuladoVirtual ? 'SIMULADO' : task.activityType}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                        task.isSimuladoVirtual
                          ? 'bg-amber-150 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 font-black'
                          : task.status === 'realizado' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        {task.isSimuladoVirtual ? 'Realizado' : (task.status === 'realizado' ? 'Realizado' : 'Planejado')}
                      </span>
                    </p>
                    <h5 className="text-xs font-bold dark:text-white truncate">
                      {task.isSimuladoVirtual ? task.name : (lookupSubjects.find(s => s.id === task.subjectId)?.name || <span className="text-rose-400 italic">Desconhecida</span>)}
                    </h5>
                    {task.questionsDone !== undefined && (
                      <p className="text-[9px] text-zinc-400 mt-1 font-bold">{task.questionsCorrect}/{task.questionsDone} Questões</p>
                    )}
                    {task.durationInMinutes !== undefined && task.durationInMinutes > 0 && (
                      <p className="text-[9px] text-zinc-400 font-bold">{task.durationInMinutes} min</p>
                    )}
                  </div>
                ))}
                {tasksForSelectedDay.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-10 opacity-40">Vazio</p>}
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {editingTask ? 'Editar Registro' : 'Novo Registro'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400">✕</button>
              </div>

              {editingTask && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingTask(null);
                    setFormData({
                      subjectId: '',
                      topicIds: [],
                      activityTypes: ['Leitura'],
                      duration: '',
                      questionsDone: '',
                      questionsCorrect: '',
                      notes: '',
                      status: 'planejado'
                    });
                  }}
                  className="text-xs font-black uppercase tracking-wider text-blue-500 hover:text-blue-600 mb-4 block"
                >
                  + Adicionar Novo Registro
                </button>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Tipo de Atividade (Selecione uma ou mais)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Leitura', 'Questões', 'Flashcards', 'Aula', 'Simulado', 'Revisão'].map(type => {
                      const isSelected = formData.activityTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const current = formData.activityTypes;
                            const next = current.includes(type)
                              ? current.filter(t => t !== type)
                              : [...current, type];
                            if (next.length > 0) {
                              setFormData({ ...formData, activityTypes: next });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                            isSelected
                              ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Disciplina</label>
                  <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicIds: [] })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white">
                    <option value="">Selecione...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {formData.subjectId && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block font-mono">Assunto / Tópico (Selecione vários)</label>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl outline-none focus:ring-zinc-500 custom-scrollbar">
                      <label className="flex items-center gap-2.5 text-xs font-bold dark:text-white cursor-pointer select-none hover:opacity-85 py-0.5">
                        <input
                          type="checkbox"
                          checked={formData.topicIds.length === 0}
                          onChange={() => setFormData({ ...formData, topicIds: [] })}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                        />
                        <span className="text-zinc-500 dark:text-zinc-400">Geral / Outros</span>
                      </label>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1 w-full" />
                      {(subjects.find(s => s.id === formData.subjectId)?.topics || []).map((t: Topic) => {
                        const isChecked = formData.topicIds.includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-2.5 text-xs font-bold dark:text-white cursor-pointer select-none hover:opacity-85 py-0.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const current = formData.topicIds;
                                const next = isChecked 
                                  ? current.filter(id => id !== t.id) 
                                  : [...current, t.id];
                                setFormData({ ...formData, topicIds: next });
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500"
                            />
                            <span>{t.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Duração (min)</label>
                    <input type="number" placeholder="Duração" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white">
                      <option value="planejado">Planejado</option>
                      <option value="realizado">Realizado</option>
                    </select>
                  </div>
                </div>

                {(formData.activityTypes.includes('Questões') || formData.activityTypes.includes('Flashcards') || formData.activityTypes.includes('Revisão')) && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Total Questões</label>
                      <input type="number" placeholder="Ex: 20" value={formData.questionsDone} onChange={(e) => setFormData({ ...formData, questionsDone: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Acertos</label>
                      <input type="number" placeholder="Ex: 18" value={formData.questionsCorrect} onChange={(e) => setFormData({ ...formData, questionsCorrect: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Anotações</label>
                  <textarea placeholder="Observações sobre o estudo..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white h-20 resize-none" />
                </div>

                <button onClick={handleSave} disabled={!formData.subjectId} className="w-full py-4 bg-zinc-900 dark:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg disabled:opacity-30 active:scale-95 transition-all mt-4">
                  {editingTask ? 'Salvar Alterações' : 'Salvar no Planner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
