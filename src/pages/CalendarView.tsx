
import React, { useState, useMemo } from 'react';
import { Subject, ScheduledStudy, Topic, ActivityType, StudySession } from '../types';

interface CalendarViewProps {
  subjects: Subject[];
  scheduledStudies: ScheduledStudy[];
  onUpdateSchedule: (studies: ScheduledStudy[]) => void;
  onAddSession?: (session: StudySession) => void;
}

type ViewMode = 'semanal' | 'mensal' | 'semestral' | 'anual';

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, scheduledStudies, onUpdateSchedule, onAddSession }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('mensal');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleNavigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'anual') newDate.setFullYear(currentDate.getFullYear() + direction);
    else if (viewMode === 'semestral') newDate.setMonth(currentDate.getMonth() + (direction * 6));
    else if (viewMode === 'mensal') newDate.setMonth(currentDate.getMonth() + direction);
    else if (viewMode === 'semanal') newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const getDayKey = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  };

  const handleDayClick = (dayKey: string) => {
    setSelectedDayKey(dayKey);
    setShowModal(true);
    setFormData({
      subjectId: '',
      topicId: '',
      activityType: 'Leitura',
      duration: '',
      questionsDone: '',
      questionsCorrect: '',
      notes: ''
    });
  };

  const handleSave = () => {
    if (!formData.subjectId || selectedDayKey === null) return;

    if (onAddSession) {
      onAddSession({
        id: `cal-${Date.now()}`,
        subjectId: formData.subjectId,
        topicId: formData.topicId || undefined,
        durationInMinutes: parseInt(formData.duration) || 0,
        date: new Date(`${selectedDayKey}T12:00:00`).toISOString(),
        questionsDone: formData.activityType === 'Questões' ? (parseInt(formData.questionsDone) || undefined) : undefined,
        questionsCorrect: formData.activityType === 'Questões' ? (parseInt(formData.questionsCorrect) || undefined) : undefined,
        activityType: formData.activityType // Explicitly pass the type
      });
    } else {
      const newEntry: ScheduledStudy = {
        id: Date.now().toString(),
        date: selectedDayKey,
        subjectId: formData.subjectId,
        topicId: formData.topicId || undefined,
        activityType: formData.activityType,
        notes: formData.notes,
        durationInMinutes: parseInt(formData.duration) || undefined,
        questionsDone: formData.activityType === 'Questões' ? (parseInt(formData.questionsDone) || undefined) : undefined,
        questionsCorrect: formData.activityType === 'Questões' ? (parseInt(formData.questionsCorrect) || undefined) : undefined
      };
      onUpdateSchedule([...scheduledStudies, newEntry]);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    onUpdateSchedule(scheduledStudies.filter(s => s.id !== id));
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
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 auto-rows-fr">
            {weekDays.map(date => {
              const key = getDayKey(date);
              const tasks = scheduledStudies.filter(s => s.date === key);
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div key={key} onClick={() => handleDayClick(key)} className={`bg-white dark:bg-slate-900 p-4 rounded-3xl border ${isToday ? 'border-blue-400 shadow-lg' : 'border-slate-100 dark:border-slate-800'} min-h-[350px] flex flex-col cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all`}>
                  <div className="mb-4">
                    <p className="text-[10px] font-black uppercase text-slate-400">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]}</p>
                    <h4 className={`text-2xl font-black ${isToday ? 'text-blue-600' : 'text-slate-700 dark:text-slate-200'}`}>{date.getDate()}</h4>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {tasks.map(task => {
                      const sub = subjects.find(s => s.id === task.subjectId);
                      return (
                        <div key={task.id} className={`p-3 rounded-2xl text-[10px] text-white font-bold border border-white/10 ${sub?.color || 'bg-slate-500'}`}>
                          <span className="opacity-70">{getActivityIcon(task.activityType)} {task.activityType}</span>
                          <p className="truncate font-black">{sub?.name}</p>
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
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[120px]">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/30 dark:bg-slate-950/20 border-r border-b border-slate-100 dark:border-slate-800/50" />
              ))}
              {Array.from({ length: numDays }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const key = getDayKey(date);
                const tasks = scheduledStudies.filter(s => s.date === key);
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div key={day} onClick={() => handleDayClick(key)} className="p-2 border-r border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all flex flex-col">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{day}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto">
                      {tasks.map(t => (
                        <div key={t.id} className={`px-1.5 py-0.5 rounded text-[8px] text-white font-bold truncate ${subjects.find(s => s.id === t.subjectId)?.color || 'bg-slate-500'}`}>
                          {t.activityType === 'Simulado' ? '📋 ' : ''}{subjects.find(s => s.id === t.subjectId)?.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      default: return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest opacity-30">Selecione uma visualização</div>;
    }
  };

  const getTitle = () => {
    if (viewMode === 'mensal') return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === 'semanal') return `Semana de ${weekDays[0].getDate()} a ${weekDays[6].getDate()} de ${monthNames[weekDays[6].getMonth()]}`;
    return "Planner";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Planner de Estudos 📅</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie sua rotina diária e acompanhe seu progresso.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex gap-1">
            {(['semanal', 'mensal'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => handleNavigate(-1)}>◀</button>
            <span className="font-black text-xs uppercase tracking-widest min-w-[150px] text-center">{getTitle()}</span>
            <button onClick={() => handleNavigate(1)}>▶</button>
          </div>
        </div>
      </header>

      <div className="min-h-[500px]">{renderView()}</div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col md:flex-row">
            <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-800/50 p-8 border-r border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[80vh]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">Logs do Dia</h4>
              <div className="space-y-3">
                {tasksForSelectedDay.map(task => (
                  <div key={task.id} className="p-4 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 group relative">
                    <button onClick={() => handleDelete(task.id)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                    <p className="text-[8px] font-black uppercase text-blue-600 mb-1">{task.activityType}</p>
                    <h5 className="text-xs font-bold dark:text-white truncate">{subjects.find(s => s.id === task.subjectId)?.name}</h5>
                    {task.questionsDone !== undefined && (
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">{task.questionsCorrect}/{task.questionsDone} Questões</p>
                    )}
                  </div>
                ))}
                {tasksForSelectedDay.length === 0 && <p className="text-xs text-slate-400 italic text-center py-10 opacity-40">Vazio</p>}
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">Novo Registro</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tipo de Atividade</label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value as any })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none text-sm dark:text-white">
                    <option value="Leitura">Leitura</option>
                    <option value="Questões">Questões</option>
                    <option value="Aula">Aula</option>
                    <option value="Simulado">Simulado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Disciplina</label>
                  <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicId: '' })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none text-sm dark:text-white">
                    <option value="">Selecione...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {formData.subjectId && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Assunto</label>
                    <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none text-sm dark:text-white">
                      <option value="">Geral / Outros</option>
                      {subjects.find(s => s.id === formData.subjectId)?.topics.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Duração (min)</label>
                    <input type="number" placeholder="Duração" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none text-sm dark:text-white" />
                  </div>
                </div>

                {formData.activityType === 'Questões' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Total Questões</label>
                      <input type="number" placeholder="Ex: 20" value={formData.questionsDone} onChange={(e) => setFormData({ ...formData, questionsDone: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none text-sm dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Acertos</label>
                      <input type="number" placeholder="Ex: 18" value={formData.questionsCorrect} onChange={(e) => setFormData({ ...formData, questionsCorrect: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none text-sm dark:text-white" />
                    </div>
                  </div>
                )}

                <button onClick={handleSave} disabled={!formData.subjectId} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg disabled:opacity-30 active:scale-95 transition-all mt-4">Salvar no Planner</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
