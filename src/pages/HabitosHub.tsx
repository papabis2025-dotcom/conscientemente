import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, Plus, Trash2, Check, ClipboardList, 
  BarChart3, Calendar, Award, TrendingUp, 
  ChevronLeft, ChevronRight, Moon, Sun, LayoutGrid, CheckCircle2,
  LayoutTemplate, Menu, CalendarDays, CalendarRange, Palette,
  X, Filter, Sparkles, CheckCheck
} from 'lucide-react';
import { api } from '../modules/estudos/services/api';

export interface Habit {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
}

export const HABIT_PALETTE = [
  { id: 'orange', name: 'Laranja', hex: '#f97316', bgClass: 'bg-orange-500' },
  { id: 'emerald', name: 'Esmeralda', hex: '#10b981', bgClass: 'bg-emerald-500' },
  { id: 'blue', name: 'Azul', hex: '#3b82f6', bgClass: 'bg-blue-500' },
  { id: 'violet', name: 'Violeta', hex: '#8b5cf6', bgClass: 'bg-violet-500' },
  { id: 'pink', name: 'Rosa', hex: '#ec4899', bgClass: 'bg-pink-500' },
  { id: 'amber', name: 'Âmbar', hex: '#f59e0b', bgClass: 'bg-amber-500' },
  { id: 'cyan', name: 'Ciano', hex: '#06b6d4', bgClass: 'bg-cyan-500' },
  { id: 'red', name: 'Coral', hex: '#ef4444', bgClass: 'bg-red-500' },
  { id: 'indigo', name: 'Índigo', hex: '#6366f1', bgClass: 'bg-indigo-500' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6', bgClass: 'bg-teal-500' },
];

interface HabitosHubProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  userName: string;
}

export default function HabitosHub({ onBack, theme, toggleTheme, userName }: HabitosHubProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Estado para recolhimento da barra lateral
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('isSidebarCollapsed_habitos') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed_habitos', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Recupera mapa de cores salvas
  const getStoredColors = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem('cn_habit_colors');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveStoredColors = (colors: Record<string, string>) => {
    try {
      localStorage.setItem('cn_habit_colors', JSON.stringify(colors));
    } catch (e) {
      console.error('Error saving habit colors map:', e);
    }
  };

  // State from localStorage
  const [habits, setHabits] = useState<Habit[]>(() => {
    const storedColors = getStoredColors();
    try {
      const saved = localStorage.getItem('cn_habits');
      if (saved) {
        const parsed: Habit[] = JSON.parse(saved);
        return parsed.map((h, i) => ({
          ...h,
          color: h.color || storedColors[h.id] || HABIT_PALETTE[i % HABIT_PALETTE.length].hex
        }));
      }
    } catch {}
    const defaultHabits: Habit[] = [
      { id: 'h1', name: 'Beber 2L de água', createdAt: Date.now(), color: '#06b6d4' },
      { id: 'h2', name: 'Estudar 1 hora', createdAt: Date.now(), color: '#3b82f6' },
      { id: 'h3', name: 'Treino físico', createdAt: Date.now(), color: '#f97316' },
      { id: 'h4', name: 'Ler 10 páginas', createdAt: Date.now(), color: '#10b981' }
    ];
    localStorage.setItem('cn_habits', JSON.stringify(defaultHabits));
    return defaultHabits;
  });

  const [habitHistory, setHabitHistory] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('cn_habit_history');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Tab state: 'painel' (Painel Diário) | 'mapa' (Mapa por Hábito - Anual)
  const [activeTab, setActiveTab] = useState<'painel' | 'mapa'>(() => {
    const savedTab = sessionStorage.getItem('habitosActiveTab');
    if (savedTab === 'painel' || savedTab === 'mapa') {
      return savedTab;
    }
    return 'painel';
  });

  useEffect(() => {
    sessionStorage.setItem('habitosActiveTab', activeTab);
  }, [activeTab]);

  // Filtro de status no Painel Diário: 'todos' | 'pendentes' | 'concluidos'
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'concluidos'>('todos');

  // Navegação do Mês no Painel Diário
  const [panelMonthDate, setPanelMonthDate] = useState<Date>(() => new Date());

  // Navegação do Ano no Mapa por Hábito (Apenas Anual)
  const [referenceYear, setReferenceYear] = useState<number>(() => new Date().getFullYear());

  // Modal de novo hábito
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedNewColor, setSelectedNewColor] = useState<string>(HABIT_PALETTE[0].hex);

  // Popover de seleção de cor para hábito existente
  const [colorPickerHabitId, setColorPickerHabitId] = useState<string | null>(null);

  // Keep time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => {
    return new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }, [currentTime]);

  // Sync state between tabs and other storage writers
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedHabits = localStorage.getItem('cn_habits');
        if (savedHabits) {
          const parsed = JSON.parse(savedHabits);
          setHabits(parsed);
        }
        const savedHistory = localStorage.getItem('cn_habit_history');
        if (savedHistory) {
          setHabitHistory(JSON.parse(savedHistory));
        }
      } catch (e) {
        console.error('Error syncing habit states:', e);
      }
    };

    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Fetch from Supabase on mount com Merge Inteligente
  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        const storedColors = getStoredColors();
        const cloudHabits = await api.habits.list();
        if (cloudHabits && cloudHabits.length > 0) {
          const localSavedRaw = localStorage.getItem('cn_habits');
          const localSaved: Habit[] = localSavedRaw ? JSON.parse(localSavedRaw) : [];
          const localColorMap = new Map(localSaved.map(h => [h.id, h.color]));

          const mappedHabits = cloudHabits.map((h, i) => ({
            id: h.id,
            name: h.name,
            color: h.color || localColorMap.get(h.id) || storedColors[h.id] || HABIT_PALETTE[i % HABIT_PALETTE.length].hex,
            createdAt: new Date(h.created_at).getTime()
          }));
          setHabits(mappedHabits);
          localStorage.setItem('cn_habits', JSON.stringify(mappedHabits));
        }

        const cloudLogs = await api.habits.getAllLogs();
        if (cloudLogs) {
          // Merge Inteligente: mantém logs locais recentes para não perder marcações da tela inicial
          const localHistoryRaw = localStorage.getItem('cn_habit_history');
          const localHistory: Record<string, string[]> = localHistoryRaw ? JSON.parse(localHistoryRaw) : {};
          const mergedHistory: Record<string, string[]> = { ...localHistory };

          // Adiciona logs remotos
          cloudLogs.forEach(log => {
            if (!mergedHistory[log.logged_date]) {
              mergedHistory[log.logged_date] = [];
            }
            if (!mergedHistory[log.logged_date].includes(log.habit_id)) {
              mergedHistory[log.logged_date].push(log.habit_id);
            }
          });

          // Sincroniza em background com o Supabase os logs que existiam localmente mas não estavam no banco
          const cloudLogSet = new Set(cloudLogs.map(l => `${l.logged_date}:${l.habit_id}`));
          Object.entries(localHistory).forEach(([dateStr, ids]) => {
            ids.forEach(habitId => {
              if (!cloudLogSet.has(`${dateStr}:${habitId}`)) {
                api.habits.toggleLog(habitId, dateStr, true).catch(() => {});
              }
            });
          });

          setHabitHistory(mergedHistory);
          localStorage.setItem('cn_habit_history', JSON.stringify(mergedHistory));
        }
      } catch (err) {
        console.error('Error loading habits from cloud:', err);
      }
    };
    loadFromCloud();
  }, []);

  // Dispatch sync event helper
  const triggerSyncEvent = () => {
    window.dispatchEvent(new Event('local-storage-sync'));
    window.dispatchEvent(new Event('storage'));
  };

  // Mutators
  const toggleHabit = (habitId: string, dateStr: string = todayStr) => {
    let willBeCompleted = false;
    setHabitHistory(prev => {
      const dayLogs = prev[dateStr] || [];
      let newDayLogs: string[];
      if (dayLogs.includes(habitId)) {
        newDayLogs = dayLogs.filter(id => id !== habitId);
        willBeCompleted = false;
      } else {
        newDayLogs = [...dayLogs, habitId];
        willBeCompleted = true;
      }
      const updated = { ...prev, [dateStr]: newDayLogs };
      localStorage.setItem('cn_habit_history', JSON.stringify(updated));
      return updated;
    });
    
    // Sync to cloud
    api.habits.toggleLog(habitId, dateStr, willBeCompleted).catch(err => {
      console.error('Error toggling habit log in cloud:', err);
    });

    setTimeout(triggerSyncEvent, 50);
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const trimmed = newHabitName.trim();
    const habitColor = selectedNewColor || HABIT_PALETTE[habits.length % HABIT_PALETTE.length].hex;
    setNewHabitName('');
    setIsAddModalOpen(false);

    try {
      const cloudHabit = await api.habits.upsert({ name: trimmed });
      const newId = cloudHabit?.id || `habit_${Date.now()}`;
      const newHabit: Habit = {
        id: newId,
        name: trimmed,
        color: habitColor,
        createdAt: cloudHabit?.created_at ? new Date(cloudHabit.created_at).getTime() : Date.now()
      };

      setHabits(prev => {
        const updated = [...prev, newHabit];
        localStorage.setItem('cn_habits', JSON.stringify(updated));
        return updated;
      });

      // Salva cor no mapa persistente
      const currentColors = getStoredColors();
      currentColors[newId] = habitColor;
      saveStoredColors(currentColors);

      setTimeout(triggerSyncEvent, 50);
    } catch (err) {
      console.error('Error adding habit to cloud:', err);
    }
  };

  const updateHabitColor = (habitId: string, newColor: string) => {
    setHabits(prev => {
      const updated = prev.map(h => h.id === habitId ? { ...h, color: newColor } : h);
      localStorage.setItem('cn_habits', JSON.stringify(updated));
      return updated;
    });

    const currentColors = getStoredColors();
    currentColors[habitId] = newColor;
    saveStoredColors(currentColors);

    setColorPickerHabitId(null);
    setTimeout(triggerSyncEvent, 50);
  };

  const deleteHabit = (habitId: string) => {
    setHabits(prev => {
      const updated = prev.filter(h => h.id !== habitId);
      localStorage.setItem('cn_habits', JSON.stringify(updated));
      return updated;
    });

    setHabitHistory(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(id => id !== habitId);
      });
      localStorage.setItem('cn_habit_history', JSON.stringify(updated));
      return updated;
    });

    // Handle cn_deleted_habit_ids
    try {
      const deletedRaw = localStorage.getItem('cn_deleted_habit_ids') || '[]';
      const deletedIds = JSON.parse(deletedRaw);
      if (Array.isArray(deletedIds) && !deletedIds.includes(habitId)) {
        deletedIds.push(habitId);
        localStorage.setItem('cn_deleted_habit_ids', JSON.stringify(deletedIds));
      }
    } catch {
      localStorage.setItem('cn_deleted_habit_ids', JSON.stringify([habitId]));
    }

    api.habits.delete(habitId).catch(err => console.error('Error deleting habit in cloud:', err));
    setTimeout(triggerSyncEvent, 50);
  };

  // Cálculos de Sequência (Streak) individual por hábito
  const getHabitStreak = (habitId: string) => {
    let streak = 0;
    const tempDate = new Date(currentTime);
    for (let i = 0; i < 60; i++) {
      const dStr = new Date(tempDate.getTime() - tempDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const isDone = (habitHistory[dStr] || []).includes(habitId);
      if (isDone) {
        streak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        if (i === 0) {
          // Se hoje ainda não foi feito, olha ontem antes de quebrar
          tempDate.setDate(tempDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  // Sequência Geral
  let overallStreak = 0;
  const tempDateOverall = new Date(currentTime);
  for (let i = 0; i < 60; i++) {
    const dStr = new Date(tempDateOverall.getTime() - tempDateOverall.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const completedCount = (habitHistory[dStr] || []).filter(id => habits.some(h => h.id === id)).length;
    if (completedCount > 0) {
      overallStreak++;
      tempDateOverall.setDate(tempDateOverall.getDate() - 1);
    } else {
      if (i === 0) {
        tempDateOverall.setDate(tempDateOverall.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // Últimos 7 dias para minigrids e cards
  const getPast7DaysList = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentTime.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      list.push({
        dateStr: dStr,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        dayNum: date.getDate(),
        isToday: dStr === todayStr
      });
    }
    return list;
  };
  const past7Days = getPast7DaysList();

  // Total de hábitos cadastrados
  const totalHabitsCount = habits.length;

  // Consistência 7 dias
  let last7DaysCompletions = 0;
  const last7DaysTotalPossible = past7Days.length * totalHabitsCount;
  past7Days.forEach(day => {
    const completedOnDay = habitHistory[day.dateStr] || [];
    const activeCompleted = completedOnDay.filter(id => habits.some(h => h.id === id)).length;
    last7DaysCompletions += activeCompleted;
  });
  const last7DaysRate = last7DaysTotalPossible > 0 ? Math.round((last7DaysCompletions / last7DaysTotalPossible) * 100) : 0;

  const totalCompletions = Object.values(habitHistory).reduce((acc, list) => {
    return acc + list.filter(id => habits.some(h => h.id === id)).length;
  }, 0);

  // Helpers para o Painel Diário (Visualização Mensal dos Hábitos)
  const getMonthDates = (refDate: Date) => {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Preenche padding para iniciar no domingo
    const startPadding = firstDay.getDay(); // 0 = Domingo
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      days.push({
        dateObj: d,
        dateStr: dStr,
        dayNum: day,
        isToday: dStr === todayStr
      });
    }
    return days;
  };

  // Helpers para a Guia Mapa por Hábito (Apenas Anual)
  const getYearMonths = (year: number) => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const date = new Date(year, m, 1);
      const daysInM = new Date(year, m + 1, 0).getDate();
      const monthDays = [];
      for (let d = 1; d <= daysInM; d++) {
        const curDate = new Date(year, m, d);
        const dStr = new Date(curDate.getTime() - curDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        monthDays.push(dStr);
      }
      months.push({
        monthIndex: m,
        monthName: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        fullName: date.toLocaleDateString('pt-BR', { month: 'long' }),
        daysInMonth: daysInM,
        days: monthDays
      });
    }
    return months;
  };

  const monthData = useMemo(() => getMonthDates(panelMonthDate), [panelMonthDate, todayStr]);
  const yearData = useMemo(() => getYearMonths(referenceYear), [referenceYear]);

  // Navegação de Mês no Painel Diário
  const handlePrevMonth = () => {
    setPanelMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setPanelMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleCurrentMonth = () => {
    setPanelMonthDate(new Date());
  };

  // Navegação de Ano no Mapa Anual por Hábito
  const handlePrevYear = () => setReferenceYear(prev => prev - 1);
  const handleNextYear = () => setReferenceYear(prev => prev + 1);
  const handleCurrentYear = () => setReferenceYear(new Date().getFullYear());

  // Métricas de conclusão de hoje
  const completedTodayCount = habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length;
  const progressPercentToday = totalHabitsCount > 0 ? Math.round((completedTodayCount / totalHabitsCount) * 100) : 0;
  const pendingCount = habits.length - completedTodayCount;

  // Filtragem de hábitos no Painel Diário
  const filteredHabits = useMemo(() => {
    return habits.filter(h => {
      const isCompletedToday = (habitHistory[todayStr] || []).includes(h.id);
      if (filterStatus === 'pendentes') return !isCompletedToday;
      if (filterStatus === 'concluidos') return isCompletedToday;
      return true;
    });
  }, [habits, habitHistory, todayStr, filterStatus]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent text-zinc-800 dark:text-zinc-100 transition-colors duration-300">
      
      {/* Backdrop para mobile */}
      {!isSidebarCollapsed && (
        <div 
          onClick={() => setIsSidebarCollapsed(true)}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" 
        />
      )}

      {/* Botão flutuante para mobile */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="md:hidden fixed bottom-6 left-6 z-40 w-10 h-10 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer animate-in zoom-in duration-200"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Sidebar Lateral */}
      <aside className={`fixed md:relative z-50 md:z-20 h-screen bg-white/95 dark:bg-zinc-900/95 md:bg-white/50 md:dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-5 transition-all duration-300 backdrop-blur-xl shrink-0 ${isSidebarCollapsed ? 'w-64 md:w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'}`}>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform cursor-pointer"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className={`mb-7 px-1 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex items-center gap-3 text-orange-500">
            <Flame size={28} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Hábitos
              </span>
            )}
          </div>
        </div>

        {/* Card de Progresso Hoje na Sidebar */}
        <div className="mb-5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-750">
          {!isSidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span>Hoje</span>
                <span className="text-orange-500 font-extrabold">{progressPercentToday}%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black text-zinc-700 dark:text-zinc-300">
                <span>Concluídos</span>
                <span>{completedTodayCount}/{totalHabitsCount}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentToday}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Flame size={16} className="text-orange-500" />
              <span className="text-[9px] font-black text-zinc-500">{progressPercentToday}%</span>
            </div>
          )}
        </div>

        {/* Navegação por Abas */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {/* Aba 1: Painel Diário */}
          <button 
            onClick={() => setActiveTab('painel')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3.5'} py-2.5 rounded-xl transition-all font-semibold ${
              activeTab === 'painel' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 font-medium'
            }`}
            title={isSidebarCollapsed ? 'Painel Diário' : ''}
          >
            <Calendar size={18} />
            {!isSidebarCollapsed && <span className="text-sm">Painel Diário</span>}
          </button>

          {/* Aba 2: Mapa por Hábito */}
          <button 
            onClick={() => setActiveTab('mapa')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3.5'} py-2.5 rounded-xl transition-all font-semibold ${
              activeTab === 'mapa' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 font-medium'
            }`}
            title={isSidebarCollapsed ? 'Mapa por Hábito' : ''}
          >
            <LayoutGrid size={18} />
            {!isSidebarCollapsed && <span className="text-sm">Mapa por Hábito</span>}
          </button>
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <button 
            onClick={toggleTheme}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3.5'} py-2.5 rounded-xl transition-all text-zinc-550 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-white font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!isSidebarCollapsed && <span className="text-sm">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          
          <button 
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 py-3 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-[11px] uppercase tracking-wider"
            title="Voltar ao Hub"
          >
            <LayoutTemplate size={17} className={isSidebarCollapsed ? '' : 'shrink-0'} />
            {!isSidebarCollapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">

            {/* Top Stats Cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Consistência 7 dias */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Consistência</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{last7DaysRate}%</p>
                    <p className="text-[9.5px] font-semibold text-zinc-400">Últimos 7 dias</p>
                  </div>
                </div>
              </div>

              {/* Sequência Ativa */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                    <Flame size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sequência</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{overallStreak} {overallStreak === 1 ? 'dia' : 'dias'}</p>
                    <p className="text-[9.5px] font-semibold text-zinc-400">Recorde ativo</p>
                  </div>
                </div>
              </div>

              {/* Total de Hábitos */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hábitos</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{totalHabitsCount}</p>
                    <p className="text-[9.5px] font-semibold text-zinc-400">Ativos na rotina</p>
                  </div>
                </div>
              </div>

              {/* Total Histórico */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Conclusões</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{totalCompletions}</p>
                    <p className="text-[9.5px] font-semibold text-zinc-400">Total histórico</p>
                  </div>
                </div>
              </div>
            </section>

            {/* CONTEÚDO DA ABA SELECIONADA */}

            {/* ABA 1: PAINEL DIÁRIO (VISUALIZAÇÃO MENSAL DOS HÁBITOS) */}
            {activeTab === 'painel' && (
              <section className="flex flex-col gap-5 animate-in fade-in duration-300">
                
                {/* Header do Mês & Controles */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Navegação do Mês */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        title="Mês anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <button
                        onClick={handleCurrentMonth}
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          panelMonthDate.getMonth() === currentTime.getMonth() && panelMonthDate.getFullYear() === currentTime.getFullYear()
                            ? 'bg-orange-500 text-white shadow-xs' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Mês Atual
                      </button>

                      <button
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        title="Próximo mês"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <h2 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white capitalize">
                      {panelMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                  </div>

                  {/* Resumo do Progresso de Hoje & Botão Novo Hábito */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {/* Barra de Progresso Sofisticada de Hoje */}
                    <div className="flex flex-col gap-1 min-w-[170px]">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                        <span className="text-zinc-400">Hoje</span>
                        <span className="text-orange-500 font-extrabold">{progressPercentToday}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden p-[1px]">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercentToday}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {completedTodayCount} de {totalHabitsCount} concluídos hoje
                      </span>
                    </div>

                    {/* Botão para criar novo hábito */}
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 hover:scale-102 active:scale-98 transition-all shrink-0 cursor-pointer"
                    >
                      <Plus size={16} strokeWidth={3} />
                      <span>Novo Hábito</span>
                    </button>
                  </div>
                </div>

                {/* Barra de Filtros Rápidos */}
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-zinc-400 mr-1" />
                    <button
                      onClick={() => setFilterStatus('todos')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        filterStatus === 'todos'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      Todos ({totalHabitsCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('pendentes')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        filterStatus === 'pendentes'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      Pendentes Hoje ({pendingCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('concluidos')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        filterStatus === 'concluidos'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      Concluídos Hoje ({completedTodayCount})
                    </button>
                  </div>

                  {progressPercentToday === 100 && totalHabitsCount > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                      <Sparkles size={14} />
                      <span>Todos os hábitos cumpridos hoje! Parabéns!</span>
                    </div>
                  )}
                </div>

                {/* Grid de Cards de Hábitos - Visualização Mensal */}
                {filteredHabits.length === 0 ? (
                  <div className="py-14 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center gap-3">
                    <ClipboardList size={36} className="text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                      Nenhum hábito encontrado para o filtro selecionado.
                    </p>
                    {totalHabitsCount === 0 && (
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-2 text-xs font-black text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        + Cadastrar meu primeiro hábito
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredHabits.map(h => {
                      const isTodayDone = (habitHistory[todayStr] || []).includes(h.id);
                      const habitColor = h.color || '#f97316';
                      const streak = getHabitStreak(h.id);

                      // Estatísticas do mês exibido
                      const validDaysInMonth = monthData.filter(Boolean) as { dateStr: string; dayNum: number; isToday: boolean }[];
                      const doneInMonth = validDaysInMonth.filter(d => (habitHistory[d.dateStr] || []).includes(h.id)).length;
                      const monthTotalDays = validDaysInMonth.length;
                      const monthRate = monthTotalDays > 0 ? Math.round((doneInMonth / monthTotalDays) * 100) : 0;

                      return (
                        <div
                          key={h.id}
                          className={`group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between p-5 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                            isTodayDone 
                              ? 'border-zinc-200/90 dark:border-zinc-800/80 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950/60'
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          {/* Faixa lateral indicadora da cor */}
                          <div 
                            className="absolute top-0 left-0 w-2 h-full transition-all"
                            style={{ backgroundColor: habitColor }}
                          />

                          {/* Topo do Card: Nome, Sequência, Mês e Menu de Ações */}
                          <div className="flex items-start justify-between gap-3 pl-1.5">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                                  style={{ backgroundColor: habitColor }} 
                                />
                                <h3 className="text-base font-black truncate text-zinc-900 dark:text-white">
                                  {h.name}
                                </h3>
                              </div>

                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                                  <Flame size={13} style={{ color: habitColor }} />
                                  <strong className="text-zinc-700 dark:text-zinc-300">{streak}</strong> {streak === 1 ? 'dia seguido' : 'dias seguidos'}
                                </span>
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                                  • <strong className="text-zinc-700 dark:text-zinc-300">{doneInMonth}</strong>/{monthTotalDays} no mês ({monthRate}%)
                                </span>
                              </div>
                            </div>

                            {/* Botões de Ações: Trocar Cor / Excluir */}
                            <div className="flex items-center gap-1 shrink-0 relative">
                              {/* Botão de Paleta de Cor */}
                              <button
                                onClick={() => setColorPickerHabitId(colorPickerHabitId === h.id ? null : h.id)}
                                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Alterar cor do hábito"
                              >
                                <Palette size={15} />
                              </button>

                              {/* Popover Seletor de Cores */}
                              {colorPickerHabitId === h.id && (
                                <div className="absolute right-0 top-10 z-30 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 shadow-xl flex flex-col gap-2 animate-in zoom-in-95 duration-150 w-48">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Escolha a cor</span>
                                  <div className="grid grid-cols-5 gap-1.5">
                                    {HABIT_PALETTE.map(c => (
                                      <button
                                        key={c.id}
                                        onClick={() => updateHabitColor(h.id, c.hex)}
                                        style={{ backgroundColor: c.hex }}
                                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-115 flex items-center justify-center cursor-pointer shadow-xs ${
                                          habitColor === c.hex ? 'ring-2 ring-zinc-900 dark:ring-white ring-offset-2 dark:ring-offset-zinc-800' : ''
                                        }`}
                                        title={c.name}
                                      >
                                        {habitColor === c.hex && <Check size={12} className="text-white" strokeWidth={3} />}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Botão Excluir */}
                              <button
                                onClick={() => deleteHabit(h.id)}
                                className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="Excluir hábito"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Visualização Mensal dos Hábitos (Calendário Completo do Mês) */}
                          <div className="my-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 pl-1.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                Visão Mensal ({panelMonthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/{panelMonthDate.getFullYear()})
                              </span>
                              <div className="flex items-center gap-2 text-[9.5px] font-semibold text-zinc-400 dark:text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-xs border border-orange-500" /> Hoje
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: habitColor }} /> Feito
                                </span>
                              </div>
                            </div>

                            {/* Cabeçalho dos dias da semana */}
                            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              <span>Dom</span>
                              <span>Seg</span>
                              <span>Ter</span>
                              <span>Qua</span>
                              <span>Qui</span>
                              <span>Sex</span>
                              <span>Sáb</span>
                            </div>

                            {/* Grade dos dias do mês */}
                            <div className="grid grid-cols-7 gap-1">
                              {monthData.map((day, idx) => {
                                if (!day) {
                                  return <div key={`empty_${idx}`} className="aspect-square" />;
                                }
                                const isDone = (habitHistory[day.dateStr] || []).includes(h.id);
                                return (
                                  <button
                                    key={day.dateStr}
                                    type="button"
                                    onClick={() => toggleHabit(h.id, day.dateStr)}
                                    title={`${day.dateStr} — ${isDone ? 'Concluído (clique para desmarcar)' : 'Pendente (clique para marcar)'}`}
                                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-0.5 text-xs font-black transition-all hover:scale-110 active:scale-95 cursor-pointer relative ${
                                      isDone
                                        ? 'text-white shadow-xs'
                                        : day.isToday
                                          ? 'border-orange-500 dark:border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 text-orange-600 dark:text-orange-300 font-extrabold ring-1 ring-orange-500/50'
                                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'
                                    }`}
                                    style={isDone ? { backgroundColor: habitColor, borderColor: habitColor } : {}}
                                  >
                                    <span className="text-[10px] leading-none">{day.dayNum}</span>
                                    {isDone && <Check size={10} strokeWidth={3.5} className="mt-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Botão de Conclusão / Toggle de Hoje */}
                          <div className="pt-1.5 pl-1.5">
                            <button
                              type="button"
                              onClick={() => toggleHabit(h.id, todayStr)}
                              style={isTodayDone ? { 
                                backgroundColor: habitColor, 
                                borderColor: habitColor,
                                boxShadow: `0 4px 14px ${habitColor}35`
                              } : {}}
                              className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
                                isTodayDone
                                  ? 'text-white scale-100 hover:brightness-105 active:scale-98'
                                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 active:scale-98'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                isTodayDone ? 'bg-white/25 text-white' : 'border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                              }`}>
                                {isTodayDone ? (
                                  <Check size={11} strokeWidth={3.5} className="animate-in zoom-in-50 duration-150" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: habitColor }} />
                                )}
                              </div>
                              <span>{isTodayDone ? 'Concluído Hoje' : 'Marcar como Concluído Hoje'}</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ABA 2: MAPA POR HÁBITO (APENAS ANUAL) */}
            {activeTab === 'mapa' && (
              <section className="flex flex-col gap-6 animate-in fade-in duration-300">
                
                {/* Cabeçalho do Mapa Anual */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base md:text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <LayoutGrid size={20} className="text-orange-500" />
                      Mapa de Consistência Anual
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">
                      Acompanhe o mapa de consistência mês a mês de cada um dos seus hábitos ao longo do ano.
                    </p>
                  </div>

                  {/* Navegação do Ano */}
                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-2xl">
                    <button
                      onClick={handlePrevYear}
                      className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Ano anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="text-sm font-black px-2 text-zinc-800 dark:text-zinc-100">
                      {referenceYear}
                    </span>

                    {referenceYear !== currentTime.getFullYear() && (
                      <button
                        onClick={handleCurrentYear}
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        Ano Atual
                      </button>
                    )}

                    <button
                      onClick={handleNextYear}
                      className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Próximo ano"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Lista de Mapas Anuais por Hábito */}
                {habits.length === 0 ? (
                  <div className="py-14 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center gap-3">
                    <CalendarRange size={36} className="text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                      Nenhum hábito cadastrado para exibir o mapa.
                    </p>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-2 text-xs font-black text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      + Cadastrar novo hábito
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {habits.map(h => {
                      const habitColor = h.color || '#f97316';
                      const streak = getHabitStreak(h.id);

                      // Estatísticas anuais
                      const allDays = yearData.flatMap(m => m.days);
                      const periodTotal = allDays.length;
                      const periodCompleted = allDays.filter(dStr => (habitHistory[dStr] || []).includes(h.id)).length;
                      const periodRate = periodTotal > 0 ? Math.round((periodCompleted / periodTotal) * 100) : 0;

                      return (
                        <div
                          key={h.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs flex flex-col gap-4 relative overflow-hidden"
                        >
                          {/* Faixa superior com a cor do hábito */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-1.5"
                            style={{ backgroundColor: habitColor }}
                          />

                          {/* Cabeçalho do Card do Hábito */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3 mt-1">
                            <div className="flex items-center gap-3">
                              <span 
                                className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0" 
                                style={{ backgroundColor: habitColor }} 
                              />
                              <div>
                                <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                                  {h.name}
                                </h3>
                                <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                                  Sequência atual: <strong className="text-zinc-700 dark:text-zinc-300">{streak} dias</strong>
                                </p>
                              </div>
                            </div>

                            {/* Badges de aproveitamento no ano */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
                                <strong className="text-zinc-900 dark:text-white font-extrabold">{periodCompleted}</strong> de {periodTotal} dias
                              </span>
                              <span 
                                className="px-2.5 py-1 rounded-xl text-xs font-black text-white shadow-xs"
                                style={{ backgroundColor: habitColor }}
                              >
                                {periodRate}% anual
                              </span>
                            </div>
                          </div>

                          {/* VISÃO ANUAL (12 MESES EM MINI-HEATMAPS) */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                            {yearData.map(m => {
                              const doneInMonth = m.days.filter(dStr => (habitHistory[dStr] || []).includes(h.id)).length;
                              const monthRate = m.daysInMonth > 0 ? Math.round((doneInMonth / m.daysInMonth) * 100) : 0;
                              return (
                                <div
                                  key={m.monthIndex}
                                  className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col gap-2"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">{m.monthName}</span>
                                    <span className="text-[10px] font-black" style={{ color: habitColor }}>{monthRate}%</span>
                                  </div>

                                  {/* Mini dots do mês */}
                                  <div className="grid grid-cols-7 gap-1">
                                    {m.days.map(dStr => {
                                      const isDone = (habitHistory[dStr] || []).includes(h.id);
                                      return (
                                        <button
                                          key={dStr}
                                          type="button"
                                          onClick={() => toggleHabit(h.id, dStr)}
                                          title={`${dStr}: ${isDone ? 'Concluído (clique para alternar)' : 'Pendente (clique para marcar)'}`}
                                          className={`w-2.5 h-2.5 rounded-xs transition-transform hover:scale-125 cursor-pointer ${!isDone ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
                                          style={isDone ? { backgroundColor: habitColor } : {}}
                                        />
                                      );
                                    })}
                                  </div>

                                  <span className="text-[9px] font-bold text-zinc-400 mt-1">
                                    {doneInMonth}/{m.daysInMonth} dias feitos
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </div>

      {/* MODAL PARA ADICIONAR NOVO HÁBITO COM SELEÇÃO DE COR */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-black text-base">
                <Plus size={18} className="text-orange-500" strokeWidth={3} />
                <span>Novo Hábito</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={addHabit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nome do Hábito
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Ex: Treino físico, Beber 2L de água..."
                  maxLength={50}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Seletor de Cores */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Cor do Hábito
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {HABIT_PALETTE.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedNewColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                        selectedNewColor === c.hex 
                          ? 'ring-2 ring-zinc-900 dark:ring-white ring-offset-2 dark:ring-offset-zinc-900 scale-105' 
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {selectedNewColor === c.hex && (
                        <Check size={16} strokeWidth={3} className="text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview do Card */}
              <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedNewColor }} />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">
                  {newHabitName.trim() || 'Prévia do seu hábito...'}
                </span>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newHabitName.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Cadastrar Hábito
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
