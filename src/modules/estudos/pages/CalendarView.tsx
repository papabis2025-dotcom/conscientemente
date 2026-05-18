
import React, { useState, useMemo } from 'react';
import { Subject, ScheduledStudy, ActivityType, StudySession } from '../types';
import { getBadgeStyle } from '../utils/colors';
// No lucide-react icons used in this file

interface CalendarViewProps {
  subjects: Subject[]; // For dropdown (filtered)
  allSubjects?: Subject[]; // For lookup (global)
  scheduledStudies: ScheduledStudy[];
  onUpdateSchedule: (studies: ScheduledStudy[]) => void;
  onDelete: (id: string) => void;
  onAddSession?: (session: StudySession) => void;
  onToggleStatus?: (id: string) => void;
}

type ViewMode = 'semanal' | 'mensal' | 'semestral' | 'anual';

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, allSubjects, scheduledStudies, onUpdateSchedule, onDelete, onAddSession, onToggleStatus }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('mensal');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Use allSubjects for lookup if available, otherwise fallback to subjects
  const lookupSubjects = allSubjects || subjects;

  const [formData, setFormData] = useState({
    subjectId: '',
    topicId: '',
    activityType: 'Leitura' as ActivityType,
    duration: '',
    questionsDone: '',
    questionsCorrect: '',
    notes: ''
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
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.subjectId || selectedDayKey === null) return;

    if (onAddSession) {
      onAddSession({
        id: crypto.randomUUID(),
        subjectId: formData.subjectId,
        topicId: formData.topicId || undefined,
        durationInMinutes: parseInt(formData.duration) || 0,
        date: new Date(`${selectedDayKey}T12:00:00`).toISOString(),
        questionsDone: formData.activityType === 'Questões' ? (parseInt(formData.questionsDone) || undefined) : undefined,
        questionsCorrect: formData.activityType === 'Questões' ? (parseInt(formData.questionsCorrect) || undefined) : undefined,
        activityType: formData.activityType
      });
    } else {
      const newEntry: ScheduledStudy = {
        id: crypto.randomUUID(),
        date: selectedDayKey,
        subjectId: formData.subjectId,
        topicId: formData.topicId || undefined,
        activityType: formData.activityType,
        notes: formData.notes,
        durationInMinutes: parseInt(formData.duration) || undefined,
        questionsDone: formData.activityType === 'Questões' ? (parseInt(formData.questionsDone) || undefined) : undefined,
        questionsCorrect: formData.activityType === 'Questões' ? (parseInt(formData.questionsCorrect) || undefined) : undefined,
        status: 'realizado'
      };
      onUpdateSchedule([...scheduledStudies, newEntry]);
    }

    setShowModal(false);
    setFormData({
      subjectId: '',
      topicId: '',
      activityType: 'Leitura' as ActivityType,
      duration: '',
      questionsDone: '',
      questionsCorrect: '',
      notes: ''
    });
  };

  const handleDelete = (id: string) => {
    onDelete(id);
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

  const selectedSubject = subjects.find(s => s.id === formData.subjectId);
  const tasksForSelectedDay = scheduledStudies.filter(s => s.date === selectedDayKey);

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
    switch (type) {
      case 'Questões': return '📝';
      case 'Aula': return '🎥';
      case 'Leitura': return '📖';
      case 'Simulado': return '📋';
      default: return '📚';
    }
  };

  const renderView = () => {
    switch (viewMode) {
      case 'semanal':
        return (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 flex-1 min-h-0">
            {weekDays.map(date => {
              const key = getDayKey(date);
              const tasks = scheduledStudies.filter(s => (s.date && (s.date === key || s.date.split('T')[0] === key)));
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div key={key} onClick={() => handleDayClick(key)} className={`bg-white dark:bg-zinc-900 p-3 rounded-3xl border ${isToday ? 'border-blue-400 shadow-lg' : 'border-zinc-100 dark:border-zinc-800'} flex flex-col cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all overflow-hidden`}>
                  <div className="mb-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 leading-tight">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]}</p>
                    <h4 className={`text-xl font-black ${isToday ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-200'}`}>{date.getDate()}</h4>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {tasks.map(task => {
                      const sub = lookupSubjects.find(s => s.id === task.subjectId);
                      const { style, className } = sub ? getBadgeStyle(sub.color) : { style: {}, className: 'bg-zinc-400 text-white' };
                      return (
                        <div 
                          key={task.id} 
                          style={{ ...style, opacity: task.status === 'realizado' ? 0.4 : 1 }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleStatus) {
                              onToggleStatus(task.id);
                            } else {
                              const newStudies = scheduledStudies.map((s): ScheduledStudy => 
                                s.id === task.id ? { ...s, status: s.status === 'realizado' ? 'planejado' : 'realizado' } : s
                              );
                              onUpdateSchedule(newStudies);
                            }
                          }}
                          className={`p-4 rounded-2xl text-xs font-bold border border-white/10 ${className} cursor-pointer transition-all hover:scale-[1.02] active:scale-95`}
                        >
                          <span className="opacity-70 flex items-center gap-1">{getActivityIcon(task.activityType)} {task.activityType}</span>
                          <p className="truncate font-black">{sub ? sub.name : 'Disciplina Removida'}</p>
                          {task.topicId && sub && (
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
                const tasks = scheduledStudies.filter(s => (s.date && (s.date === key || s.date.split('T')[0] === key)));
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div key={day} onClick={() => handleDayClick(key)} className="p-1.5 border-r border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all flex flex-col min-h-0 overflow-hidden">
                    <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-zinc-900 dark:bg-zinc-700 text-white' : 'text-zinc-400'}`}>{day}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto">
                      {tasks.map(t => {
                        const sub = lookupSubjects.find(s => s.id === t.subjectId);
                        const { style, className } = sub ? getBadgeStyle(sub.color) : { style: {}, className: 'bg-zinc-400 text-white' };
                        return (
                          <div 
                            key={t.id} 
                            style={{ ...style, opacity: t.status === 'realizado' ? 0.4 : 1 }} 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleStatus) {
                                onToggleStatus(t.id);
                              } else {
                                const newStudies = scheduledStudies.map((s): ScheduledStudy => 
                                  s.id === t.id ? { ...s, status: s.status === 'realizado' ? 'planejado' : 'realizado' } : s
                                );
                                onUpdateSchedule(newStudies);
                              }
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10px] leading-tight font-bold line-clamp-2 ${className} cursor-pointer transition-all hover:scale-[1.02] active:scale-95`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate">{t.activityType === 'Simulado' ? '📋 ' : ''}{sub ? sub.name : 'Disciplina Removida'}</span>
                              {t.topicId && sub && (
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
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-zinc-900 dark:bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
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
                  <div key={task.id} className="p-4 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700 group relative">
                    <button onClick={() => handleDelete(task.id)} className="absolute top-2 right-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                    <p className="text-[8px] font-black uppercase text-zinc-900 dark:text-zinc-100 mb-1">{task.activityType}</p>
                    <h5 className="text-xs font-bold dark:text-white truncate">
                      {lookupSubjects.find(s => s.id === task.subjectId)?.name || <span className="text-rose-400 italic">Desconhecida</span>}
                    </h5>
                    {task.questionsDone !== undefined && (
                      <p className="text-[9px] text-zinc-400 mt-1 font-bold">{task.questionsCorrect}/{task.questionsDone} Questões</p>
                    )}
                  </div>
                ))}
                {tasksForSelectedDay.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-10 opacity-40">Vazio</p>}
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">Novo Registro</h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Tipo de Atividade</label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value as any })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white">
                    <option value="Leitura">Leitura</option>
                    <option value="Questões">Questões</option>
                    <option value="Aula">Aula</option>
                    <option value="Simulado">Simulado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Disciplina</label>
                  <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicId: '' })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white">
                    <option value="">Selecione...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {formData.subjectId && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Assunto</label>
                    <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white">
                      <option value="">Geral / Outros</option>
                      {subjects.find(s => s.id === formData.subjectId)?.topics.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Duração (min)</label>
                    <input type="number" placeholder="Duração" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl outline-none text-sm dark:text-white" />
                  </div>
                </div>

                {formData.activityType === 'Questões' && (
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

                <button onClick={handleSave} disabled={!formData.subjectId} className="w-full py-4 bg-zinc-900 dark:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg disabled:opacity-30 active:scale-95 transition-all mt-4">Salvar no Planner</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
