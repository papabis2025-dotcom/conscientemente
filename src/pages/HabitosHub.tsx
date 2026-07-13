import React, { useState, useEffect } from 'react';
import { 
  Flame, Plus, Trash2, Check, ClipboardList, 
  BarChart3, Calendar, Award, TrendingUp, 
  ChevronLeft, ChevronRight, Moon, Sun, LayoutGrid, CheckCircle2,
  LayoutTemplate, Menu
} from 'lucide-react';
import { api } from '../modules/estudos/services/api';

interface Habit {
  id: string;
  name: string;
  createdAt: number;
}

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
  
  // State from localStorage
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem('cn_habits');
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaultHabits: Habit[] = [
      { id: 'h1', name: 'Beber 2L de água', createdAt: Date.now() },
      { id: 'h2', name: 'Estudar 1 hora', createdAt: Date.now() },
      { id: 'h3', name: 'Treino físico', createdAt: Date.now() },
      { id: 'h4', name: 'Ler 10 páginas', createdAt: Date.now() }
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

  const [newHabitName, setNewHabitName] = useState('');
  
  // Tab state: 'painel' (Painel Diário) | 'relatorio' (Análise de Consistência)
  const [activeTab, setActiveTab] = useState<'painel' | 'relatorio'>(() => {
    const savedTab = sessionStorage.getItem('habitosActiveTab');
    return (savedTab === 'relatorio' || savedTab === 'painel') ? savedTab : 'relatorio';
  });

  // Keep sessionStorage in sync
  useEffect(() => {
    sessionStorage.setItem('habitosActiveTab', activeTab);
  }, [activeTab]);


  // Keep time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state between tabs and other storage writers
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedHabits = localStorage.getItem('cn_habits');
        if (savedHabits) {
          setHabits(JSON.parse(savedHabits));
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

  // Fetch from Supabase on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        const cloudHabits = await api.habits.list();
        if (cloudHabits && cloudHabits.length > 0) {
          const mappedHabits = cloudHabits.map(h => ({
            id: h.id,
            name: h.name,
            createdAt: new Date(h.created_at).getTime()
          }));
          setHabits(mappedHabits);
          localStorage.setItem('cn_habits', JSON.stringify(mappedHabits));
        }

        const cloudLogs = await api.habits.getAllLogs();
        if (cloudLogs) {
          const newHistory: Record<string, string[]> = {};
          cloudLogs.forEach(log => {
            if (!newHistory[log.logged_date]) newHistory[log.logged_date] = [];
            newHistory[log.logged_date].push(log.habit_id);
          });
          setHabitHistory(newHistory);
          localStorage.setItem('cn_habit_history', JSON.stringify(newHistory));
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

  const todayStr = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(() => {
    const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return localToday.toISOString().split('T')[0];
  });

  // Mutators
  const toggleHabit = (habitId: string, dateStr: string = selectedDate) => {
    let isCompleted = false;
    setHabitHistory(prev => {
      const dayLogs = prev[dateStr] || [];
      let newDayLogs: string[];
      if (dayLogs.includes(habitId)) {
        newDayLogs = dayLogs.filter(id => id !== habitId);
        isCompleted = false;
      } else {
        newDayLogs = [...dayLogs, habitId];
        isCompleted = true;
      }
      const updated = { ...prev, [dateStr]: newDayLogs };
      localStorage.setItem('cn_habit_history', JSON.stringify(updated));
      return updated;
    });
    
    // Sync to cloud
    api.habits.toggleLog(habitId, dateStr, isCompleted).catch(err => console.error('Error toggling habit log in cloud:', err));

    // Trigger sync
    setTimeout(triggerSyncEvent, 50);
  };

  const toggleHabitOnDate = (habitId: string, dateStr: string) => {
    toggleHabit(habitId, dateStr);
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabitNameTrimmed = newHabitName.trim();
    setNewHabitName(''); // Clear input optimistically

    try {
      const cloudHabit = await api.habits.upsert({ name: newHabitNameTrimmed });
      if (cloudHabit) {
        const newHabit: Habit = {
          id: cloudHabit.id,
          name: cloudHabit.name,
          createdAt: new Date(cloudHabit.created_at).getTime()
        };

        setHabits(prev => {
          const updated = [...prev, newHabit];
          localStorage.setItem('cn_habits', JSON.stringify(updated));
          return updated;
        });
        setTimeout(triggerSyncEvent, 50);
      }
    } catch (err) {
      console.error('Error adding habit to cloud:', err);
    }
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

    // Handle cn_deleted_habit_ids to ensure persistent deletion across devices
    try {
      const deletedRaw = localStorage.getItem('cn_deleted_habit_ids') || '[]';
      const deletedIds = JSON.parse(deletedRaw);
      if (Array.isArray(deletedIds)) {
        if (!deletedIds.includes(habitId)) {
          deletedIds.push(habitId);
          localStorage.setItem('cn_deleted_habit_ids', JSON.stringify(deletedIds));
        }
      } else {
        localStorage.setItem('cn_deleted_habit_ids', JSON.stringify([habitId]));
      }
    } catch {
      localStorage.setItem('cn_deleted_habit_ids', JSON.stringify([habitId]));
    }

    // Sync to cloud
    api.habits.delete(habitId).catch(err => console.error('Error deleting habit in cloud:', err));

    setTimeout(triggerSyncEvent, 50);
  };

  // Stats Calculations
  const completedTodayCount = habits.filter(h => (habitHistory[selectedDate] || []).includes(h.id)).length;
  const totalHabitsCount = habits.length;
  const progressPercent = totalHabitsCount > 0 ? Math.round((completedTodayCount / totalHabitsCount) * 100) : 0;

  // Streak calculations
  let currentStreak = 0;
  const tempDate = new Date(currentTime);
  for (let i = 0; i < 30; i++) {
    const dStr = new Date(tempDate.getTime() - tempDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const completedCount = (habitHistory[dStr] || []).filter(id => habits.some(h => h.id === id)).length;
    if (completedCount > 0) {
      currentStreak++;
      tempDate.setDate(tempDate.getDate() - 1);
    } else {
      if (i === 0) {
        tempDate.setDate(tempDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // 7 Days consistency
  const getPast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentTime.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      list.push({
        dateStr: dStr,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        dayNum: date.getDate()
      });
    }
    return list;
  };
  const last7Days = getPast7Days();

  let last7DaysCompletions = 0;
  const last7DaysTotalPossible = last7Days.length * totalHabitsCount;
  last7Days.forEach(day => {
    const completedOnDay = habitHistory[day.dateStr] || [];
    const activeCompleted = completedOnDay.filter(id => habits.some(h => h.id === id)).length;
    last7DaysCompletions += activeCompleted;
  });
  const last7DaysRate = last7DaysTotalPossible > 0 ? Math.round((last7DaysCompletions / last7DaysTotalPossible) * 100) : 0;

  const totalCompletions = Object.values(habitHistory).reduce((acc, list) => {
    return acc + list.filter(id => habits.some(h => h.id === id)).length;
  }, 0);

  // 30 Days list for Heatmap Calendar
  const getDaysInMonthList = () => {
    const list = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentTime.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const completed = (habitHistory[dStr] || []).filter(id => habits.some(h => h.id === id)).length;
      const total = habits.length;
      const rate = total > 0 ? completed / total : 0;
      list.push({
        dateStr: dStr,
        dateObj: date,
        dayNum: date.getDate(),
        rate,
        completed,
        total
      });
    }
    return list;
  };
  const daysInMonthList = getDaysInMonthList();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent text-zinc-800 dark:text-zinc-100 transition-colors duration-300">
      
      {/* Backdrop para mobile quando a sidebar estiver aberta */}
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

      {/* Sidebar Lateral Esquerda */}
      <aside className={`fixed md:relative z-50 md:z-20 h-screen bg-white/95 dark:bg-zinc-900/95 md:bg-white/50 md:dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-5 transition-all duration-300 backdrop-blur-xl shrink-0 ${isSidebarCollapsed ? 'w-64 md:w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'}`}>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform cursor-pointer"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo e Nome do Módulo */}
        <div className={`mb-8 px-1 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex items-center gap-3 text-orange-500">
            <Flame size={28} className="drop-shadow-sm shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
                Hábitos
              </span>
            )}
          </div>
        </div>

        {/* Progresso de Hoje na Sidebar */}
        <div className="mb-5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700">
          {!isSidebarCollapsed ? (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hoje</span>
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-500">
                <span>Concluídos</span>
                <span className="text-zinc-700 dark:text-zinc-350 font-extrabold">{completedTodayCount}/{totalHabitsCount}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Flame size={16} className="text-orange-500" />
              <span className="text-[9px] font-black text-zinc-500">{progressPercent}%</span>
            </div>
          )}
        </div>

        {/* Navegação por Abas na Sidebar */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          <button 
            onClick={() => setActiveTab('painel')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all font-semibold ${
              activeTab === 'painel' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium'
            }`}
            title={isSidebarCollapsed ? 'Painel Diário' : ''}
          >
            <Calendar size={20} />
            {!isSidebarCollapsed && <span className="text-sm">Painel Diário</span>}
          </button>
          <button 
            onClick={() => setActiveTab('relatorio')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all font-semibold ${
              activeTab === 'relatorio' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium'
            }`}
            title={isSidebarCollapsed ? 'Consistência' : ''}
          >
            <BarChart3 size={20} />
            {!isSidebarCollapsed && <span className="text-sm">Consistência</span>}
          </button>
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          {/* Alternador de Tema */}
          <button 
            onClick={toggleTheme}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all text-zinc-550 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-white font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {!isSidebarCollapsed && <span className="text-sm">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          
          {/* Voltar ao Hub */}
          <button 
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 py-3 px-2 bg-zinc-105 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-[11px] uppercase tracking-wider"
            title="Voltar ao Hub"
          >
            <LayoutTemplate size={18} className={isSidebarCollapsed ? '' : 'shrink-0'} />
            {!isSidebarCollapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal à Direita */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        


        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            
            {/* Top Stats Grid */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Consistency card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-350 shrink-0 border border-zinc-200 dark:border-zinc-800">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 leading-none">Consistência</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-2.5 leading-none">{last7DaysRate}%</p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-1.5 leading-none">Últimos 7 dias</p>
                </div>
              </div>

              {/* Streak card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="p-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-450 shrink-0 border border-orange-200/30 dark:border-orange-950/20">
                  <Flame size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 leading-none">Sequência</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-2.5 leading-none">{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-1.5 leading-none">Recorde ativo</p>
                </div>
              </div>

              {/* Active Habits card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-450 shrink-0 border border-emerald-200/30 dark:border-emerald-950/20">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 leading-none">Hábitos</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-2.5 leading-none">{totalHabitsCount}</p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-1.5 leading-none">Cadastrados</p>
                </div>
              </div>

              {/* Total Completions card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-450 shrink-0 border border-blue-200/30 dark:border-blue-950/20">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-550 dark:text-zinc-450 leading-none">Conclusões</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-2.5 leading-none">{totalCompletions}</p>
                  <p className="text-[10px] font-bold text-zinc-550 dark:text-zinc-450 mt-1.5 leading-none">Total histórico</p>
                </div>
              </div>
            </section>

            {/* Tab contents */}
            <section className="animate-in fade-in duration-300">
          
          {activeTab === 'painel' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Checklist Column */}
              <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <ClipboardList size={16} className="text-slate-650 dark:text-slate-400" />
                      Checklist de Hábitos
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">
                      {(() => {
                        const parts = selectedDate.split('-');
                        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
                        return dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
                      })()}
                    </p>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={selectedDate}
                      max={todayStr}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-black text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Progress bar */}
                {totalHabitsCount > 0 && (
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <span>Progresso do Dia</span>
                      <span className="text-slate-600 dark:text-slate-400 font-extrabold text-xs">
                        {completedTodayCount} de {totalHabitsCount} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-600 to-zinc-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* List of habits checklist */}
                <div className="flex flex-col gap-2.5 mt-1">
                  {totalHabitsCount === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      Nenhum hábito cadastrado no momento. Adicione um novo hábito ao lado.
                    </div>
                  ) : (
                    habits.map(h => {
                      const isCompleted = (habitHistory[selectedDate] || []).includes(h.id);
                      return (
                        <div
                          key={h.id}
                          onClick={() => toggleHabit(h.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none group ${
                            isCompleted
                              ? 'bg-zinc-100/50 dark:bg-zinc-950/15 border-zinc-200 dark:border-zinc-900/50 opacity-60'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-slate-700 border-slate-700 text-white shadow-sm shadow-slate-500/25'
                                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 group-hover:border-slate-500 dark:group-hover:border-slate-600'
                            }`}>
                              {isCompleted && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span className={`text-sm font-bold truncate leading-none transition-all ${
                              isCompleted
                                ? 'line-through text-zinc-400 dark:text-zinc-500 font-medium'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}>
                              {h.name}
                            </span>
                          </div>
                          
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full leading-none transition-colors ${
                            isCompleted 
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-350' 
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                          }`}>
                            {isCompleted ? 'Feito' : 'Pendente'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Management Column */}
              <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Plus size={16} className="text-slate-600 dark:text-slate-400" />
                    Gerenciar Hábitos
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">Cadastre e exclua hábitos de sua rotina</p>
                </div>

                {/* Form to add */}
                <form onSubmit={addHabit} className="flex gap-2">
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="Novo hábito (ex: Treino físico)..."
                    maxLength={50}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-transform active:scale-95 shadow-md shadow-slate-500/15 flex items-center justify-center shrink-0"
                  >
                    Add
                  </button>
                </form>

                {/* List of active habits for deletion */}
                <div className="flex flex-col gap-2.5 border-t border-zinc-200 dark:border-zinc-800/60 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500 mb-1 leading-none">Hábitos Cadastrados</p>
                  
                  {habits.length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold py-3 text-center bg-zinc-50 dark:bg-zinc-950/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">Nenhum hábito cadastrado.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
                      {habits.map(h => (
                        <div 
                          key={h.id}
                          className="flex items-center justify-between py-3 px-4.5 bg-zinc-50 dark:bg-zinc-950/20 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-300 truncate max-w-[80%]">{h.name}</span>
                          <button
                            onClick={() => deleteHabit(h.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                            title="Excluir hábito"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Consistency Report Tab */
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div className="border-b border-zinc-150 dark:border-zinc-850 pb-3">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={16} className="text-slate-600 dark:text-slate-400" />
                    Calendário de Consistência (Últimos 30 Dias)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">Intensidade das conclusões. Clique em qualquer dia para registrar retroativamente.</p>
                </div>

                {/* Heatmap Grid */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
                    {daysInMonthList.map((day, idx) => {
                      // Determine the colors based on rate
                      let colorClass = 'bg-zinc-200 dark:bg-zinc-800 opacity-40'; // 0%
                      
                      if (day.rate > 0) {
                        if (day.rate <= 0.33) {
                          colorClass = 'bg-slate-200 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200';
                        } else if (day.rate <= 0.66) {
                          colorClass = 'bg-slate-300 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-400/40';
                        } else if (day.rate < 1.0) {
                          colorClass = 'bg-slate-500 dark:bg-slate-650 text-white';
                        } else { // 100%
                          colorClass = 'bg-slate-700 dark:bg-slate-500 text-white shadow-sm shadow-slate-600/30';
                        }
                      }

                      const dateLabel = day.dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                      const weekday = day.dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

                      return (
                        <div 
                          key={day.dateStr}
                          onClick={() => {
                            setSelectedDate(day.dateStr);
                            setActiveTab('painel');
                          }}
                          className={`flex flex-col items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/50 hover:scale-105 hover:shadow-sm transition-all relative group cursor-pointer ${colorClass}`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-wider opacity-70 leading-none">{weekday}</span>
                          <span className="text-xs font-black mt-1.5 leading-none">{day.dayNum}</span>
                          
                          {/* Tooltip on Hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-3 py-2 rounded-xl text-xs font-bold shadow-md z-45 whitespace-nowrap leading-tight pointer-events-none border border-zinc-800 dark:border-zinc-200">
                            <p className="opacity-90">{dateLabel}</p>
                            <p className="mt-1 text-slate-400 dark:text-slate-600 font-extrabold">{day.completed} de {day.total} feitos ({Math.round(day.rate * 100)}%)</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-3 mt-1.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest shrink-0">
                    <span>Menos ativo</span>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-800 opacity-40 border border-zinc-200 dark:border-zinc-700" />
                      <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-900/40 border border-zinc-200 dark:border-zinc-800" />
                      <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-800 border border-zinc-250 dark:border-zinc-700" />
                      <div className="w-4 h-4 rounded bg-slate-500 dark:bg-slate-650 border border-zinc-300 dark:border-zinc-650" />
                      <div className="w-4 h-4 rounded bg-slate-700 dark:bg-slate-500 border border-zinc-400 dark:border-zinc-500 shadow-sm shadow-slate-500/20" />
                    </div>
                    <span>Mais ativo</span>
                  </div>
                </div>

                {/* Additional Consistency stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200 dark:border-zinc-800/60 pt-6 mt-2">
                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Análise de Progresso</h4>
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                      Seu índice de consistência geral é calculado com base nas conclusões nos últimos 7 dias. Para maximizar sua consistência, tente concluir todos os hábitos diariamente e manter sua chama de sequência (streak) sempre acesa.
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Fatos da sua Rotina</h4>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none">Dias no histórico</span>
                        <p className="text-base font-black mt-1 text-zinc-800 dark:text-white">{Object.keys(habitHistory).length} d</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none">Média de hábitos</span>
                        <p className="text-base font-black mt-1 text-zinc-800 dark:text-white">{totalHabitsCount} at.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>

          </div>
        </div>
      </div>

    </div>
  );
}
