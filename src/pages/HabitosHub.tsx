import React, { useState, useEffect } from 'react';
import { 
  Flame, Plus, Trash2, Check, ClipboardList, 
  BarChart3, Calendar, Award, TrendingUp, 
  ChevronLeft, Moon, Sun, LayoutGrid, CheckCircle2 
} from 'lucide-react';

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
    return (savedTab === 'relatorio' || savedTab === 'painel') ? savedTab : 'painel';
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

  // Dispatch sync event helper
  const triggerSyncEvent = () => {
    window.dispatchEvent(new Event('local-storage-sync'));
    window.dispatchEvent(new Event('storage'));
  };

  const todayStr = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // Mutators
  const toggleHabit = (habitId: string) => {
    setHabitHistory(prev => {
      const todayLogs = prev[todayStr] || [];
      let newTodayLogs: string[];
      if (todayLogs.includes(habitId)) {
        newTodayLogs = todayLogs.filter(id => id !== habitId);
      } else {
        newTodayLogs = [...todayLogs, habitId];
      }
      const updated = { ...prev, [todayStr]: newTodayLogs };
      localStorage.setItem('cn_habit_history', JSON.stringify(updated));
      return updated;
    });
    // Trigger sync
    setTimeout(triggerSyncEvent, 50);
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      name: newHabitName.trim(),
      createdAt: Date.now()
    };

    setHabits(prev => {
      const updated = [...prev, newHabit];
      localStorage.setItem('cn_habits', JSON.stringify(updated));
      return updated;
    });

    setNewHabitName('');
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

    setTimeout(triggerSyncEvent, 50);
  };

  // Stats Calculations
  const completedTodayCount = habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length;
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 transition-colors duration-300 pb-12">
      
      {/* Header Container */}
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm"
              title="Voltar ao Hub"
            >
              <ChevronLeft size={14} className="stroke-[3]" />
              <span>Voltar</span>
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 dark:bg-slate-500/20 text-slate-650 dark:text-slate-400 flex items-center justify-center animate-pulse">
                <Flame size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white leading-none">Hub de Hábitos</h1>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 leading-none">Construa rotinas saudáveis e consistentes</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User welcome */}
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Olá,</p>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none mt-0.5">{userName}</p>
            </div>
            
            {/* Theme switcher */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm transition-all"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 flex flex-col gap-6">
        
        {/* Top Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Consistency card */}
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3 rounded-xl bg-slate-500/10 dark:bg-slate-500/20 text-slate-650 dark:text-slate-450 shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none">Consistência</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white mt-1 leading-none">{last7DaysRate}%</p>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 leading-none">Últimos 7 dias</p>
            </div>
          </div>

          {/* Streak card */}
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none">Sequência</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white mt-1 leading-none">{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</p>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 leading-none">Recorde ativo 🔥</p>
            </div>
          </div>

          {/* Active Habits card */}
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none">Hábitos</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white mt-1 leading-none">{totalHabitsCount}</p>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 leading-none">Hábitos cadastrados</p>
            </div>
          </div>

          {/* Total Completions card */}
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none">Conclusões</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white mt-1 leading-none">{totalCompletions}</p>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 leading-none">Total no histórico</p>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="flex border-b border-zinc-200 dark:border-zinc-800/60 p-0.5 max-w-md">
          <button 
            onClick={() => setActiveTab('painel')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'painel' 
                ? 'bg-slate-600 text-white shadow-md shadow-slate-500/15' 
                : 'text-zinc-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
            }`}
          >
            <Calendar size={14} />
            Painel Diário
          </button>
          <button 
            onClick={() => setActiveTab('relatorio')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'relatorio' 
                ? 'bg-slate-600 text-white shadow-md shadow-slate-500/15' 
                : 'text-zinc-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
            }`}
          >
            <BarChart3 size={14} />
            Consistência
          </button>
        </section>

        {/* Tab contents */}
        <section className="animate-in fade-in duration-300">
          
          {activeTab === 'painel' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Checklist Column */}
              <div className="lg:col-span-7 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                    <ClipboardList size={14} className="text-slate-500" />
                    Checklist de Hoje
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-semibold leading-none">
                    {new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>

                {/* Progress bar */}
                {totalHabitsCount > 0 && (
                  <div className="bg-zinc-100 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 p-4 rounded-2xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <span>Progresso do Dia</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {completedTodayCount} de {totalHabitsCount} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-250 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-600 to-zinc-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* List of habits checklist */}
                <div className="flex flex-col gap-2 mt-1">
                  {totalHabitsCount === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Nenhum hábito cadastrado no momento. Adicione um novo hábito ao lado.
                    </div>
                  ) : (
                    habits.map(h => {
                      const isCompleted = (habitHistory[todayStr] || []).includes(h.id);
                      return (
                        <div
                          key={h.id}
                          onClick={() => toggleHabit(h.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none group ${
                            isCompleted
                              ? 'bg-zinc-100/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-900/50 opacity-60'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-slate-350 dark:hover:border-slate-800 hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-slate-600 border-slate-600 text-white shadow-sm shadow-slate-500/25'
                                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 group-hover:border-slate-400 dark:group-hover:border-slate-700'
                            }`}>
                              {isCompleted && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span className={`text-xs font-bold truncate leading-none transition-all ${
                              isCompleted
                                ? 'line-through text-zinc-500 dark:text-zinc-500 font-medium'
                                : 'text-zinc-800 dark:text-zinc-105'
                            }`}>
                              {h.name}
                            </span>
                          </div>
                          
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCompleted 
                              ? 'bg-slate-500/10 text-slate-650 dark:text-slate-400' 
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
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
              <div className="lg:col-span-5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Plus size={14} className="text-slate-500" />
                    Gerenciar Hábitos
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-semibold leading-none">Cadastre e exclua hábitos de sua rotina</p>
                </div>

                {/* Form to add */}
                <form onSubmit={addHabit} className="flex gap-2">
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="Novo hábito (ex: Dormir cedo)..."
                    maxLength={50}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-semibold placeholder-zinc-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/50 transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-transform active:scale-95 shadow-md shadow-slate-500/15 flex items-center justify-center shrink-0"
                  >
                    Add
                  </button>
                </form>

                {/* List of active habits for deletion */}
                <div className="flex flex-col gap-2 border-t border-zinc-250 dark:border-zinc-800/60 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 leading-none">Hábitos Cadastrados</p>
                  
                  {habits.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium py-3 text-center">Nenhum hábito cadastrado.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                      {habits.map(h => (
                        <div 
                          key={h.id}
                          className="flex items-center justify-between py-2.5 px-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors"
                        >
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[80%]">{h.name}</span>
                          <button
                            onClick={() => deleteHabit(h.id)}
                            className="p-1.5 text-zinc-450 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                            title="Excluir hábito"
                          >
                            <Trash2 size={13} />
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
              <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-slate-500" />
                    Calendário de Consistência (Últimos 30 Dias)
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-semibold leading-none">Intensidade das conclusões de seus hábitos</p>
                </div>

                {/* Heatmap Grid */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
                    {daysInMonthList.map((day, idx) => {
                      // Determine the colors based on rate
                      let colorClass = 'bg-zinc-250 dark:bg-zinc-800 opacity-40'; // 0%
                      
                      if (day.rate > 0) {
                        if (day.rate <= 0.33) {
                          colorClass = 'bg-slate-200 dark:bg-slate-900/40 text-slate-700 dark:text-slate-350';
                        } else if (day.rate <= 0.66) {
                          colorClass = 'bg-slate-350 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
                        } else if (day.rate < 1.0) {
                          colorClass = 'bg-slate-500 dark:bg-slate-700/90 text-white';
                        } else { // 100%
                          colorClass = 'bg-slate-650 dark:bg-slate-600 text-white shadow-sm shadow-slate-600/30';
                        }
                      }

                      const dateLabel = day.dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                      const weekday = day.dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

                      return (
                        <div 
                          key={day.dateStr}
                          className={`flex flex-col items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/50 hover:scale-105 hover:shadow-sm transition-all relative group ${colorClass}`}
                        >
                          <span className="text-[8px] font-black uppercase tracking-wider opacity-60 leading-none">{weekday}</span>
                          <span className="text-xs font-black mt-1 leading-none">{day.dayNum}</span>
                          
                          {/* Tooltip on Hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 px-2 py-1.5 rounded-lg text-[9px] font-bold shadow-md z-40 whitespace-nowrap leading-tight pointer-events-none">
                            <p>{dateLabel}</p>
                            <p className="mt-0.5 text-slate-450 dark:text-slate-600 font-extrabold">{day.completed} de {day.total} feitos ({Math.round(day.rate * 100)}%)</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-3 mt-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">
                    <span>Menos ativo</span>
                    <div className="flex gap-1">
                      <div className="w-3.5 h-3.5 rounded bg-zinc-250 dark:bg-zinc-800 opacity-40 border border-zinc-200 dark:border-zinc-700" />
                      <div className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-900/40 border border-zinc-250 dark:border-zinc-800" />
                      <div className="w-3.5 h-3.5 rounded bg-slate-350 dark:bg-slate-800/60 border border-zinc-250 dark:border-zinc-800" />
                      <div className="w-3.5 h-3.5 rounded bg-slate-500 dark:bg-slate-700/80 border border-zinc-250 dark:border-zinc-800" />
                      <div className="w-3.5 h-3.5 rounded bg-slate-650 dark:bg-slate-600 border border-zinc-250 dark:border-zinc-800 shadow-sm shadow-slate-550/20" />
                    </div>
                    <span>Mais ativo</span>
                  </div>
                </div>

                {/* Additional Consistency stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200 dark:border-zinc-800/60 pt-6 mt-2">
                  <div className="bg-zinc-50 dark:bg-zinc-950/30 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-850 flex flex-col gap-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Análise de Progresso</h4>
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      Seu índice de consistência geral é calculated com base nas conclusões nos últimos 7 dias. Para maximizar sua consistência, tente concluir todos os hábitos diariamente e manter sua chama de sequência (streak) sempre acesa.
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950/30 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-850 flex flex-col gap-2.5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Fatos da sua Rotina</h4>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 leading-none">Dias no histórico</span>
                        <p className="text-sm font-extrabold mt-1 text-zinc-800 dark:text-zinc-200">{Object.keys(habitHistory).length} d</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 leading-none">Média de hábitos</span>
                        <p className="text-sm font-extrabold mt-1 text-zinc-800 dark:text-zinc-200">{totalHabitsCount} at.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>

      </main>

    </div>
  );
}
