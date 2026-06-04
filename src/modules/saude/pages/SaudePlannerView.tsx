import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { HealthActivity, ActivityType, CardioLevel, MuscleGroup } from '../App';

interface HealthActivityType {
  name: string;
  color: string;
}

interface SaudePlannerViewProps {
  activities: HealthActivity[];
  activityTypes: HealthActivityType[];
  muscleGroups: MuscleGroup[];
  onAddActivity: (activity: HealthActivity) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateActivity?: (id: string, updates: Partial<HealthActivity>) => void;
}

const CARDIO_LEVELS: CardioLevel[] = ['Leve', 'Ritmado', 'Arrancada', 'Específico', 'Moderado', 'Longo'];

const hexToRgba = (hex: string, alpha: number) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SaudePlannerView: React.FC<SaudePlannerViewProps> = ({ 
  activities, 
  activityTypes,
  muscleGroups,
  onAddActivity, 
  onToggleStatus, 
  onDelete,
  onUpdateActivity 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<HealthActivity | null>(null);

  const [formType, setFormType] = useState<ActivityType>('');
  const [formTime, setFormTime] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formLevel, setFormLevel] = useState<CardioLevel>('Leve');
  const [formMuscles, setFormMuscles] = useState<MuscleGroup[]>([]);
  const [formStatus, setFormStatus] = useState<'realizado' | 'planejado'>('realizado');

  useEffect(() => {
    if (activityTypes.length > 0 && !formType) {
      setFormType(activityTypes[0].name);
    }
  }, [activityTypes, formType]);
  
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
    setEditingActivity(null);
    setFormType(activityTypes[0]?.name || 'Corrida');
    setFormTime('');
    setFormDistance('');
    setFormLevel('Leve');
    setFormMuscles([]);
    setFormStatus('realizado');
    setShowModal(true);
  };

  const handleActivityClick = (e: React.MouseEvent, act: HealthActivity) => {
    e.stopPropagation();
    setEditingActivity(act);
    setFormType(act.type);
    setFormTime(act.timeInMinutes?.toString() || '');
    setFormDistance(act.distanceKm?.toString() || '');
    setFormLevel(act.level || 'Leve');
    setFormMuscles(act.muscles || []);
    setFormStatus(act.status || 'realizado');
    setSelectedDayKey(act.date);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDayKey === null) return;
    const time = formTime ? (parseInt(formTime) || 0) : null;
    if (formStatus === 'realizado' && (!time || time <= 0)) {
      alert('Por favor, insira uma duração válida.');
      return;
    }

    const dist = formType !== 'Musculação' && formDistance ? (parseFloat(formDistance.replace(',', '.')) || 0) : null;
    if (formStatus === 'realizado' && formType !== 'Musculação' && (!dist || dist <= 0)) {
      alert('Por favor, insira uma distância válida.');
      return;
    }

    const level = formType !== 'Musculação' ? formLevel : null;
    const muscles = formType === 'Musculação' ? formMuscles : null;

    if (editingActivity) {
      if (onUpdateActivity) {
        onUpdateActivity(editingActivity.id, {
          type: formType,
          date: selectedDayKey,
          timeInMinutes: time,
          status: formStatus,
          distanceKm: dist,
          level: level,
          muscles: muscles
        });
      }
    } else {
      const newActivity: HealthActivity = {
        id: crypto.randomUUID(),
        type: formType,
        date: selectedDayKey,
        timeInMinutes: time,
        status: formStatus,
        distanceKm: dist,
        level: level,
        muscles: muscles
      };
      onAddActivity(newActivity);
    }

    setShowModal(false);
    setEditingActivity(null);
    setFormTime('');
    setFormDistance('');
    setFormLevel('Leve');
    setFormMuscles([]);
    setFormStatus('realizado');
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

  const getBadgeColorStyles = (type: string) => {
    const actType = activityTypes.find(t => t.name === type);
    const color = actType?.color || '#71717a';
    return {
      backgroundColor: hexToRgba(color, 0.15),
      color: color,
      borderColor: hexToRgba(color, 0.3)
    };
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
                      onClick={(e) => handleActivityClick(e, act)}
                      className={`text-[9px] font-bold px-1.5 py-1 rounded-lg border flex flex-col gap-0.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-95
                        ${act.status === 'planejado' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-dashed border-zinc-300 dark:border-zinc-700 opacity-65 hover:opacity-100' : ''}
                      `}
                      style={act.status === 'planejado' ? {} : getBadgeColorStyles(act.type)}
                      title="Clique para editar o treino"
                    >
                      <div className="flex items-center justify-between">
                        <span className="uppercase tracking-wider truncate">{act.type}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(act.id);
                          }}
                          className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                          title={act.status === 'planejado' ? "Marcar como realizado" : "Marcar como planejado"}
                        >
                          {act.status === 'planejado' ? <Clock size={10} className="shrink-0" /> : <CheckCircle2 size={10} className="shrink-0" />}
                        </button>
                      </div>
                      {act.timeInMinutes !== undefined && act.timeInMinutes > 0 && <span className="opacity-80 font-medium text-[9px]">{act.timeInMinutes} min</span>}
                      {act.distanceKm !== undefined && act.distanceKm > 0 && <span className="opacity-75 text-[8px]">{act.distanceKm} km</span>}
                      {act.type === 'Musculação' && act.muscles && act.muscles.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5 max-h-[22px] overflow-hidden">
                          {act.muscles.map(m => (
                            <span key={m} className="px-1 py-px bg-zinc-200/50 dark:bg-zinc-800/50 text-[7px] text-indigo-700 dark:text-indigo-300 rounded uppercase font-black tracking-wider shrink-0 truncate max-w-[45px]">{m}</span>
                          ))}
                        </div>
                      )}
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
            <div className="absolute top-6 right-6 flex items-center gap-2">
              {editingActivity && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Excluir este treino?')) {
                      onDelete(editingActivity.id);
                      setShowModal(false);
                      setEditingActivity(null);
                    }
                  }}
                  className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button 
                type="button" 
                onClick={() => { setShowModal(false); setEditingActivity(null); }} 
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl transition-all font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </span>
              {editingActivity ? 'Editar Treino' : 'Nova Atividade'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Atividade</label>
                <select value={formType} onChange={e => setFormType(e.target.value as ActivityType)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                  {activityTypes.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Duração (minutos)</label>
                  <input type="number" placeholder="Ex: 45" value={formTime} onChange={e => setFormTime(e.target.value)} required={formStatus === 'realizado'} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                    <option value="realizado">Realizado</option>
                    <option value="planejado">Planejado</option>
                  </select>
                </div>
              </div>

              {formType !== 'Musculação' ? (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Distância (km)</label>
                    <input type="number" step="0.01" placeholder="Ex: 5.5" value={formDistance} onChange={e => setFormDistance(e.target.value)} required={formStatus === 'realizado'} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Nível / Ritmo</label>
                    <select value={formLevel} onChange={e => setFormLevel(e.target.value as CardioLevel)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                      {CARDIO_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Grupos Musculares Trabalhados</label>
                  <div className="flex flex-wrap gap-2">
                    {muscleGroups.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-colors ${formMuscles.includes(m) ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setEditingActivity(null); }} 
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-cyan-500/20"
                >
                  {editingActivity ? 'Salvar Alterações' : 'Salvar'}
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
