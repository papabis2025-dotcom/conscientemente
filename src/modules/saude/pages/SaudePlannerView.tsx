import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { HealthActivity, ActivityType } from '../App';

interface SaudePlannerViewProps {
  activities: HealthActivity[];
  onAddActivity: (activity: HealthActivity) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

const SaudePlannerView: React.FC<SaudePlannerViewProps> = ({ activities, onAddActivity, onToggleStatus, onDelete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [formType, setFormType] = useState<ActivityType>('Corrida');
  const [formTime, setFormTime] = useState('');
  
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDayKey === null) return;
    const time = parseInt(formTime) || 30;

    const newActivity: HealthActivity = {
      id: crypto.randomUUID(),
      type: formType,
      date: selectedDayKey,
      timeInMinutes: time,
      status: 'realizado' // Defaults to done, as requested
    };

    onAddActivity(newActivity);
    setShowModal(false);
    setFormTime('');
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysCount = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const calendarDays = Array.from({ length: daysCount }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return {
      date,
      dayKey: getDayKey(date),
      day: i + 1,
    };
  });

  const getBadgeColor = (type: string) => {
    if (type === 'Corrida') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    if (type === 'Ciclismo') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
    if (type === 'Natação') return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
    if (type === 'Musculação') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30';
    return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300 border-zinc-200 dark:border-zinc-500/30';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"><ChevronLeft size={18} /></button>
          <h2 className="text-sm font-black uppercase tracking-widest min-w-[140px] text-center">{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <CheckCircle2 size={12} className="text-emerald-500" /> Realizado
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <Clock size={12} className="text-amber-500" /> Pendente
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-zinc-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1.5 auto-rows-[minmax(70px,1fr)]">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          
          {calendarDays.map(({ date, dayKey, day }) => {
            const dayActs = activities.filter(a => a.date === dayKey);
            const isToday = getDayKey(new Date()) === dayKey;
            
            return (
              <div 
                key={dayKey} 
                onClick={() => handleDayClick(dayKey)}
                className={`border rounded-xl p-1.5 transition-all cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-600 flex flex-col gap-1
                  ${isToday ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800 ring-1 ring-cyan-400/50' : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:shadow-md'}
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-black ${isToday ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-500 dark:text-zinc-400'}`}>{day}</span>
                </div>
                
                <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {dayActs.map(act => (
                    <div 
                      key={act.id} 
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(act.id); }}
                      className={`text-[9px] font-bold px-1.5 py-1 rounded-lg border flex flex-col gap-0.5 transition-all
                        ${act.status === 'planejado' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-dashed border-zinc-300 dark:border-zinc-700 opacity-60 hover:opacity-100' : getBadgeColor(act.type)}
                      `}
                      title="Clique para alternar o status"
                    >
                      <div className="flex items-center justify-between">
                        <span className="uppercase tracking-wider truncate">{act.type}</span>
                        {act.status === 'planejado' ? <Clock size={10} className="shrink-0" /> : <CheckCircle2 size={10} className="shrink-0" />}
                      </div>
                      {act.timeInMinutes > 0 && <span className="opacity-80 font-medium text-[9px]">{act.timeInMinutes} min</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 flex items-center justify-center"><CheckCircle2 size={16} /></span>
              Nova Atividade
            </h3>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Atividade</label>
                <select value={formType} onChange={e => setFormType(e.target.value as ActivityType)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                  <option value="Corrida">Corrida</option>
                  <option value="Ciclismo">Ciclismo</option>
                  <option value="Natação">Natação</option>
                  <option value="Musculação">Musculação</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Duração (minutos)</label>
                <input type="number" placeholder="Ex: 45" value={formTime} onChange={e => setFormTime(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-cyan-500/20">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaudePlannerView;
