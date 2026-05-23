import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Dumbbell, Footprints, HeartPulse, LayoutTemplate, Plus, Trash2, TrendingUp, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area } from 'recharts';
import SaudePlannerView from './pages/SaudePlannerView';
import { saudeApi } from './api';

export type ActivityType = 'Corrida' | 'Ciclismo' | 'Natação' | 'Musculação';
export type CardioLevel = 'Leve' | 'Ritmado' | 'Arrancada' | 'Específico' | 'Moderado' | 'Longo';
export type MuscleGroup = 'Peito' | 'Costa' | 'Ombro' | 'Bíceps' | 'Tríceps' | 'Perna/Anterior' | 'Perna/Posterior';

export interface HealthActivity {
  id: string;
  type: ActivityType;
  date: string;
  timeInMinutes: number;
  status?: 'realizado' | 'planejado';
  
  // Cardio
  distanceKm?: number;
  pace?: string;
  level?: CardioLevel;
  
  // Musculação
  muscles?: MuscleGroup[];
}

const MUSCLE_GROUPS: MuscleGroup[] = ['Peito', 'Costa', 'Ombro', 'Bíceps', 'Tríceps', 'Perna/Anterior', 'Perna/Posterior'];
const CARDIO_LEVELS: CardioLevel[] = ['Leve', 'Ritmado', 'Arrancada', 'Específico', 'Moderado', 'Longo'];

const SaudeApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'atividades' | 'planner'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_saude') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_saude', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [activities, setActivities] = useState<HealthActivity[]>([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await saudeApi.list();
        setActivities(data);
      } catch (err) {
        console.error('Failed to load health activities:', err);
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, []);

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('openAddSaudeModal') === 'true') {
      sessionStorage.removeItem('openAddSaudeModal');
      setActiveTab('atividades');
      setShowAddForm(true);
    }
  }, []);

  const [formType, setFormType] = useState<ActivityType>('Corrida');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formLevel, setFormLevel] = useState<CardioLevel>('Leve');
  const [formMuscles, setFormMuscles] = useState<MuscleGroup[]>([]);



  const calculatePace = (dist: number, timeMs: number, type: ActivityType) => {
    if (dist <= 0 || timeMs <= 0) return '-';
    if (type === 'Ciclismo') {
      const kmh = dist / (timeMs / 60);
      return `${kmh.toFixed(1)} km/h`;
    } else if (type === 'Natação') {
      // Pace in Natação usually min/100m. If distance is in km, distance * 10 = 100m segments
      const segments100m = dist * 10;
      const paceMin = timeMs / segments100m;
      const min = Math.floor(paceMin);
      const sec = Math.round((paceMin - min) * 60);
      return `${min}:${sec.toString().padStart(2, '0')}/100m`;
    } else {
      // Corrida min/km
      const paceMin = timeMs / dist;
      const min = Math.floor(paceMin);
      const sec = Math.round((paceMin - min) * 60);
      return `${min}:${sec.toString().padStart(2, '0')}/km`;
    }
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const time = parseInt(formTime) || 0;
    if (time <= 0) return;

    const newActivity: HealthActivity = {
      id: crypto.randomUUID(),
      type: formType,
      date: formDate,
      timeInMinutes: time,
      status: 'realizado'
    };

    if (formType === 'Musculação') {
      if (formMuscles.length === 0) return;
      newActivity.muscles = formMuscles;
    } else {
      const dist = parseFloat(formDistance.replace(',', '.')) || 0;
      if (dist <= 0) return;
      newActivity.distanceKm = dist;
      newActivity.level = formLevel;
      newActivity.pace = calculatePace(dist, time, formType);
    }

    saudeApi.create(newActivity).catch(err => console.error('Error creating saude activity:', err));
    setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setShowAddForm(false);
    
    // Reset form
    setFormTime('');
    setFormDistance('');
    setFormMuscles([]);
    setFormLevel('Leve');
  };

  const toggleMuscle = (m: MuscleGroup) => {
    setFormMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const deleteActivity = (id: string) => {
    if(confirm('Excluir este treino?')) {
      setActivities(prev => prev.filter(a => a.id !== id));
      saudeApi.delete(id).catch(err => console.error('Error deleting saude activity:', err));
    }
  };

  const toggleStatus = (id: string) => {
    setActivities(prev => prev.map(a => {
      if (a.id === id) {
        const newStatus = a.status === 'planejado' ? 'realizado' : 'planejado';
        saudeApi.update(id, { status: newStatus }).catch(err => console.error('Error updating status:', err));
        return { ...a, status: newStatus };
      }
      return a;
    }));
  };

  const handleUpdateActivity = (id: string, updates: Partial<HealthActivity>) => {
    const existing = activities.find(a => a.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updates };

    if (merged.type !== 'Musculação') {
      const dist = merged.distanceKm || 0;
      const time = merged.timeInMinutes || 0;
      if (dist > 0 && time > 0) {
        merged.pace = calculatePace(dist, time, merged.type);
      }
    }

    saudeApi.update(id, merged).catch(err => console.error('Error updating saude activity:', err));
    setActivities(prev => prev.map(a => a.id === id ? merged : a).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleAddPlannerActivity = (activity: HealthActivity) => {
    saudeApi.create(activity).catch(err => console.error('Error creating planner activity:', err));
    setActivities(prev => [activity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  // Dashboard calculations - Only Realized
  const realizedActivities = activities.filter(a => a.status !== 'planejado');
  
  const totalTreinos = realizedActivities.length;
  const horasTotais = realizedActivities.reduce((acc, a) => acc + a.timeInMinutes, 0) / 60;
  const kmTotais = realizedActivities.filter(a => a.type !== 'Musculação').reduce((acc, a) => acc + (a.distanceKm || 0), 0);

  const freqData = useMemo(() => {
    const counts: Record<string, number> = { 'Corrida': 0, 'Ciclismo': 0, 'Natação': 0, 'Musculação': 0 };
    realizedActivities.forEach(a => counts[a.type]++);
    return Object.entries(counts).filter(([_, c]) => c > 0).map(([name, count]) => ({
      name, count, fill: name === 'Musculação' ? '#6366f1' : name === 'Natação' ? '#0ea5e9' : name === 'Ciclismo' ? '#f59e0b' : '#10b981'
    }));
  }, [activities]);

  const cardioLevelData = useMemo(() => {
    const counts: Record<string, number> = {};
    CARDIO_LEVELS.forEach(l => {
      counts[l] = 0;
    });
    realizedActivities.forEach(a => {
      if (a.level) {
        counts[a.level] = (counts[a.level] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([_, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name, count
      }));
  }, [activities]);

  const todayDateObj = new Date();
  const currentYear = todayDateObj.getFullYear();
  const currentMonth = todayDateObj.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayActivities = realizedActivities.filter(a => a.date === dateStr);
    return { day, dateStr, activities: dayActivities };
  });

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-cyan-200 dark:selection:bg-cyan-900/50">
      
      {/* Sidebar Lateral */}
      <aside className={`relative ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl`}>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-5 flex-1 flex flex-col min-h-0">
          <div className={`flex items-center gap-3 text-cyan-500 mb-8 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <HeartPulse size={28} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Saúde
              </span>
            )}
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'dashboard' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              title={isSidebarCollapsed ? 'Dashboard' : ''}
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('atividades')} 
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'atividades' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              title={isSidebarCollapsed ? 'Atividades' : ''}
            >
              <div className="flex items-center gap-3">
                <Activity size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>Atividades</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'atividades' ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                  {activities.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('planner')} 
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'planner' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              title={isSidebarCollapsed ? 'Planner' : ''}
            >
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>Planner</span>}
              </div>
            </button>
          </nav>
        </div>

        <div className="p-5 mt-auto">
          <button 
            onClick={() => window.location.hash = ''} 
            className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'p-3' : 'gap-2 py-3 px-4'} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-sm uppercase tracking-wider`}
            title="Voltar ao Hub"
          >
            <LayoutTemplate size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
        <div className="max-w-[1440px] mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-500">
          
          <header className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 shrink-0">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                {activeTab === 'dashboard' ? 'Estatísticas de Saúde' : activeTab === 'planner' ? 'Planner de Treinos' : 'Histórico de Atividades'}
              </h1>
              <p className="text-zinc-500 font-medium mt-1 text-sm">Monitore seu progresso físico e bem-estar geral.</p>
            </div>
            {activeTab !== 'planner' && (
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-transform active:scale-95 shadow-lg shadow-cyan-500/20 flex items-center gap-2"
              >
                {showAddForm ? 'Cancelar' : <><Plus size={16} /> Novo Treino</>}
              </button>
            )}
          </header>

          {showAddForm && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-4">
              <form onSubmit={handleAddActivity} className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Atividade</label>
                    <select value={formType} onChange={e => setFormType(e.target.value as ActivityType)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="Corrida">Corrida</option>
                      <option value="Ciclismo">Ciclismo</option>
                      <option value="Natação">Natação</option>
                      <option value="Musculação">Musculação</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Data</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Duração (min)</label>
                    <input type="number" placeholder="Ex: 60" value={formTime} onChange={e => setFormTime(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                </div>

                {formType !== 'Musculação' ? (
                  <div className="flex gap-4 animate-in fade-in">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Distância (km)</label>
                      <input type="number" step="0.01" placeholder="Ex: 5.5" value={formDistance} onChange={e => setFormDistance(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Nível / Ritmo</label>
                      <select value={formLevel} onChange={e => setFormLevel(e.target.value as CardioLevel)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500">
                        {CARDIO_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-2">Grupos Musculares Trabalhados</label>
                    <div className="flex flex-wrap gap-2">
                      {MUSCLE_GROUPS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleMuscle(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${formMuscles.includes(m) ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 text-white rounded-xl py-3 font-bold uppercase tracking-widest text-xs transition-colors mt-2">
                  Salvar Treino
                </button>
              </form>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="bg-cyan-500 text-white p-6 rounded-2xl shadow-lg shadow-cyan-500/20">
                  <div className="flex items-center gap-3 mb-2 opacity-80"><Activity size={20} /><span className="text-xs font-black uppercase tracking-widest">Treinos Totais</span></div>
                  <h2 className="text-4xl font-black">{totalTreinos}</h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-zinc-500"><Dumbbell size={20} /><span className="text-xs font-black uppercase tracking-widest">Horas Dedicadas</span></div>
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white">{horasTotais.toFixed(1)} <span className="text-lg">h</span></h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-zinc-500"><Footprints size={20} /><span className="text-xs font-black uppercase tracking-widest">Distância Cardio</span></div>
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white">{kmTotais.toFixed(1)} <span className="text-lg">km</span></h2>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pb-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                  <h3 className="text-[11px] font-black uppercase tracking-tight text-zinc-500 mb-2">Distribuição de Atividades</h3>
                  {freqData.length > 0 ? (
                    <div className="flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
                      <div className="space-y-3.5 py-2">
                        {(() => {
                          const total = freqData.reduce((sum, item) => sum + item.count, 0) || 1;
                          return freqData.map((item) => {
                            const percentage = (item.count / total) * 100;
                            return (
                              <div key={item.name} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }}></span>
                                    <span className="truncate max-w-[120px]">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[10px]">{item.count} {item.count === 1 ? 'treino' : 'treinos'}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-[36px] text-center font-bold">
                                      {percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${percentage}%`, backgroundColor: item.fill }}
                                  ></div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-400 text-[10px] font-medium">Nenhum treino.</div>
                  )}
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                  <h3 className="text-[11px] font-black uppercase tracking-tight text-zinc-500 mb-2">Calendário Mensal</h3>
                  <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="text-center text-[9px] font-bold text-zinc-400 uppercase flex items-end justify-center pb-1">{d}</div>
                    ))}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-1"></div>
                    ))}
                    {calendarDays.map(({ day, activities }) => (
                      <div key={day} className={`border rounded-lg p-1 flex flex-col justify-between overflow-hidden ${activities.length > 0 ? 'bg-cyan-50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800' : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800'}`}>
                        <span className="text-[9px] font-bold text-zinc-500">{day}</span>
                        <div className="flex flex-wrap gap-0.5 mt-0.5 justify-end">
                          {activities.map((a, i) => (
                            <span key={i} className={`w-1.5 h-1.5 rounded-full ${a.type === 'Corrida' ? 'bg-emerald-400' : a.type === 'Musculação' ? 'bg-indigo-400' : a.type === 'Ciclismo' ? 'bg-amber-400' : 'bg-sky-400'}`} title={a.type}></span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                  <h3 className="text-[11px] font-black uppercase tracking-tight text-zinc-500 mb-2">Volume de Exercícios (Min/Dia)</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={calendarDays.map(d => ({ day: d.day, minutos: d.activities.reduce((acc, a) => acc + a.timeInMinutes, 0) }))} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMinutos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                        <Area type="monotone" dataKey="minutos" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                  <h3 className="text-[11px] font-black uppercase tracking-tight text-zinc-500 mb-2">Atividades por Nível / Ritmo</h3>
                  {cardioLevelData.length > 0 ? (
                    <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cardioLevelData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                          <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-400 text-[10px] font-medium">Nenhum treino com nível/ritmo registrado.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ATIVIDADES TAB */}
          {activeTab === 'atividades' && (
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {activities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Activity size={48} className="text-zinc-300 dark:text-zinc-700 mb-4" strokeWidth={1} />
                  <p className="text-zinc-500 font-medium">Nenhuma atividade registrada.</p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Tipo</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Duração</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Detalhes (Dist / Pace / Nível)</th>
                        <th className="px-6 py-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {activities.map(a => (
                        <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                            {new Date(`${a.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              a.type === 'Musculação' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' :
                              a.type === 'Corrida' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                              a.type === 'Ciclismo' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                              'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
                            }`}>
                              {a.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                            {a.timeInMinutes} min
                          </td>
                          <td className="px-6 py-4">
                            {a.type === 'Musculação' ? (
                              <div className="flex flex-wrap gap-1">
                                {a.muscles?.map(m => (
                                  <span key={m} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[9px] uppercase font-bold tracking-wider">{m}</span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {a.distanceKm && <span className="text-zinc-800 dark:text-zinc-200 font-bold">{a.distanceKm} km</span>}
                                {a.pace && <span>Pace: {a.pace}</span>}
                                {a.level && <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] uppercase tracking-wider">{a.level}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => deleteActivity(a.id)} className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'planner' && (
            <div className="flex-1 min-h-[500px]">
              <SaudePlannerView 
                activities={activities} 
                onAddActivity={handleAddPlannerActivity} 
                onToggleStatus={toggleStatus} 
                onDelete={deleteActivity} 
                onUpdateActivity={handleUpdateActivity}
              />
            </div>
          )}



        </div>
      </main>
    </div>
  );
};

export default SaudeApp;
