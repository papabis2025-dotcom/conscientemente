import React, { useState, useEffect, useRef } from 'react';
import { MODULES } from '../constants';
import { Module } from '../types';
import { LogEntry } from '../modules/estudos/types';
import { LogOut, Sun, Moon, ArrowUpRight, Lock, BookOpen, Wallet, ListTodo, Brain, ChevronRight, Activity, TrendingUp, Settings, User, X, HeartPulse, Bell, Plus, Trash2, Check, ClipboardList, BarChart3, ChevronLeft, Calendar, Award, CheckCircle2 } from 'lucide-react';
import LogView from '../modules/estudos/pages/LogView';
import { api } from '../modules/estudos/services/api';
import { supabase } from '../modules/estudos/services/supabase';

interface AppNotification {
  id: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  type: 'tarefa' | 'estudo' | 'saude' | 'financas' | 'sistema';
  timestamp: number;
}

interface Habit {
  id: string;
  name: string;
  createdAt: number;
}

interface HubHomeProps {
  userName: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
  bgType: 'default' | 'color';
  setBgType: (type: 'default' | 'color') => void;
  bgColor: string;
  setBgColor: (color: string) => void;
}

const colorMap: Record<string, {
  gradient: string;
  glow: string;
  badge: string;
  icon: string;
  border: string;
  ring: string;
}> = {
  indigo: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'hover:shadow-indigo-500/25 dark:hover:shadow-indigo-500/20',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    icon: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    border: 'hover:border-indigo-400/50 dark:hover:border-indigo-500/40',
    ring: 'group-hover:ring-indigo-400/30 dark:group-hover:ring-indigo-500/20',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'hover:shadow-emerald-500/25 dark:hover:shadow-emerald-500/20',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    icon: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-400/50 dark:hover:border-emerald-500/40',
    ring: 'group-hover:ring-emerald-400/30 dark:group-hover:ring-emerald-500/20',
  },
  cyan: {
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'hover:shadow-cyan-500/25 dark:hover:shadow-cyan-500/20',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    icon: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    border: 'hover:border-cyan-400/50 dark:hover:border-cyan-500/40',
    ring: 'group-hover:ring-cyan-400/30 dark:group-hover:ring-cyan-500/20',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    glow: 'hover:shadow-rose-500/25 dark:hover:shadow-rose-500/20',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    icon: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    border: 'hover:border-rose-400/50 dark:hover:border-rose-500/40',
    ring: 'group-hover:ring-rose-400/30 dark:group-hover:ring-rose-500/20',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'hover:shadow-amber-500/25 dark:hover:shadow-amber-500/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    icon: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-400/50 dark:hover:border-amber-500/40',
    ring: 'group-hover:ring-amber-400/30 dark:group-hover:ring-amber-500/20',
  },
};


const iconMap: Record<string, React.ReactNode> = {
  estudos: <BookOpen size={20} strokeWidth={2} />,
  financas: <Wallet size={20} strokeWidth={2} />,
  saude: <Activity size={20} strokeWidth={2} />,
  tarefas: <ListTodo size={20} strokeWidth={2} />,
};

const ModuleCard: React.FC<{ module: Module; index: number }> = ({ module, index }) => {
  const colors = colorMap[module.color] ?? colorMap.indigo;

  const handleClick = () => {
    if (!module.available) return;
    window.location.hash = module.route;
  };

  const handleShortcutClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    if (action === 'adicionar-estudo') {
      sessionStorage.setItem('openAddStudyModal', 'true');
      window.location.hash = 'estudos';
    } else if (action === 'planner-estudos') {
      sessionStorage.setItem('estudosActiveTab', 'calendar');
      window.location.hash = 'estudos';
    } else if (action === 'novo-treino') {
      sessionStorage.setItem('openAddSaudeModal', 'true');
      window.location.hash = 'saude';
    } else if (action === 'financas-entrada') {
      sessionStorage.setItem('openAddFinancasType', 'entrada');
      window.location.hash = 'financas';
    } else if (action === 'financas-saida') {
      sessionStorage.setItem('openAddFinancasType', 'saida');
      window.location.hash = 'financas';
    } else if (action === 'nova-tarefa') {
      sessionStorage.setItem('openAddTaskModal', 'true');
      window.location.hash = 'tarefas';
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{ animationDelay: `${index * 80}ms` }}
      className={[
        'group relative w-full text-left rounded-2xl border transition-all duration-300',
        'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm',
        'border-zinc-200/80 dark:border-zinc-800/80',
        'ring-2 ring-transparent',
        colors.ring,
        module.available
          ? `cursor-pointer hover:shadow-xl hover:-translate-y-1 ${colors.glow} ${colors.border}`
          : 'opacity-50 cursor-not-allowed',
        'animate-in fade-in slide-in-from-bottom-4 duration-500',
        'overflow-hidden',
      ].join(' ')}
    >
      {/* Gradient top strip */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${colors.icon} ${module.available ? '' : 'opacity-50 grayscale'}`}>
            {iconMap[module.id] || <TrendingUp size={20} />}
          </div>
          {!module.available ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
              <Lock size={9} />
              Em breve
            </span>
          ) : (
            <span className={`flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}>
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>

        <p className="text-sm font-black text-zinc-800 dark:text-white tracking-tight mb-1">
          {module.label}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium line-clamp-2">
          {module.description}
        </p>

        {module.available && (
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {module.id === 'estudos' && (
                <>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'adicionar-estudo')}
                    className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                  >
                    + Estudo
                  </button>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'planner-estudos')}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all"
                  >
                    <Calendar size={9} /> Planner
                  </button>
                </>
              )}
              {module.id === 'saude' && (
                <button
                  onClick={(e) => handleShortcutClick(e, 'novo-treino')}
                  className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-650 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/50 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-all"
                >
                  + Treino
                </button>
              )}
              {module.id === 'financas' && (
                <>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'financas-entrada')}
                    className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                  >
                    + Receita
                  </button>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'financas-saida')}
                    className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-650 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all"
                  >
                    - Despesa
                  </button>
                </>
              )}
              {module.id === 'tarefas' && (
                <button
                  onClick={(e) => handleShortcutClick(e, 'nova-tarefa')}
                  className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-655 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all"
                >
                  + Tarefa
                </button>
              )}
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 ${colors.badge.split(' ').filter(c => c.startsWith('text-')).join(' ') ?? 'text-zinc-500'}`}>
              Abrir <ChevronRight size={8} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HubHome: React.FC<HubHomeProps> = ({ userName, theme, toggleTheme, onLogout, bgType, setBgType, bgColor, setBgColor }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingTarefas, setPendingTarefas] = useState(0);
  const [pendingEstudos, setPendingEstudos] = useState(0);
  const [pendingSaude, setPendingSaude] = useState(0);
  const [financeBalance, setFinanceBalance] = useState<number | null>(null);
  const [pendingFinanceCount, setPendingFinanceCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('cn_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Habits state
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
  const [showManageHabits, setShowManageHabits] = useState(false);
  const [showHabitsReport, setShowHabitsReport] = useState(false);

  const todayStr = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const triggerLocalNotification = (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'conscientemente-alert'
        });
      }).catch(() => {
        new Notification(title, { body });
      });
    } else {
      new Notification(title, { body });
    }
  };

  const generateNotifications = (data: {
    todayStr: string;
    tarefas: { id: string; text: string }[];
    pendingEstudos: number;
    saude: { id: string; type: string }[];
    balance: number;
    pendingFinance?: { id: string; name: string; amount: number; type: string }[];
  }) => {
    setNotifications(prev => {
      let updated = [...prev];
      let changed = false;

      const addNotify = (id: string, title: string, description: string, type: AppNotification['type']) => {
        if (updated.some(n => n.id === id)) return;
        const newNotif: AppNotification = {
          id,
          title,
          description,
          date: data.todayStr,
          read: false,
          type,
          timestamp: Date.now()
        };
        updated = [newNotif, ...updated];
        changed = true;
        triggerLocalNotification(title, description);
      };

      // 1. Check Tasks
      data.tarefas.forEach(task => {
        addNotify(
          `task_${task.id}`,
          'Tarefa Pendente',
          `A tarefa "${task.text}" está agendada para hoje.`,
          'tarefa'
        );
      });

      // 2. Check Studies
      if (data.pendingEstudos > 0) {
        addNotify(
          `estudos_${data.todayStr}`,
          'Estudos Pendentes',
          `Você tem ${data.pendingEstudos} ${data.pendingEstudos === 1 ? 'atividade de estudo' : 'atividades de estudo'} para realizar hoje.`,
          'estudo'
        );
      }

      // 3. Check Workouts
      data.saude.forEach(workout => {
        addNotify(
          `workout_${workout.id}`,
          'Treino Planejado',
          `Você tem um treino de "${workout.type}" agendado para hoje.`,
          'saude'
        );
      });

      // 4. Check Balance
      if (data.balance < 0) {
        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.balance);
        addNotify(
          `finance_neg_${data.todayStr}`,
          'Saldo Negativo',
          `Atenção: seu saldo atual no mês é ${formatted}.`,
          'financas'
        );
      }

      // 5. Check Pending Transactions Today
      if (data.pendingFinance) {
        data.pendingFinance.forEach(tx => {
          const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount);
          addNotify(
            `finance_pending_${tx.id}`,
            'Lançamento Pendente',
            `O lançamento "${tx.name}" (${formatted}) está pendente para hoje.`,
            'financas'
          );
        });
      }

      if (changed) {
        localStorage.setItem('cn_notifications', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('cn_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('cn_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('cn_notifications');
  };

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
  };

  const toggleHabitOnDate = (habitId: string, dateStr: string) => {
    setHabitHistory(prev => {
      const logs = prev[dateStr] || [];
      const updated = {
        ...prev,
        [dateStr]: logs.includes(habitId)
          ? logs.filter(id => id !== habitId)
          : [...logs, habitId]
      };
      localStorage.setItem('cn_habit_history', JSON.stringify(updated));
      return updated;
    });
  };

  const addHabit = (name: string) => {
    if (!name.trim()) return;
    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      name: name.trim(),
      createdAt: Date.now()
    };
    setHabits(prev => {
      const updated = [...prev, newHabit];
      localStorage.setItem('cn_habits', JSON.stringify(updated));
      return updated;
    });
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
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotificationsPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Settings states
  const fileRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Profile states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const fetchLogs = async () => {
    const data = await api.logs.list();
    if (data) setLogs(data);
  };

  const handleClearLogs = async () => {
    await api.logs.clear();
    setLogs([]);
  };

  const handleDeleteLog = async (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [concursos, sessions, simulados, schedule, goals] = await Promise.all([
        api.concursos.list(), api.sessions.list(), api.simulados.list(), api.schedule.list(), api.dailyGoals.list()
      ]);
      
      const localData: Record<string, string | null> = {
        cn_habits: localStorage.getItem('cn_habits'),
        cn_habit_history: localStorage.getItem('cn_habit_history'),
        cp_study_tasks: localStorage.getItem('cp_study_tasks'),
        cp_global_daily_goal: localStorage.getItem('cp_global_daily_goal'),
        cp_selected_concurso_id: localStorage.getItem('cp_selected_concurso_id'),
        cp_dashboard_layout_v19: localStorage.getItem('cp_dashboard_layout_v19'),
        cp_menu_order: localStorage.getItem('cp_menu_order'),
        cn_theme: localStorage.getItem('cn_theme'),
        isSidebarCollapsed_financas: localStorage.getItem('isSidebarCollapsed_financas'),
        isSidebarCollapsed_saude: localStorage.getItem('isSidebarCollapsed_saude'),
        isSidebarCollapsed_tarefas: localStorage.getItem('isSidebarCollapsed_tarefas'),
        cn_notifications: localStorage.getItem('cn_notifications')
      };

      const exportData = { 
        version: '1.1', 
        exportDate: new Date().toISOString(), 
        data: { concursos, sessions, simulados, scheduledStudies: schedule, dailyGoals: goals },
        localSettings: localData
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `conscientemente-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      alert('✅ Dados exportados com sucesso!');
    } catch (error) {
      console.error(error); alert('❌ Erro ao exportar dados.');
    } finally { setIsExporting(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      if (!importData.data) throw new Error('Formato inválido');
      const { concursos, sessions, simulados, scheduledStudies, dailyGoals } = importData.data;
      if (!confirm('Importar itens? Isso pode sobrescrever dados existentes.')) { setIsImporting(false); return; }
      
      // Sync cloud data
      if (concursos) for (const c of concursos) await api.concursos.upsert(c);
      if (sessions) for (const s of sessions) await api.sessions.create(s);
      if (simulados) for (const s of simulados) await api.simulados.create(s);
      if (scheduledStudies) for (const s of scheduledStudies) await api.schedule.create(s);
      if (dailyGoals) for (const g of dailyGoals) await api.dailyGoals.upsert(g);
      
      // Sync local settings if present
      if (importData.localSettings) {
        Object.entries(importData.localSettings).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            localStorage.setItem(key, val as string);
          }
        });
      }

      alert('✅ Dados importados com sucesso! Recarregue a página.');
      window.location.reload();
    } catch (error) {
      console.error(error); alert('❌ Erro ao importar dados.');
    } finally { setIsImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleResetAllData = async () => {
    if (confirm('⚠️ TEM CERTEZA? Isso apagará TODOS os seus dados permanentemente.') &&
        confirm('⛔ Último aviso: Essa ação não pode ser desfeita. Confirmar reset total?')) {
      try {
        await Promise.all([
          supabase.from('concursos').delete().neq('id', '0'),
          supabase.from('study_sessions').delete().neq('id', '0'),
          supabase.from('simulados').delete().neq('id', '0'),
          supabase.from('scheduled_studies').delete().neq('id', '0'),
          supabase.from('daily_goals').delete().neq('id', '0'),
          supabase.from('logs').delete().neq('id', '0')
        ]);
        alert('✅ Todos os dados foram apagados. O sistema foi resetado.');
        window.location.reload();
      } catch (e) { alert('Erro ao resetar dados.'); }
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage('');
    if (!newPassword || !confirmPassword) { setPasswordMessage('❌ Preencha todos os campos'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('❌ As senhas não coincidem'); return; }
    if (newPassword.length < 6) { setPasswordMessage('❌ A senha deve ter pelo menos 6 caracteres'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage('✅ Senha alterada com sucesso!');
      setNewPassword(''); setConfirmPassword('');
    } catch (error: any) { setPasswordMessage(`❌ Erro: ${error.message}`); }
  };

  const handleEmailChange = async () => {
    setEmailMessage('');
    if (!newEmail) { setEmailMessage('❌ Digite o novo e-mail'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMessage('✅ E-mail de confirmação enviado! Verifique sua caixa de entrada.');
      setNewEmail('');
    } catch (error: any) { setEmailMessage(`❌ Erro: ${error.message}`); }
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCloudData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Pending Tarefas
      const { data: tarefas } = await supabase
        .from('tarefas')
        .select('id, text')
        .eq('user_id', user.id)
        .eq('completed', false)
        .eq('due_date', todayStr);
      setPendingTarefas(tarefas?.length || 0);

      // 2. Pending Estudos
      const estudosRaw = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
      const estudos = Array.isArray(estudosRaw) ? estudosRaw : [];
      const pendingStudyTasks = estudos.filter((t: any) => t.date === todayStr && !t.done).length;

      const scheduledRaw = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');
      const scheduled = Array.isArray(scheduledRaw) ? scheduledRaw : [];
      const pendingScheduled = scheduled.filter((s: any) => {
        const sDate = s.date?.split('T')[0];
        return sDate === todayStr && s.status !== 'realizado';
      }).length;
      setPendingEstudos(pendingStudyTasks + pendingScheduled);

      // 3. Pending Saude
      const { data: saude } = await supabase
        .from('saude_treinos')
        .select('id, type')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .eq('status', 'planejado');
      setPendingSaude(saude?.length || 0);

      // 4. Finance Balance
      const currentMonthStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
      const { data: financas } = await supabase
        .from('financas_transacoes')
        .select('type, amount')
        .eq('user_id', user.id)
        .like('date', `${currentMonthStr}%`);

      let calculatedBalance = 0;
      if (financas) {
        const entradas = financas.filter(t => t.type === 'entrada').reduce((acc, t) => acc + Number(t.amount), 0);
        const saidas = financas.filter(t => t.type === 'saida').reduce((acc, t) => acc + Number(t.amount), 0);
        calculatedBalance = entradas - saidas;
        setFinanceBalance(calculatedBalance);
      } else {
        setFinanceBalance(0);
      }

      // 5. Finance Pending SAÍDAS for today or earlier (overdue)
      const { data: pendingFinanceTx } = await supabase
        .from('financas_transacoes')
        .select('id, name, amount, type')
        .eq('user_id', user.id)
        .eq('pending', true)
        .eq('type', 'saida')
        .lte('date', todayStr);
      
      const countPending = pendingFinanceTx?.length || 0;
      setPendingFinanceCount(countPending);

      generateNotifications({
        todayStr,
        tarefas: (tarefas || []) as { id: string; text: string }[],
        pendingEstudos: pendingStudyTasks + pendingScheduled,
        saude: (saude || []) as { id: string; type: string }[],
        balance: calculatedBalance,
        pendingFinance: (pendingFinanceTx || []) as { id: string; name: string; amount: number; type: string }[]
      });
    };

    fetchCloudData().catch(err => console.error('Error fetching hub data:', err));
  }, [todayStr, currentTime]);

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const displayedNotifications = notifications.filter(n => n.date === todayStr || !n.read);
  const unreadCount = displayedNotifications.filter(n => !n.read).length;

  // Habit Report calculations
  const getLast7Days = () => {
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
  const last7Days = getLast7Days();

  // Habit consistency calculations
  let last7DaysCompletions = 0;
  const last7DaysTotalPossible = last7Days.length * habits.length;
  last7Days.forEach(day => {
    const completedOnDay = habitHistory[day.dateStr] || [];
    const activeCompleted = completedOnDay.filter(id => habits.some(h => h.id === id)).length;
    last7DaysCompletions += activeCompleted;
  });
  const last7DaysRate = last7DaysTotalPossible > 0 ? Math.round((last7DaysCompletions / last7DaysTotalPossible) * 100) : 0;

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

  const totalCompletions = Object.values(habitHistory).reduce((acc, list) => {
    return acc + list.filter(id => habits.some(h => h.id === id)).length;
  }, 0);

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
        dayNum: date.getDate(),
        rate,
        completed,
        total
      });
    }
    return list;
  };
  const last30DaysList = getDaysInMonthList();

  return (
    <div 
      className={`min-h-screen ${bgType === 'default' ? 'bg-zinc-50 dark:bg-zinc-950' : 'bg-transparent'} flex flex-col relative overflow-hidden transition-colors duration-300`}
    >

      {/* Top bar */}
      <header className="relative z-20 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Brain size={18} className="text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-zinc-800 dark:text-white uppercase tracking-widest leading-none">
              Conscientemente
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0 leading-none">
                {timeStr}
              </span>
              <span className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-600 shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 capitalize leading-none whitespace-nowrap">
                {dateStr}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Button & Popover */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => {
                setShowNotificationsPopover(!showNotificationsPopover);
                requestNotificationPermission();
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all hover:scale-105 hover:shadow-sm"
              title="Notificações"
            >
              <Bell size={15} className={unreadCount > 0 ? "animate-pulse text-rose-500" : ""} />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-455 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 text-[7px] font-black text-white items-center justify-center">
                  {unreadCount}
                </span>
              </span>
            )}

            {showNotificationsPopover && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-750 dark:text-zinc-300">Notificações</span>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[9px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
                      >
                        Ler todas
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-rose-500 transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {displayedNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                      Nenhuma notificação por enquanto.
                    </div>
                  ) : (
                    displayedNotifications.map(n => {
                      const notifTitle = n.title || 'Alerta';
                      const notifDesc = n.description || '';
                      const notifTime = n.timestamp ? new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            n.read
                              ? 'bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-100 dark:border-zinc-900/50 opacity-60'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-805 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700'
                          } relative group/item`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0 inline-block" />}
                                <p className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 leading-tight truncate">
                                  {notifTitle}
                                </p>
                              </div>
                              <p className="text-[10px] text-zinc-550 dark:text-zinc-400 mt-0.5 leading-snug break-words font-medium">
                                {notifDesc}
                              </p>
                              {notifTime && (
                                <p className="text-[8px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
                                  {notifTime}
                                </p>
                              )}
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="opacity-0 group-hover/item:opacity-100 text-[8px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 hover:underline shrink-0 self-center transition-all px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800"
                              >
                                Lido
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { setShowSettingsModal(true); fetchLogs(); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all hover:scale-105 hover:shadow-sm"
            title="Configurações"
          >
            <Settings size={15} />
          </button>

          <button
            onClick={() => setShowProfileModal(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all hover:scale-105 hover:shadow-sm"
            title="Preferências de Usuário"
          >
            <User size={15} />
          </button>

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all hover:scale-105 hover:shadow-sm"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-all hover:scale-105 hover:border-rose-300 dark:hover:border-rose-800 hover:shadow-sm"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className={`relative z-10 flex-1 ${showHabitsReport ? 'max-w-4xl' : 'max-w-2xl'} mx-auto w-full px-6 py-10 flex flex-col transition-all duration-300`}>

        {showHabitsReport ? (
          /* ── Habits Report ─────────────────────────────────────── */
          <div className="animate-in fade-in duration-300 flex flex-col gap-6 w-full">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
              <button
                onClick={() => setShowHabitsReport(false)}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                <ChevronLeft size={14} /> Voltar
              </button>
              <div className="text-right">
                <h2 className="text-base font-black text-zinc-800 dark:text-white uppercase tracking-widest leading-none">Relatório de Hábitos</h2>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold mt-1">Clique nos dias abaixo para registrar/desmarcar retroativamente</p>
              </div>
            </div>

            {/* Stats – 4 cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Consistência', value: `${last7DaysRate}%`, sub: 'últimos 7 dias', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50', icon: '📊' },
                { label: 'Streak atual', value: `${currentStreak}d`, sub: 'dias seguidos', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50', icon: '🔥' },
                { label: 'Hábitos ativos', value: habits.length, sub: 'monitorados', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900/50', icon: '✅' },
                { label: 'Conclusões', value: totalCompletions, sub: 'no histórico', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50', icon: '🏆' },
              ].map(stat => (
                <div key={stat.label} className={`p-4 rounded-2xl border ${stat.bg} flex flex-col gap-1`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                    <span className="text-base leading-none">{stat.icon}</span>
                  </div>
                  <span className={`text-2xl font-black ${stat.color} leading-none`}>{stat.value}</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{stat.sub}</span>
                </div>
              ))}
            </div>

            {/* Calendar heatmap — 15 cols × 2 rows */}
            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={13} className="text-indigo-500" /> Mapa de Consistência — Últimos 30 Dias
                </h4>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                  <span>Menos</span>
                  <div className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="w-3 h-3 rounded bg-indigo-200 dark:bg-indigo-900/60" />
                  <div className="w-3 h-3 rounded bg-indigo-400 dark:bg-indigo-600/80" />
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-indigo-500 to-violet-600" />
                  <span>Mais</span>
                </div>
              </div>
              <div className="grid gap-2 grid-cols-15" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                {last30DaysList.map(day => {
                  let cell = 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400';
                  if (day.rate > 0 && day.rate <= 0.33) cell = 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-500';
                  else if (day.rate > 0.33 && day.rate <= 0.66) cell = 'bg-indigo-300 dark:bg-indigo-700/70 text-white';
                  else if (day.rate > 0.66 && day.rate < 1) cell = 'bg-indigo-500 dark:bg-indigo-500/90 text-white';
                  else if (day.rate === 1) cell = 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20';
                  const isToday = day.dateStr === todayStr;
                  return (
                    <div
                      key={day.dateStr}
                      title={`${day.dateStr}: ${day.completed}/${day.total} hábitos concluídos`}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-default ${cell} ${isToday ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-zinc-900' : ''}`}
                    >
                      <span className="text-[11px] font-black leading-none">{day.dayNum}</span>
                      {day.total > 0 && (
                        <span className="text-[8px] font-bold opacity-75 leading-none">{day.completed}/{day.total}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-habit section — full width rows with larger interactive cells */}
            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 flex flex-col gap-4">
              <h4 className="text-xs font-black text-zinc-650 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <Award size={13} className="text-indigo-500" /> Desempenho por Hábito — Últimos 7 dias
                <span className="ml-auto text-[10px] text-indigo-500 dark:text-indigo-400 font-bold normal-case tracking-normal">Dica: clique nos botões abaixo para marcar/desmarcar o hábito no dia</span>
              </h4>

              <div className="flex flex-col gap-3">
                {habits.map(h => {
                  const habitTotal = Object.values(habitHistory).filter(list => list.includes(h.id)).length;
                  const habit7DayCount = last7Days.filter(day => (habitHistory[day.dateStr] || []).includes(h.id)).length;
                  const habit7DayRate = Math.round((habit7DayCount / 7) * 100);
                  const rateColor = habit7DayRate >= 70 ? 'bg-emerald-500' : habit7DayRate >= 40 ? 'bg-indigo-500' : 'bg-rose-400';
                  const textColor = habit7DayRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : habit7DayRate >= 40 ? 'text-indigo-500 dark:text-indigo-400' : 'text-rose-500';
                  return (
                    <div key={h.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-150 dark:border-zinc-700/60 shadow-sm">
                      {/* Name row */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">{h.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium">{habitTotal} conclusões totais</span>
                          <span className={`text-sm font-black ${textColor}`}>{habit7DayRate}%</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${rateColor}`} style={{ width: `${habit7DayRate}%` }} />
                      </div>

                      {/* 7-day clickable cells */}
                      <div className="grid grid-cols-7 gap-2 mt-1">
                        {last7Days.map(day => {
                          const done = (habitHistory[day.dateStr] || []).includes(h.id);
                          const isToday = day.dateStr === todayStr;
                          return (
                            <button
                              key={day.dateStr}
                              onClick={() => toggleHabitOnDate(h.id, day.dateStr)}
                              title={`${day.label} ${day.dayNum} — ${done ? 'Clique para desmarcar' : 'Clique para marcar como concluído'}`}
                              type="button"
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                done
                                  ? 'bg-gradient-to-b from-indigo-500 to-violet-600 border-indigo-400 shadow-md shadow-indigo-500/20 text-white'
                                  : isToday
                                    ? 'bg-white dark:bg-zinc-800 border-indigo-300 dark:border-indigo-750 hover:border-indigo-400'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                              }`}
                            >
                              <span className={`text-[10px] font-black uppercase tracking-wider ${done ? 'text-indigo-100' : isToday ? 'text-indigo-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                {day.label}
                              </span>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${done ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-700/80'}`}>
                                {done
                                  ? <Check size={16} strokeWidth={3} className="text-white animate-in zoom-in-50 duration-200" />
                                  : <span className={`text-xs font-black ${isToday ? 'text-indigo-500' : 'text-zinc-550 dark:text-zinc-400'}`}>{day.dayNum}</span>
                                }
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Hero section */}
            <div className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Status pills — wraps to next line if needed, no horizontal scroll */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Estudos */}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${
              pendingEstudos > 0
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                : 'bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm text-zinc-500 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-800/50 font-bold'
            }`}>
              <BookOpen size={11} />
              Estudos {pendingEstudos > 0 ? '⏳' : '✓'}
            </span>

            {/* Tarefas */}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${
              pendingTarefas > 0
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                : 'bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm text-zinc-500 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-800/50 font-bold'
            }`}>
              <ListTodo size={11} />
              Tarefas {pendingTarefas > 0 ? '⏳' : '✓'}
            </span>

            {/* Treinos */}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${
              pendingSaude > 0
                ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20'
                : 'bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm text-zinc-500 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-800/50 font-bold'
            }`}>
              <HeartPulse size={11} />
              Treinos {pendingSaude > 0 ? '⏳' : '✓'}
            </span>

            {/* Saldo */}
            {financeBalance !== null && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${
                financeBalance >= 0
                  ? 'bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm text-zinc-550 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-800/50 font-bold'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              }`}>
                <Wallet size={11} className={financeBalance >= 0 ? 'text-zinc-400 dark:text-zinc-550' : ''} />
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financeBalance)}
              </span>
            )}

            {/* Pendências financeiras (só aparece se houver) */}
            {pendingFinanceCount > 0 && (
              <button
                onClick={() => window.location.hash = 'financas'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-md shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
                title={`${pendingFinanceCount} ${pendingFinanceCount === 1 ? 'lançamento pendente' : 'lançamentos pendentes'} (Clique para ver)`}
              >
                <Wallet size={11} />
                <span>{pendingFinanceCount} Pendente{pendingFinanceCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>

        {/* Habit Tracker Section */}
        <div className="mb-8 p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800/80 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                <ClipboardList size={13} className="text-indigo-500" />
                Hábitos de Hoje
              </h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Mantenha sua rotina consistente</p>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowHabitsReport(true)}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-155 dark:border-indigo-900/40 transition-colors"
                title="Ver Relatório Completo"
              >
                <BarChart3 size={11} /> Relatório
              </button>
              <button
                onClick={() => setShowManageHabits(!showManageHabits)}
                className="text-[9px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-155 dark:border-indigo-900/40 transition-colors"
              >
                {showManageHabits ? 'Fechar' : 'Gerenciar'}
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {habits.length > 0 && (
            <div className="mb-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>Progresso</span>
                <span>
                  {habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length} de {habits.length} ({Math.round((habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length / habits.length) * 100)}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
                  style={{ width: `${(habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length / habits.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Manage Habits view */}
          {showManageHabits && (
            <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Meus Hábitos</p>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {habits.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 text-center py-2">Nenhum hábito cadastrado.</p>
                ) : (
                  habits.map(h => (
                    <div key={h.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-150 dark:border-zinc-800/80 animate-in fade-in duration-200">
                      <span className="text-[11px] font-medium text-zinc-750 dark:text-zinc-300">{h.name}</span>
                      <button
                        onClick={() => deleteHabit(h.id)}
                        className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                        title="Excluir hábito"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-1.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                <input
                  type="text"
                  placeholder="Novo hábito (ex: Meditar)"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addHabit(newHabitName); setNewHabitName(''); } }}
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-800 dark:text-white"
                />
                <button
                  onClick={() => { addHabit(newHabitName); setNewHabitName(''); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          )}

          {/* List of habits checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {habits.length === 0 ? (
              <div className="col-span-2 py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Você não possui hábitos definidos. Clique em "Gerenciar" para criar.
              </div>
            ) : (
              habits.map(h => {
                const isCompleted = (habitHistory[todayStr] || []).includes(h.id);
                return (
                  <div
                    key={h.id}
                    onClick={() => toggleHabit(h.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isCompleted
                        ? 'bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-150 dark:border-zinc-900/50 opacity-60'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-md'
                    }`}
                  >
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
                      }`}>
                        {isCompleted && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold transition-all truncate leading-none ${
                      isCompleted
                        ? 'line-through text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {h.name}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Módulos</p>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {MODULES.map((mod, i) => (
            <ModuleCard key={mod.id} module={mod} index={i} />
          ))}
        </div>

          </>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">
            Conscientemente · v0.1 · Seu sistema operacional pessoal
          </p>
        </div>
      </main>

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
             <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 z-10 text-zinc-400 hover:text-rose-500 bg-zinc-100 dark:bg-zinc-800 rounded-full p-2"><X size={16} /></button>
             <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
               <h2 className="text-xl font-black uppercase tracking-widest text-zinc-800 dark:text-white flex items-center gap-2"><Settings size={20} /> Configurações Gerais - Logs do Sistema</h2>
             </div>
             <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                   <h3 className="font-bold text-lg flex items-center gap-2">📦 Backup de Dados</h3>
                   <p className="text-sm text-zinc-500 leading-relaxed">Exporte ou importe seus dados do Supabase.</p>
                   <div className="flex flex-col gap-3">
                     <button onClick={handleExport} disabled={isExporting} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-900 dark:hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50">
                       {isExporting ? '⏳ Exportando...' : '📤 Exportar JSON'}
                     </button>
                     <button onClick={() => fileRef.current?.click()} disabled={isImporting} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50">
                       {isImporting ? '⏳ Importando...' : '📥 Importar JSON'}
                     </button>
                     <input type="file" ref={fileRef} onChange={handleImport} className="hidden" accept=".json" />
                   </div>
                 </div>
                 
                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                   <h3 className="font-bold text-lg flex items-center gap-2">☁️ Sincronização</h3>
                   <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex justify-between items-center border border-emerald-100 dark:border-emerald-800">
                     <div>
                       <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Status</p>
                       <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">Conectado ao Supabase</p>
                     </div>
                     <span className="text-2xl">✅</span>
                   </div>
                   <p className="text-xs text-zinc-500">Seus dados estão sendo salvos automaticamente na nuvem.</p>
                 </div>
                 
                 <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 shadow-sm space-y-6 md:col-span-2">
                   <h3 className="font-bold text-lg flex items-center gap-2 text-rose-600 dark:text-rose-400">🚨 Zona de Perigo</h3>
                   <button onClick={handleResetAllData} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95">
                     🔥 FÁBRICA: Resetar Tudo
                   </button>
                 </div>
               </div>

               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
                 <h3 className="font-bold text-lg flex items-center gap-2 mb-6">📝 Logs do Sistema</h3>
                 <LogView logs={logs} onClearLogs={handleClearLogs} onDeleteLog={handleDeleteLog} />
               </div>
             </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-y-auto p-8 relative animate-in zoom-in-95 custom-scrollbar">
             <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-rose-500 bg-zinc-100 dark:bg-zinc-800 rounded-full p-2"><X size={16} /></button>
             <h2 className="text-xl font-black uppercase tracking-widest text-zinc-800 dark:text-white mb-6 flex items-center gap-2"><User size={20} /> Preferências de Usuário</h2>
             
             <div className="space-y-6">
               <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xl font-black shadow-lg">
                    {userName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-white">{userName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Usuário Autenticado</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                 <div className="space-y-4">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alterar Senha</p>
                   <div className="space-y-3">
                     <input type="password" placeholder="Nova Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
                     <input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
                     <button onClick={handlePasswordChange} className="w-full bg-zinc-900 dark:bg-zinc-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-600">Alterar Senha</button>
                     {passwordMessage && <p className="text-xs font-bold text-rose-500">{passwordMessage}</p>}
                   </div>
                 </div>

                 <div className="space-y-4">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alterar E-mail</p>
                   <div className="space-y-3">
                     <input type="email" placeholder="Novo E-mail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
                     <button onClick={handleEmailChange} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700">Alterar E-mail</button>
                     {emailMessage && <p className="text-xs font-bold text-emerald-500">{emailMessage}</p>}
                   </div>
                 </div>
               </div>

               <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Personalização de Fundo</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button onClick={() => setBgType('default')} className={`p-4 rounded-2xl border transition-all ${bgType === 'default' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}`}>
                     <span className="text-xs font-black uppercase tracking-widest">Padrão</span>
                   </button>
                   
                   <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-3 ${bgType === 'color' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'}`}>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${bgType === 'color' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400'}`}>Cor Sólida</span>
                     <div className="flex items-center gap-2 w-full">
                       <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setBgType('color'); }} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                       <span className="text-xs font-mono text-zinc-500">{bgColor}</span>
                     </div>
                   </div>

                   <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-3 hidden`}>
                     <span className={`text-[10px] font-black uppercase tracking-widest flex items-center justify-between w-full text-zinc-600 dark:text-zinc-400`}>
                       <span>Imagem</span>
                       {false && (
                         <button onClick={() => {}} className="text-[9px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors">
                           'Preencher'
                         </button>
                       )}
                     </span>
                     <button onClick={() => {}} className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-3 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">Selecionar</button>
                     <input type="file" onChange={() => {}} accept="image/*" className="hidden" />
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubHome;
