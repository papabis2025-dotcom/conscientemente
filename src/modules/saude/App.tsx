import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Dumbbell, Footprints, HeartPulse, LayoutTemplate, Plus, Trash2, TrendingUp, CalendarDays, ChevronLeft, ChevronRight, Settings, Eye, EyeOff, Maximize2, Menu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import SaudePlannerView from './pages/SaudePlannerView';
import { saudeApi } from './api';

export type ActivityType = string;
export type CardioLevel = 'Leve' | 'Ritmado' | 'Arrancada' | 'Específico' | 'Moderado' | 'Longo';
export type MuscleGroup = string;

export interface HealthActivity {
  id: string;
  type: ActivityType;
  date: string;
  timeInMinutes?: number | null;
  status?: 'realizado' | 'planejado';
  
  // Cardio
  distanceKm?: number | null;
  pace?: string | null;
  level?: CardioLevel | null;
  
  // Musculação
  muscles?: MuscleGroup[] | null;
}

const CARDIO_LEVELS: CardioLevel[] = ['Leve', 'Ritmado', 'Arrancada', 'Específico', 'Moderado', 'Longo'];

interface HealthActivityType {
  name: string;
  color: string;
}

interface SaudeWidgetState {
  id: string;
  title: string;
  isVisible: boolean;
  size: 'normal' | 'wide' | 'full';
}

const hexToRgba = (hex: string, alpha: number) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SaudeApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'atividades' | 'planner' | 'gerenciador'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_saude') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_saude', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [activityTypes, setActivityTypes] = useState<HealthActivityType[]>(() => {
    const saved = localStorage.getItem('cn_saude_activity_types');
    if (saved) return JSON.parse(saved);
    return [
      { name: 'Corrida', color: '#10b981' },
      { name: 'Ciclismo', color: '#f59e0b' },
      { name: 'Natação', color: '#0ea5e9' },
      { name: 'Musculação', color: '#6366f1' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('cn_saude_activity_types', JSON.stringify(activityTypes));
  }, [activityTypes]);

  const [muscleGroups, setMuscleGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('cn_saude_muscle_groups');
    if (saved) return JSON.parse(saved);
    return ['Peito', 'Costa', 'Ombro', 'Bíceps', 'Tríceps', 'Perna/Anterior', 'Perna/Posterior'];
  });

  useEffect(() => {
    localStorage.setItem('cn_saude_muscle_groups', JSON.stringify(muscleGroups));
  }, [muscleGroups]);

  const [widgets, setWidgets] = useState<SaudeWidgetState[]>(() => {
    const saved = localStorage.getItem('cn_saude_dashboard_layout');
    return saved ? JSON.parse(saved) : [
      { id: 'activities_distribution', title: 'Distribuição de Atividades', isVisible: true, size: 'normal' },
      { id: 'monthly_calendar', title: 'Calendário Mensal', isVisible: true, size: 'normal' },
      { id: 'exercise_volume', title: 'Volume de Exercícios (Min)', isVisible: true, size: 'normal' },
      { id: 'cardio_levels', title: 'Atividades por Nível / Ritmo', isVisible: true, size: 'normal' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('cn_saude_dashboard_layout', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const savedTypes = localStorage.getItem('cn_saude_activity_types');
        if (savedTypes) setActivityTypes(JSON.parse(savedTypes));
        
        const savedMuscles = localStorage.getItem('cn_saude_muscle_groups');
        if (savedMuscles) setMuscleGroups(JSON.parse(savedMuscles));
        
        const savedLayout = localStorage.getItem('cn_saude_dashboard_layout');
        if (savedLayout) setWidgets(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Error syncing saude storage:', e);
      }
    };
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [volumeChartPeriod, setVolumeChartPeriod] = useState<'semanal' | 'mensal'>('mensal');
  
  const [newActivityTypeName, setNewActivityTypeName] = useState('');
  const [newActivityTypeColor, setNewActivityTypeColor] = useState('#06b6d4');
  const [newMuscleName, setNewMuscleName] = useState('');

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
        const sizes: SaudeWidgetState['size'][] = ['normal', 'wide', 'full'];
        const nextIdx = (sizes.indexOf(w.size) + 1) % sizes.length;
        return { ...w, size: sizes[nextIdx] };
      }
      return w;
    }));
  };

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

  const [formType, setFormType] = useState<ActivityType>('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formLevel, setFormLevel] = useState<CardioLevel>('Leve');
  const [formMuscles, setFormMuscles] = useState<MuscleGroup[]>([]);
  const [formStatus, setFormStatus] = useState<'realizado' | 'planejado'>('realizado');

  useEffect(() => {
    if (activityTypes.length > 0 && !activityTypes.some(t => t.name === formType)) {
      setFormType(activityTypes[0].name);
    }
  }, [activityTypes, formType]);

  const calculatePace = (dist: number, timeMs: number, type: ActivityType) => {
    if (dist <= 0 || timeMs <= 0) return '-';
    if (type === 'Ciclismo') {
      const kmh = dist / (timeMs / 60);
      return `${kmh.toFixed(1)} km/h`;
    } else if (type === 'Natação') {
      const segments100m = dist * 10;
      const paceMin = timeMs / segments100m;
      const min = Math.floor(paceMin);
      const sec = Math.round((paceMin - min) * 60);
      return `${min}:${sec.toString().padStart(2, '0')}/100m`;
    } else {
      const paceMin = timeMs / dist;
      const min = Math.floor(paceMin);
      const sec = Math.round((paceMin - min) * 60);
      return `${min}:${sec.toString().padStart(2, '0')}/km`;
    }
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const time = formTime ? (parseInt(formTime) || 0) : null;
    if (formStatus === 'realizado' && (!time || time <= 0)) {
      alert('Por favor, insira uma duração válida.');
      return;
    }

    const newActivity: HealthActivity = {
      id: crypto.randomUUID(),
      type: formType,
      date: formDate,
      timeInMinutes: time,
      status: formStatus,
      distanceKm: null,
      level: null,
      muscles: null,
      pace: null
    };

    if (formType === 'Musculação') {
      if (formStatus === 'realizado' && formMuscles.length === 0) {
        alert('Por favor, selecione ao menos um grupo muscular.');
        return;
      }
      newActivity.muscles = formMuscles.length > 0 ? formMuscles : null;
    } else {
      const dist = formDistance ? (parseFloat(formDistance.replace(',', '.')) || 0) : null;
      if (formStatus === 'realizado' && (!dist || dist <= 0)) {
        alert('Por favor, insira uma distância válida.');
        return;
      }
      if (dist !== null && dist > 0) {
        newActivity.distanceKm = dist;
        newActivity.level = formLevel;
        if (time && time > 0) {
          newActivity.pace = calculatePace(dist, time, formType);
        }
      }
    }

    saudeApi.create(newActivity).catch(err => console.error('Error creating saude activity:', err));
    setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setShowAddForm(false);
    
    setFormTime('');
    setFormDistance('');
    setFormMuscles([]);
    setFormLevel('Leve');
    setFormStatus('realizado');
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

    if (merged.type === 'Musculação') {
      merged.distanceKm = null;
      merged.level = null;
      merged.pace = null;
    } else {
      merged.muscles = null;
      const dist = merged.distanceKm || 0;
      const time = merged.timeInMinutes || 0;
      if (dist > 0 && time > 0) {
        merged.pace = calculatePace(dist, time, merged.type);
      } else {
        merged.pace = null;
      }
    }

    saudeApi.update(id, merged).catch(err => console.error('Error updating saude activity:', err));
    setActivities(prev => prev.map(a => a.id === id ? merged : a).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleAddPlannerActivity = (activity: HealthActivity) => {
    saudeApi.create(activity).catch(err => console.error('Error creating planner activity:', err));
    setActivities(prev => [activity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const realizedActivities = activities.filter(a => a.status !== 'planejado');
  
  const totalTreinos = realizedActivities.length;
  const horasTotais = realizedActivities.reduce((acc, a) => acc + (a.timeInMinutes || 0), 0) / 60;
  const kmTotais = realizedActivities.filter(a => a.type !== 'Musculação').reduce((acc, a) => acc + (a.distanceKm || 0), 0);

  const freqData = useMemo(() => {
    const counts: Record<string, number> = {};
    activityTypes.forEach(t => {
      counts[t.name] = 0;
    });
    realizedActivities.forEach(a => {
      if (counts[a.type] !== undefined) {
        counts[a.type]++;
      } else {
        counts[a.type] = 1;
      }
    });
    return Object.entries(counts)
      .filter(([_, c]) => c > 0)
      .map(([name, count]) => {
        const typeColor = activityTypes.find(t => t.name === name)?.color || '#6b7280';
        return {
          name,
          count,
          fill: typeColor
        };
      });
  }, [activities, activityTypes]);

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

  const calendarDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayActivities = realizedActivities.filter(a => a.date === dateStr);
      return { day, dateStr, activities: dayActivities };
    });
  }, [realizedActivities, currentYear, currentMonth, daysInMonth]);

  const volumeChartData = useMemo(() => {
    if (volumeChartPeriod === 'semanal') {
      const data = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayActivities = realizedActivities.filter(a => a.date === dStr);
        const totalMin = dayActivities.reduce((acc, a) => acc + (a.timeInMinutes || 0), 0);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        data.push({ label, minutos: totalMin });
      }
      return data;
    } else {
      return calendarDays.map(d => ({
        label: String(d.day),
        minutos: d.activities.reduce((acc, a) => acc + (a.timeInMinutes || 0), 0)
      }));
    }
  }, [realizedActivities, volumeChartPeriod, calendarDays]);

  const handleAddActivityType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTypeName.trim()) return;
    
    const nameLower = newActivityTypeName.trim().toLowerCase();
    if (activityTypes.some(t => t.name.toLowerCase() === nameLower)) {
      alert('Esta atividade já existe.');
      return;
    }

    const newType: HealthActivityType = {
      name: newActivityTypeName.trim(),
      color: newActivityTypeColor
    };

    setActivityTypes(prev => [...prev, newType]);
    setNewActivityTypeName('');
    setNewActivityTypeColor('#06b6d4');
  };

  const handleDeleteActivityType = (name: string) => {
    if (confirm(`Tem certeza que deseja excluir a atividade "${name}"? Os treinos existentes com esse tipo continuarão salvos, mas não serão mapeados no gerenciador.`)) {
      setActivityTypes(prev => prev.filter(t => t.name !== name));
    }
  };

  const handleUpdateActivityTypeColor = (name: string, color: string) => {
    setActivityTypes(prev => prev.map(t => t.name === name ? { ...t, color } : t));
  };

  const handleAddMuscle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMuscleName.trim()) return;

    const nameLower = newMuscleName.trim().toLowerCase();
    if (muscleGroups.some(m => m.toLowerCase() === nameLower)) {
      alert('Este grupo muscular já existe.');
      return;
    }

    setMuscleGroups(prev => [...prev, newMuscleName.trim()]);
    setNewMuscleName('');
  };

  const handleDeleteMuscle = (name: string) => {
    if (confirm(`Tem certeza que deseja excluir o grupo muscular "${name}"?`)) {
      setMuscleGroups(prev => prev.filter(m => m !== name));
    }
  };

  const handleUpdateMuscle = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const nameLower = newName.trim().toLowerCase();
    if (muscleGroups.some(m => m.toLowerCase() === nameLower && m !== oldName)) {
      alert('Este grupo muscular já existe.');
      return;
    }
    setMuscleGroups(prev => prev.map(m => m === oldName ? newName.trim() : m));
  };

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'activities_distribution':
        return (
          <div className="h-full flex flex-col">
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
        );

      case 'monthly_calendar':
        return (
          <div className="h-full flex flex-col">
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
                    {activities.map((a, i) => {
                      const typeColor = activityTypes.find(t => t.name === a.type)?.color || '#6b7280';
                      return (
                        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor }} title={a.type}></span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'exercise_volume':
        return (
          <div className="h-full flex flex-col">
            <div className="flex justify-end mb-2 shrink-0">
              <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-800/50 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setVolumeChartPeriod('semanal')}
                  className={`py-0.5 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${volumeChartPeriod === 'semanal' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Semanal
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeChartPeriod('mensal')}
                  className={`py-0.5 px-2 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all ${volumeChartPeriod === 'mensal' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-100/50'}`}
                >
                  Mensal
                </button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              {volumeChartData.some(d => d.minutos > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeChartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMinutos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="minutos" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutos)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-medium">Nenhum volume registrado no período.</div>
              )}
            </div>
          </div>
        );

      case 'cardio_levels':
        return (
          <div className="h-full flex flex-col">
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-cyan-200 dark:selection:bg-cyan-900/50 relative">
      
      {/* Backdrop for mobile when sidebar is open */}
      {!isSidebarCollapsed && (
        <div 
          onClick={() => setIsSidebarCollapsed(true)}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" 
        />
      )}

      {/* Floating Menu Button on Mobile */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="md:hidden fixed bottom-6 left-6 z-40 w-10 h-10 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer animate-in zoom-in duration-200"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Sidebar Lateral */}
      <aside className={`fixed md:relative z-50 md:z-20 h-screen bg-white/95 dark:bg-zinc-900/95 md:bg-white/50 md:dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 backdrop-blur-xl shrink-0 ${isSidebarCollapsed ? 'w-64 md:w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'}`}>
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
                  {realizedActivities.length}
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
            <button 
              onClick={() => setActiveTab('gerenciador')} 
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl transition-all font-semibold ${activeTab === 'gerenciador' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              title={isSidebarCollapsed ? 'Gerenciador' : ''}
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>Gerenciador</span>}
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
                {activeTab === 'dashboard' ? 'Estatísticas de Saúde' : activeTab === 'planner' ? 'Planner de Treinos' : activeTab === 'gerenciador' ? 'Gerenciador de Atividades' : 'Histórico de Atividades'}
              </h1>
              <p className="text-zinc-500 font-medium mt-1 text-sm">
                {activeTab === 'gerenciador' ? 'Configure e gerencie suas atividades físicas e grupos musculares.' : 'Monitore seu progresso físico e bem-estar geral.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'dashboard' && (
                <button 
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)} 
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isEditMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`}
                >
                  {isEditMode ? 'Salvar Painel' : 'Ajustar Layout'}
                </button>
              )}
              {activeTab !== 'planner' && activeTab !== 'gerenciador' && (
                <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-transform active:scale-95 shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  {showAddForm ? 'Cancelar' : <><Plus size={16} /> Novo Treino</>}
                </button>
              )}
            </div>
          </header>

          {showAddForm && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-4">
              <form onSubmit={handleAddActivity} className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Atividade</label>
                    <select value={formType} onChange={e => { setFormType(e.target.value as ActivityType); setFormMuscles([]); setFormDistance(''); }} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500">
                      {activityTypes.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Data</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Duração (min)</label>
                    <input type="number" placeholder="Ex: 60" value={formTime} onChange={e => setFormTime(e.target.value)} required={formStatus === 'realizado'} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Status</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value as 'realizado' | 'planejado')} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="realizado">Realizado</option>
                      <option value="planejado">Planejado</option>
                    </select>
                  </div>
                </div>

                {formType !== 'Musculação' ? (
                  <div className="flex gap-4 animate-in fade-in">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Distância (km)</label>
                      <input type="number" step="0.01" placeholder="Ex: 5.5" value={formDistance} onChange={e => setFormDistance(e.target.value)} required={formStatus === 'realizado'} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500" />
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
                      {muscleGroups.map(m => (
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
            <div className="flex-1 flex flex-col gap-4 lg:h-[calc(100vh-170px)] lg:overflow-hidden">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="bg-cyan-500 text-white p-5 rounded-2xl shadow-lg shadow-cyan-500/20">
                  <div className="flex items-center gap-3 mb-1.5 opacity-80"><Activity size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Treinos Totais</span></div>
                  <h2 className="text-3xl font-black">{totalTreinos}</h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-1.5 text-zinc-500"><Dumbbell size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Horas Dedicadas</span></div>
                  <h2 className="text-3xl font-black text-zinc-900 dark:text-white">{horasTotais.toFixed(1)} <span className="text-sm">h</span></h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-1.5 text-zinc-500"><Footprints size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Distância Cardio</span></div>
                  <h2 className="text-3xl font-black text-zinc-900 dark:text-white">{kmTotais.toFixed(1)} <span className="text-sm">km</span></h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 lg:grid-rows-2 lg:overflow-hidden pb-4">
                {widgets.map((widget, index) => {
                  if (!widget.isVisible && !isEditMode) return null;
                  const sizeClass = widget.size === 'full' ? 'md:col-span-3' : widget.size === 'wide' ? 'md:col-span-2' : 'md:col-span-1';
                  
                  return (
                    <div
                      key={widget.id}
                      draggable={isEditMode}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`${sizeClass} lg:h-full h-[280px] ${widget.isVisible ? 'opacity-100' : 'opacity-40'} bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative group hover:shadow-md transition-all duration-300 flex flex-col ${isEditMode ? 'cursor-move ring-2 ring-emerald-500/20' : ''} ${draggedWidgetIndex === index ? 'opacity-50 scale-95' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-3 shrink-0">
                        <h4 className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-full">
                          {widget.title}
                        </h4>
                        {isEditMode && (
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => cycleSize(widget.id)} 
                              className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight text-zinc-500"
                            >
                              Tam: {widget.size}
                            </button>
                            <button 
                              type="button"
                              onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, isVisible: !w.isVisible } : w))} 
                              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-300"
                            >
                              {widget.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden">
                        {renderWidgetContent(widget.id)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ATIVIDADES TAB */}
          {activeTab === 'atividades' && (
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {realizedActivities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Activity size={48} className="text-zinc-300 dark:text-zinc-700 mb-4" strokeWidth={1} />
                  <p className="text-zinc-500 font-medium">Nenhuma atividade realizada registrada.</p>
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
                      {realizedActivities.map(a => (
                        <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                            {new Date(`${a.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const typeColor = activityTypes.find(t => t.name === a.type)?.color || '#6b7280';
                              return (
                                <span 
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                  style={{ 
                                    backgroundColor: hexToRgba(typeColor, 0.15), 
                                    color: typeColor 
                                  }}
                                >
                                  {a.type}
                                </span>
                              );
                            })()}
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

          {/* PLANNER TAB */}
          {activeTab === 'planner' && (
            <div className="flex-1 min-h-[500px]">
              <SaudePlannerView 
                activities={activities} 
                activityTypes={activityTypes}
                muscleGroups={muscleGroups}
                onAddActivity={handleAddPlannerActivity} 
                onToggleStatus={toggleStatus} 
                onDelete={deleteActivity} 
                onUpdateActivity={handleUpdateActivity}
              />
            </div>
          )}

          {/* GERENCIADOR TAB */}
          {activeTab === 'gerenciador' && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-y-auto pb-6">
              {/* Coluna 1: Gerenciar Atividades */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 mb-4">Adicionar Atividade</h2>
                  <form onSubmit={handleAddActivityType} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Nome da Atividade</label>
                      <input
                        type="text"
                        placeholder="Ex: Pilates, Crossfit"
                        value={newActivityTypeName}
                        onChange={(e) => setNewActivityTypeName(e.target.value)}
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Cor de Referência</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={newActivityTypeColor}
                          onChange={(e) => setNewActivityTypeColor(e.target.value)}
                          className="w-10 h-10 border-0 rounded-lg cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{newActivityTypeColor}</span>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl py-2.5 font-bold uppercase tracking-widest text-xs transition-colors shadow-lg shadow-cyan-500/20"
                    >
                      Adicionar Atividade
                    </button>
                  </form>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 mb-4">Atividades Cadastradas</h2>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {activityTypes.map(type => (
                      <div key={type.name} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700" 
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{type.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-[9px] font-bold uppercase text-zinc-400">Alterar Cor:</label>
                            <input
                              type="color"
                              value={type.color}
                              onChange={(e) => handleUpdateActivityTypeColor(type.name, e.target.value)}
                              className="w-6 h-6 border-0 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivityType(type.name)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                            title="Excluir Atividade"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {activityTypes.length === 0 && (
                      <p className="text-zinc-400 text-xs font-semibold py-4 text-center">Nenhuma atividade cadastrada.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna 2: Gerenciar Músculos */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 mb-4">Adicionar Grupo Muscular</h2>
                  <form onSubmit={handleAddMuscle} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Nome do Grupo Muscular</label>
                      <input
                        type="text"
                        placeholder="Ex: Panturrilha, Antebraço"
                        value={newMuscleName}
                        onChange={(e) => setNewMuscleName(e.target.value)}
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl py-2.5 font-bold uppercase tracking-widest text-xs transition-colors shadow-lg shadow-cyan-500/20"
                    >
                      Adicionar Músculo
                    </button>
                  </form>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 mb-4">Músculos Cadastrados</h2>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {muscleGroups.map(muscle => (
                      <div key={muscle} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 bg-cyan-500/10 flex items-center justify-center text-[10px] text-cyan-600 font-bold shrink-0">M</span>
                          <input
                            type="text"
                            defaultValue={muscle}
                            onBlur={(e) => handleUpdateMuscle(muscle, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-cyan-500 outline-none text-sm font-bold text-zinc-800 dark:text-zinc-200 transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMuscle(muscle)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                          title="Excluir Músculo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {muscleGroups.length === 0 && (
                      <p className="text-zinc-400 text-xs font-semibold py-4 text-center">Nenhum músculo cadastrado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default SaudeApp;
