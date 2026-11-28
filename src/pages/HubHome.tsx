import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MODULES } from '../constants';
import { Module } from '../types';
import type { LogEntry, ScheduledStudy } from '../modules/estudos/types';
import { getAgendaScheduledStudies } from '../modules/estudos/utils/persistence';
import { parseNotesGroup } from '../modules/estudos/utils/studyNotes';
import { getLocalDateString } from '../utils/dateUtils';
import { openAgendaTarget } from '../hooks/useAgendaTarget';
import { LogOut, Sun, Moon, ArrowUpRight, Lock, BookOpen, Wallet, ListTodo, Brain, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Sliders, Activity, TrendingUp, Settings, User, X, HeartPulse, Bell, Plus, Trash2, Check, ClipboardList, BarChart3, Calendar, Award, CheckCircle2, StickyNote, Flame, Clock, DollarSign, Database, Cloud, AlertTriangle, FileText, CalendarDays, Menu, Trophy, AlertCircle, Eye, EyeOff, Target } from 'lucide-react';
import { api } from '../modules/estudos/services/api';
import { supabase } from '../modules/estudos/services/supabase';
import { playSound } from '../utils/audio';
import FaviconIcon from '../components/FaviconIcon';
import { backupService } from '../services/backupService';

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
  color?: string;
}

interface HubHomeProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
  bgType: 'default' | 'color' | 'image';
  isHomeEditMode: boolean;
  setIsHomeEditMode: (val: boolean) => void;
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
  violet: {
    gradient: 'from-violet-500 to-fuchsia-600',
    glow: 'hover:shadow-violet-500/25 dark:hover:shadow-violet-500/20',
    badge: 'bg-violet-100 text-violet-750 dark:bg-violet-500/15 dark:text-violet-300',
    icon: 'bg-violet-100 dark:bg-violet-500/20 text-violet-650 dark:text-violet-400',
    border: 'hover:border-violet-400/50 dark:hover:border-violet-500/40',
    ring: 'group-hover:ring-violet-400/30 dark:group-hover:ring-violet-500/20',
  },
  spacegray: {
    gradient: 'from-slate-500 to-zinc-700',
    glow: 'hover:shadow-slate-500/25 dark:hover:shadow-slate-500/20',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    icon: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400',
    border: 'hover:border-slate-400/50 dark:hover:border-slate-500/40',
    ring: 'group-hover:ring-slate-400/30 dark:group-hover:ring-slate-500/20',
  },
};


const iconMap: Record<string, React.ReactNode> = {
  estudos: <BookOpen size={20} strokeWidth={2} />,
  financas: <Wallet size={20} strokeWidth={2} />,
  saude: <Activity size={20} strokeWidth={2} />,
  tarefas: <ListTodo size={20} strokeWidth={2} />,
  anotacoes: <StickyNote size={20} strokeWidth={2} />,
  habitos: <Flame size={20} strokeWidth={2} />,
};

interface ModuleCardProps {
  module: Module;
  index: number;
  size?: 'normal' | 'wide' | 'full';
  isEditMode: boolean;
  onCycleSize?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragged: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  module, index, isEditMode, onDragStart, onDragOver, onDragEnd, isDragged 
}) => {
  const colors = colorMap[module.color] ?? colorMap.indigo;

  const handleClick = () => {
    if (isEditMode) return;
    if (!module.available) return;
    window.location.hash = module.route;
  };

  return (
    <div
      onClick={handleClick}
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      title={module.description}
      style={{ animationDelay: `${index * 50}ms` }}
      className={[
        'group relative w-full flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 select-none',
        module.available && !isEditMode
          ? 'cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 active:scale-95'
          : '',
        isEditMode ? 'cursor-move ring-2 ring-emerald-500/30' : '',
        isDragged ? 'opacity-40 scale-90' : 'opacity-100',
        !module.available ? 'opacity-40 cursor-not-allowed' : '',
        'animate-in fade-in duration-300',
      ].join(' ')}
    >
      {/* Ícone com a cor definida para o módulo */}
      <div className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${colors.icon} transition-all duration-300 group-hover:scale-110 shadow-xs ${colors.glow}`}>
        {iconMap[module.id] && React.cloneElement(iconMap[module.id] as any, { size: 20, strokeWidth: 2 })}

        {!module.available && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 shadow-xs">
            <Lock size={9} />
          </span>
        )}
      </div>

      {/* Legenda minimalista */}
      <span className="mt-1.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors tracking-tight text-center truncate max-w-full leading-tight">
        {module.label}
      </span>
    </div>
  );
};


const HubHome: React.FC<HubHomeProps> = ({ 
  theme, toggleTheme, onLogout, bgType,
  isHomeEditMode, setIsHomeEditMode 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingTarefas, setPendingTarefas] = useState(0);
  const [pendingEstudos, setPendingEstudos] = useState(0);
  const [pendingSaude, setPendingSaude] = useState(0);
  const [financeBalance, setFinanceBalance] = useState<number | null>(null);
  const [pendingFinanceCount, setPendingFinanceCount] = useState(0);
  const [tomorrowTasks, setTomorrowTasks] = useState<{ id: string; text: string; dueTime?: string; category?: string }[]>([]);
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('cn_push_notifications_enabled') === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('cn_sound_enabled') !== 'false';
  });
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cn_notified_task_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [mounted, setMounted] = useState(false);

  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>(() => {
    return (localStorage.getItem('cn_global_alignment') as any) || 'center';
  });

  const [widgetsOrder, setWidgetsOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cn_home_widgets_order');
      return saved ? JSON.parse(saved) : ['calendar', 'habits', 'sleep'];
    } catch {
      return ['calendar', 'habits', 'sleep'];
    }
  });

  const [widgetsVisibility, setWidgetsVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('cn_home_widgets_visibility');
      return saved ? JSON.parse(saved) : { calendar: true, habits: true, sleep: true };
    } catch {
      return { calendar: true, habits: true, sleep: true };
    }
  });

  const visibleWidgets = widgetsOrder.filter(id => widgetsVisibility[id] !== false || isHomeEditMode);
  const modulesRow = Math.max(0, visibleWidgets.indexOf('calendar')) + 1;

  const toggleWidgetVisibility = (id: string) => {
    setWidgetsVisibility(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('cn_home_widgets_visibility', JSON.stringify(next));
      window.dispatchEvent(new Event('local-layout-changed'));
      return next;
    });
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = widgetsOrder.indexOf(id);
    if (index === -1) return;
    const newOrder = [...widgetsOrder];
    if (direction === 'up' && index > 0) {
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = id;
    } else if (direction === 'down' && index < widgetsOrder.length - 1) {
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = id;
    }
    setWidgetsOrder(newOrder);
    localStorage.setItem('cn_home_widgets_order', JSON.stringify(newOrder));
    // Usa 'local-layout-changed' (não 'local-settings-changed') para não disparar
    // refetch de dados do calendário — mudança de layout não requer queries ao Supabase.
    window.dispatchEvent(new Event('local-layout-changed'));
  };

  const handleSetAlignment = (align: 'left' | 'center' | 'right') => {
    setAlignment(align);
    localStorage.setItem('cn_global_alignment', align);
    // Usa 'local-layout-changed' (não 'local-settings-changed') para não disparar
    // refetch de dados do calendário — mudança de alinhamento não requer queries ao Supabase.
    window.dispatchEvent(new Event('local-layout-changed'));
  };

  useEffect(() => {
    const handleSettingsChange = () => {
      const val = (localStorage.getItem('cn_global_alignment') as any) || 'center';
      setAlignment(val);
      try {
        const savedOrder = localStorage.getItem('cn_home_widgets_order');
        if (savedOrder) {
          setWidgetsOrder(JSON.parse(savedOrder));
        }
        const savedVisibility = localStorage.getItem('cn_home_widgets_visibility');
        if (savedVisibility) {
          setWidgetsVisibility(JSON.parse(savedVisibility));
        }
      } catch (e) {
        console.error('Error parsing home widget state on sync:', e);
      }
    };
    // Escuta ambos os eventos: 'local-layout-changed' (layout/alinhamento) e
    // 'local-storage-sync' (sync remoto). 'local-settings-changed' foi intencionalmente
    // removido aqui para evitar re-renders em cascata desnecessários.
    window.addEventListener('local-storage-sync', handleSettingsChange);
    window.addEventListener('local-layout-changed', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);
    return () => {
      window.removeEventListener('local-storage-sync', handleSettingsChange);
      window.removeEventListener('local-layout-changed', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  const [sleepOpacity, setSleepOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('cn_sleep_opacity');
    return saved ? parseFloat(saved) : 0.95;
  });
  const [isSleepHovered, setIsSleepHovered] = useState(false);
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);

  const loadSleepLogs = useCallback(() => {
    try {
      const saved = localStorage.getItem('cn_saude_sleep_logs');
      if (saved) {
        setSleepLogs(JSON.parse(saved));
      } else {
        setSleepLogs([]);
      }
    } catch (e) {
      console.error('Error loading sleep logs:', e);
    }
  }, []);

  useEffect(() => {
    loadSleepLogs();
  }, [loadSleepLogs]);

  const [showAddSleepModal, setShowAddSleepModal] = useState(false);
  const [sleepFormDate, setSleepFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sleepDeepH, setSleepDeepH] = useState('1');
  const [sleepDeepM, setSleepDeepM] = useState('30');
  const [sleepLightH, setSleepLightH] = useState('4');
  const [sleepLightM, setSleepLightM] = useState('0');
  const [sleepRemH, setSleepRemH] = useState('1');
  const [sleepRemM, setSleepRemM] = useState('30');
  const [sleepAwakeH, setSleepAwakeH] = useState('0');
  const [sleepAwakeM, setSleepAwakeM] = useState('15');
  const [sleepNotes, setSleepNotes] = useState('');

  const getSleepLogStats = (log: any) => {
    const totalMin = log ? (log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes) : 0;
    const totalHours = Number((totalMin / 60).toFixed(1));
    const score = log ? (() => {
      const total = log.deepMinutes + log.lightMinutes + log.remMinutes + log.awakeMinutes;
      if (total === 0) return 0;
      const deepPct = log.deepMinutes / total;
      const remPct = log.remMinutes / total;
      const awakePct = log.awakeMinutes / total;
      let sc = 100;
      if (awakePct > 0.1) sc -= (awakePct - 0.1) * 150;
      if (deepPct < 0.18) sc -= (0.18 - deepPct) * 120;
      if (remPct < 0.18) sc -= (0.18 - remPct) * 100;
      const totalHours = total / 60;
      if (totalHours < 7) sc -= (7 - totalHours) * 15;
      else if (totalHours > 9.5) sc -= (totalHours - 9.5) * 8;
      return Math.max(0, Math.min(100, Math.round(sc)));
    })() : 0;
    return { totalHours, score };
  };

  const sleepChartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const log = sleepLogs.find((l: any) => l.date === dStr);
      const { totalHours, score } = getSleepLogStats(log);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      data.push({ label, horas: totalHours, score });
    }
    return data;
  }, [sleepLogs]);

  const handleAddSleepLog = (e: React.FormEvent) => {
    e.preventDefault();
    const deep = (parseInt(sleepDeepH) || 0) * 60 + (parseInt(sleepDeepM) || 0);
    const light = (parseInt(sleepLightH) || 0) * 60 + (parseInt(sleepLightM) || 0);
    const rem = (parseInt(sleepRemH) || 0) * 60 + (parseInt(sleepRemM) || 0);
    const awake = (parseInt(sleepAwakeH) || 0) * 60 + (parseInt(sleepAwakeM) || 0);
    
    if (deep + light + rem + awake === 0) {
      alert('Por favor, preencha os tempos de sono.');
      return;
    }

    const newLog = {
      id: crypto.randomUUID(),
      date: sleepFormDate,
      deepMinutes: deep,
      lightMinutes: light,
      remMinutes: rem,
      awakeMinutes: awake,
      notes: sleepNotes
    };

    const saved = localStorage.getItem('cn_saude_sleep_logs');
    const logs = saved ? JSON.parse(saved) : [];
    const filteredLogs = logs.filter((l: any) => l.date !== sleepFormDate);
    const updatedLogs = [...filteredLogs, newLog];
    
    localStorage.setItem('cn_saude_sleep_logs', JSON.stringify(updatedLogs));
    
    setSleepNotes('');
    setShowAddSleepModal(false);
    
    loadSleepLogs();
    window.dispatchEvent(new Event('local-storage-sync'));
    window.dispatchEvent(new Event('local-settings-changed'));
  };


  // Estados do Calendário Unificado
  const [calendarCollapsed, setCalendarCollapsed] = useState(() => {
    return localStorage.getItem('cn_calendar_collapsed') === 'true';
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<{
    tasks: any[];
    studies: any[];
    workouts: any[];
    finances: any[];
    notes: { id: string; title: string; date: string; category: string }[];
  }>({ tasks: [], studies: [], workouts: [], finances: [], notes: [] });
  const [calendarUnavailableSources, setCalendarUnavailableSources] = useState<string[]>([]);
  const [concursoExamDates, setConcursoExamDates] = useState<{ id: string; date: string; name: string }[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [hasPastPendingEvents, setHasPastPendingEvents] = useState(false);
  const changeAgendaMonth = (offset: number) => {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarMonth(date);
    setSelectedCalendarDate(getLocalDateString(date));
  };

  // Opacity states for widgets
  const [calendarOpacity, setCalendarOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('cn_calendar_opacity');
    return saved ? parseFloat(saved) : 0.95;
  });
  const [habitsOpacity, setHabitsOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('cn_habits_opacity');
    return saved ? parseFloat(saved) : 0.95;
  });
  const [isCalendarHovered, setIsCalendarHovered] = useState(false);
  const [isHabitsHovered, setIsHabitsHovered] = useState(false);

  const toggleCalendar = () => {
    setCalendarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('cn_calendar_collapsed', String(next));
      return next;
    });
  };

  const fetchCalendarData = useCallback(async (date: Date, isCurrent: () => boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const windowStartStr = getLocalDateString(new Date(year, month - 2, 1));
      const monthRange = { from: startOfMonth, before: getLocalDateString(new Date(year, month + 1, 1)) };
      const studyRange = { ...monthRange, from: windowStartStr };
      const failedSources = new Set<string>();
      const readSource = async <T,>(label: string, request: PromiseLike<{ data: T; error: unknown }>) => {
        try {
          const { data, error } = await request;
          if (error) throw error;
          return data;
        } catch (error) {
          console.error(`Erro ao consultar ${label} na Agenda Unificada:`, error);
          failedSources.add(label);
          return null;
        }
      };

      const [
        dbTasks, dbWorkouts, dbFinances, dbConcursos, simulados, dbScheduled, dbSessions,
        dbNotes, pastTasksCount
      ] = await Promise.all([
        readSource('Tarefas', supabase.from('tarefas')
          .select('id, text, due_date, completed, due_time, category')
          .eq('user_id', user.id).lte('due_date', endOfMonth)
          .or(`due_date.gte.${startOfMonth},and(due_time.like.range:*,due_time.gte.range:${startOfMonth})`)
          .order('due_date', { ascending: true }).order('id', { ascending: true })),
        readSource('Saúde', supabase.from('saude_treinos')
          .select('id, type, date, status, muscles')
          .eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth)),
        readSource('Finanças', supabase.from('financas_transacoes')
          .select('id, name, amount, type, date, pending')
          .or('type.eq.entrada,and(type.eq.saida,pending.eq.true)')
          .eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth)),
        readSource('Estudos', supabase.from('concursos')
          .select('id, name, target_date, subjects').eq('user_id', user.id)),
        readSource('Estudos', api.simulados.list(monthRange).then(data => ({ data, error: null }))),
        readSource('Estudos', api.schedule.list(studyRange).then(data => ({ data, error: null }))),
        readSource('Estudos', api.sessions.list(monthRange).then(data => ({ data, error: null }))),
        readSource('Anotações', supabase.from('anotacoes')
          .select('id, title, date, category')
          .eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth)),
        readSource('Tarefas', supabase.from('tarefas').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('completed', false).lt('due_date', startOfMonth)
          .then(({ count, error }) => ({ data: count, error })))
      ]);

      if (!isCurrent()) return;

      const subjectMap = new Map<string, any>();
      const subjectToConcursoObjMap = new Map<string, { id: string; name: string }>();
      const concursoById = new Map((dbConcursos || []).map(concurso => [concurso.id, concurso]));
      for (const concurso of dbConcursos || []) {
        for (const subject of concurso.subjects || []) {
          subjectMap.set(subject.id, subject);
          subjectToConcursoObjMap.set(subject.id, concurso);
        }
      }


      const readList = <T,>(key: string): T[] => {
        try {
          const value = JSON.parse(localStorage.getItem(key) || '[]');
          return Array.isArray(value) ? value : [];
        } catch {
          return [];
        }
      };

      const deletedIds = new Set([
        ...readList<string>('cp_deleted_scheduled_ids'),
        ...readList<string>('estudos_deleted_review_ids')
      ]);
      const visibleScheduledStudies = getAgendaScheduledStudies(dbScheduled || [], {
        localStudies: readList<ScheduledStudy>('cp_scheduled_studies'),
        sessionIds: new Set((dbSessions || []).map(session => session.id)),
        deletedIds,
        getConcursoId: subjectId => subjectToConcursoObjMap.get(subjectId)?.id,
        areReviewsEnabled: concursoId => {
          if (localStorage.getItem(`estudos_disabled_reviews_${concursoId}`) === 'true') return false;
          try {
            return !JSON.parse(localStorage.getItem('estudos_disabled_reviews_map') || '{}')[concursoId];
          } catch {
            return true;
          }
        },
        isScheduleEnabled: concursoId => {
          try {
            return JSON.parse(localStorage.getItem(`cp_cronograma_prefs_${concursoId}`) || '{}').isCronogramaEnabled !== false;
          } catch {
            return true;
          }
        }
      });

      const groupedMap = new Map<string, ScheduledStudy[]>();
      const nonGroupedStudies: ScheduledStudy[] = [];

      visibleScheduledStudies.forEach(s => {
        if (s.notes) {
          const { groupId } = parseNotesGroup(s.notes);
          if (groupId) {
            const key = JSON.stringify([s.date, groupId]);
            if (!groupedMap.has(key)) {
              groupedMap.set(key, []);
            }
            groupedMap.get(key)!.push(s);
            return;
          }
        }
        nonGroupedStudies.push(s);
      });

      const groupedStudies = Array.from(groupedMap.values()).map((list): ScheduledStudy => {
        const first = list[0];
        const totalDuration = list.reduce((acc, item) => acc + (item.durationInMinutes || 0), 0);
        return {
          id: first.id,
          activityType: first.activityType,
          durationInMinutes: totalDuration,
          date: first.date,
          status: list.every(item => item.status === 'realizado') ? 'realizado' : 'planejado',
          notes: first.notes,
          subjectId: first.subjectId,
          concursoId: first.concursoId
        };
      });

      const consolidatedStudies = [...nonGroupedStudies, ...groupedStudies];

      const studiesList = [
        ...consolidatedStudies.map(s => {
          const sub = subjectMap.get(s.subjectId);
          const conc = concursoById.get(s.concursoId || '') || subjectToConcursoObjMap.get(s.subjectId);
          const prefix = conc ? `[${conc.name}] ` : '';
          const subjectName = sub ? sub.name : 'Disciplina';
          const isCompleted = s.status === 'realizado';
          const text = !isCompleted
            ? `${prefix}${subjectName} - ${s.activityType} (${s.durationInMinutes || 0} min)`
            : `${s.activityType} (${s.durationInMinutes || 0} min)`;
          return {
            id: s.id,
            text,
            isSimulado: s.activityType === 'Simulado',
            date: s.date,
            completed: isCompleted,
            concursoId: conc?.id || s.concursoId
          };
        }),
        ...(simulados || []).map(sim => ({
          id: sim.id,
          text: `SIMULADO: ${sim.name} (${sim.durationInMinutes || 0} min)`,
          date: sim.date?.split('T')[0] || sim.date,
          completed: true,
          isSimulado: true,
          concursoId: subjectToConcursoObjMap.get(sim.results?.[0]?.subjectId)?.id
        }))
      ].filter(s => s.date >= startOfMonth && s.date <= endOfMonth);

      const parsedTasks = (dbTasks || []).map(t => {
        let endDate: string | undefined = undefined;
        let dueTime = t.due_time || '';
        if (dueTime.startsWith('range:')) {
          endDate = dueTime.substring(6);
          dueTime = '';
        }
        let category = t.category || 'Tarefa';
        if (!t.category || t.category === 'Tarefa') {
          const txt = (t.text || '').toLowerCase();
          if (txt.includes('urgente') || txt.includes('[urgente]') || txt.includes('🔴')) {
            category = 'Urgente';
          } else if (txt.includes('importante') || txt.includes('[importante]') || txt.includes('⭐') || txt.includes('⚠️')) {
            category = 'Importante';
          }
        }
        return {
          ...t,
          due_time: dueTime,
          endDate,
          category
        };
      });

      const deletedNoteIds = new Set(readList<string>('cn_deleted_note_ids'));
      const notesById = new Map([
        ...(dbNotes || []),
        ...readList<(typeof calendarEvents.notes)[number]>('cn_anotacoes')
      ].map(note => [note.id, note]));
      setCalendarEvents({
        tasks: parsedTasks,
        studies: studiesList,
        workouts: dbWorkouts || [],
        finances: dbFinances || [],
        notes: [...notesById.values()].filter(note => !deletedNoteIds.has(note.id) &&
          note.date >= startOfMonth && note.date <= endOfMonth)
      });
      setCalendarUnavailableSources([...failedSources]);

      const examDatesList: typeof concursoExamDates = [];
      if (dbConcursos) {
        dbConcursos.forEach((c: any) => {
          if (c.target_date) {
            examDatesList.push({
              id: c.id,
              date: c.target_date.split('T')[0],
              name: c.name
            });
          }
        });
      }
      setConcursoExamDates(examDatesList);

      const hasPastTasks = (pastTasksCount || 0) > 0;
      
      const hasPastStudies = visibleScheduledStudies.some(study =>
        study.date && study.date < startOfMonth && study.status !== 'realizado'
      );

      setHasPastPendingEvents(hasPastTasks || hasPastStudies);
    } catch (e) {
      console.error('Error fetching calendar data:', e);
      if (isCurrent()) setCalendarUnavailableSources(['Agenda Unificada']);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = () => {
      const requested = ++revision;
      fetchCalendarData(calendarMonth, () => active && requested === revision).catch(console.error);
    };
    refresh();

    let lastFocusSyncAt = Date.now();
    const FOCUS_THROTTLE_MS = 180 * 1000; // 3 minutos

    const handleFocusSync = () => {
      const now = Date.now();
      if (now - lastFocusSyncAt < FOCUS_THROTTLE_MS) return;
      lastFocusSyncAt = now;
      refresh();
    };

    let syncTimer: ReturnType<typeof setTimeout>;
    const handleStorageSync = () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(refresh, 300);
    };
    const readAgendaSettings = () => JSON.stringify([
      'cp_scheduled_studies', 'cp_deleted_scheduled_ids', 'estudos_deleted_review_ids',
      'cp_cronograma_prefs_map', 'estudos_disabled_reviews_map', 'cn_anotacoes', 'cn_deleted_note_ids'
    ].map(key => localStorage.getItem(key)));
    let agendaSettings = readAgendaSettings();
    const handleAgendaSettingsChange = () => {
      const nextSettings = readAgendaSettings();
      if (nextSettings === agendaSettings) return;
      agendaSettings = nextSettings;
      handleStorageSync();
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('local-storage-sync', handleStorageSync);
    window.addEventListener('local-settings-changed', handleAgendaSettingsChange);
    return () => {
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('local-storage-sync', handleStorageSync);
      window.removeEventListener('local-settings-changed', handleAgendaSettingsChange);
      clearTimeout(syncTimer);
      active = false;
    };
  }, [calendarMonth, fetchCalendarData]);

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    return localStorage.getItem('cn_sidebar_expanded') !== 'false';
  });
  const [modulesCollapsed, setModulesCollapsed] = useState(() => {
    return localStorage.getItem('cn_modules_collapsed') === 'true';
  });
  const [widgetsCollapsed, setWidgetsCollapsed] = useState(() => {
    return localStorage.getItem('cn_widgets_collapsed') === 'true';
  });

  const [homeCards, setHomeCards] = useState<{ id: string; size: 'normal' | 'wide' | 'full' }[]>(() => {
    const saved = localStorage.getItem('cn_home_cards_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ids = parsed.map(c => c.id);
          const missing = MODULES.filter(m => !ids.includes(m.id)).map(m => ({ id: m.id, size: 'normal' as const }));
          const filtered = parsed.filter(c => MODULES.some(m => m.id === c.id));
          return [...filtered, ...missing];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return MODULES.map(m => ({ id: m.id, size: 'normal' as const }));
  });

  useEffect(() => {
    localStorage.setItem('cn_home_cards_layout', JSON.stringify(homeCards));
  }, [homeCards]);

  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);

  const handleCardDragStart = (index: number) => {
    setDraggedCardIndex(index);
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCardIndex === null || draggedCardIndex === index) return;

    const newCards = [...homeCards];
    const draggedItem = newCards[draggedCardIndex];
    newCards.splice(draggedCardIndex, 1);
    newCards.splice(index, 0, draggedItem);

    setHomeCards(newCards);
    setDraggedCardIndex(index);
  };

  const handleCardDragEnd = () => {
    setDraggedCardIndex(null);
  };

  const cycleCardSize = (id: string) => {
    setHomeCards(prev => prev.map(c => {
      if (c.id === id) {
        const sizes: ('normal' | 'wide' | 'full')[] = ['normal', 'wide', 'full'];
        const nextIdx = (sizes.indexOf(c.size) + 1) % sizes.length;
        return { ...c, size: sizes[nextIdx] };
      }
      return c;
    }));
  };

  const toggleSidebar = () => {
    setSidebarExpanded(prev => {
      const next = !prev;
      localStorage.setItem('cn_sidebar_expanded', String(next));
      return next;
    });
  };

  const toggleModules = () => {
    setModulesCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('cn_modules_collapsed', String(next));
      return next;
    });
  };

  const toggleWidgets = () => {
    setWidgetsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('cn_widgets_collapsed', String(next));
      return next;
    });
  };


  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('cn_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [clearedNotifications, setClearedNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cn_cleared_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);

  // Quick Notes state
  const [quickNoteTab, setQuickNoteTab] = useState<'Anotações' | 'Diário de Leitura'>('Anotações');
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
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
  const selectedNotes = calendarEvents.notes.filter(note => note.date === selectedCalendarDate);

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
        
        let clearedList: string[] = [];
        try {
          const savedCleared = localStorage.getItem('cn_cleared_notifications');
          if (savedCleared) clearedList = JSON.parse(savedCleared);
        } catch (e) {}
        
        if (clearedList.includes(id)) return;

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
    const idsToClear = notifications.map(n => n.id);
    try {
      const savedCleared = localStorage.getItem('cn_cleared_notifications');
      const clearedList: string[] = savedCleared ? JSON.parse(savedCleared) : [];
      const updatedCleared = Array.from(new Set([...clearedList, ...idsToClear]));
      localStorage.setItem('cn_cleared_notifications', JSON.stringify(updatedCleared));
      setClearedNotifications(updatedCleared);
    } catch (e) {
      console.error(e);
    }
    setNotifications([]);
    localStorage.removeItem('cn_notifications');
  };

  const handleSaveQuickNote = () => {
    if (!quickNoteContent.trim()) return;
    
    try {
      const saved = localStorage.getItem('cn_anotacoes');
      const notesList = saved ? JSON.parse(saved) : [];
      
      const today = new Date();
      const dateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      const newNote = {
        id: `note_${Date.now()}`,
        title: quickNoteTitle.trim() || 'Nota Rápida',
        content: quickNoteContent.trim(),
        date: dateStr,
        category: quickNoteTab,
        timestamp: Date.now()
      };
      
      const updatedNotes = [newNote, ...notesList];
      localStorage.setItem('cn_anotacoes', JSON.stringify(updatedNotes));
      
      window.dispatchEvent(new Event('storage'));
      
      setQuickNoteTitle('');
      setQuickNoteContent('');
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 3000);
    } catch (e) {
      console.error('Failed to save quick note:', e);
    }
  };

  const handleGoToAnotacoes = () => {
    sessionStorage.setItem('anotacoesActiveTab', quickNoteTab);
    window.location.hash = 'anotacoes';
  };

  const toggleHabitOnDate = (habitId: string, dateStr: string) => {
    const logs = habitHistory[dateStr] || [];
    const completed = !logs.includes(habitId);
    const updated = {
      ...habitHistory,
      [dateStr]: completed ? [...logs, habitId] : logs.filter(id => id !== habitId)
    };
    setHabitHistory(updated);
    localStorage.setItem('cn_habit_history', JSON.stringify(updated));
    if (completed) playSound.success();
    window.dispatchEvent(new Event('local-settings-changed'));

    api.habits.toggleLog(habitId, dateStr, completed).then(() => {
      window.dispatchEvent(new Event('local-storage-sync'));
    }).catch(err => {
      console.error('Error toggling habit log on date in cloud from home:', err);
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
    const handleExport = async () => {
    setIsExporting(true);
    try {
      await backupService.exportBackup();
      alert('Dados exportados com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao exportar dados.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importar backup completo? Isso sincronizará seus dados de todos os módulos e configurações.')) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setIsImporting(true);
    try {
      const result = await backupService.importBackup(file);
      alert(`Dados importados com sucesso (${result.itemCount} registros sincronizados)! A página será recarregada.`);
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert('Erro ao importar dados: ' + (error?.message || 'Arquivo inválido.'));
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleResetAllData = async () => {
    if (confirm('TEM CERTEZA? Isso apagará TODOS os seus dados permanentemente.') &&
        confirm('Último aviso: Essa ação não pode ser desfeita. Confirmar reset total?')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          await Promise.all([
            supabase.from('concursos').delete().eq('user_id', user.id),
            supabase.from('study_sessions').delete().eq('user_id', user.id),
            supabase.from('simulados').delete().eq('user_id', user.id),
            supabase.from('scheduled_studies').delete().eq('user_id', user.id),
            supabase.from('daily_goals').delete().eq('user_id', user.id),
            supabase.from('logs').delete().eq('user_id', user.id),
            supabase.from('saude_treinos').delete().eq('user_id', user.id),
            supabase.from('financas_transacoes').delete().eq('user_id', user.id),
            supabase.from('tarefas').delete().eq('user_id', user.id),
            supabase.from('user_preferences').delete().eq('user_id', user.id)
          ]);
        }
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cn_') || key.startsWith('cp_') || key.startsWith('isSidebarCollapsed_')) {
            localStorage.removeItem(key);
          }
        });
        alert('Todos os dados foram apagados. O sistema foi resetado.');
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert('Erro ao resetar dados.');
      }
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage('');
    if (!newPassword || !confirmPassword) { setPasswordMessage('Preencha todos os campos'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('As senhas não coincidem'); return; }
    if (newPassword.length < 6) { setPasswordMessage('A senha deve ter pelo menos 6 caracteres'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage('Senha alterada com sucesso!');
      setNewPassword(''); setConfirmPassword('');
    } catch (error: any) { setPasswordMessage(`Erro: ${error.message}`); }
  };

  const handleEmailChange = async () => {
    setEmailMessage('');
    if (!newEmail) { setEmailMessage('Digite o novo e-mail'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMessage('E-mail de confirmação enviado! Verifique sua caixa de entrada.');
      setNewEmail('');
    } catch (error: any) { setEmailMessage(`Erro: ${error.message}`); }
  };

  const handleTogglePushNotifications = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPushEnabled(true);
        localStorage.setItem('cn_push_notifications_enabled', 'true');
        triggerLocalNotification('Notificações Ativas', 'Você receberá alertas das tarefas limite.');
      } else {
        alert('Por favor, autorize a permissão de notificações no seu navegador/dispositivo.');
        setPushEnabled(false);
        localStorage.setItem('cn_push_notifications_enabled', 'false');
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('cn_push_notifications_enabled', 'false');
    }
  };

  const handleToggleSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSoundEnabled(checked);
    localStorage.setItem('cn_sound_enabled', String(checked));
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);
      timer = setTimeout(updateClock, 60_000 - now.getTime() % 60_000);
    };
    updateClock();
    return () => clearTimeout(timer);
  }, []);

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
        const savedCards = localStorage.getItem('cn_home_cards_layout');
        if (savedCards) {
          setHomeCards(JSON.parse(savedCards));
        }
        const savedPush = localStorage.getItem('cn_push_notifications_enabled') === 'true';
        setPushEnabled(savedPush);
        loadSleepLogs();
        // IMPORTANTE: fetchCalendarData foi removido daqui.
        // O refetch do calendário é gerenciado exclusivamente pelo useEffect dedicado
        // que observa 'calendarMonth' (linha ~811). Chamar fetchCalendarData aqui
        // criava um segundo ciclo de 8 queries por evento de sync, multiplicando o egress.
      } catch (e) {
        console.error('Error reloading local storage states on sync event:', e);
      }
    };
    // 'local-storage-sync' → disparado pelo GlobalSidebar e outros módulos
    // 'local-settings-changed' → disparado pelo módulo de estudos ao mudar status
    // Nota: 'local-layout-changed' (moveWidget, handleSetAlignment) é intencionalmente
    // excluído deste handler — mudanças de layout não requerem refetch de dados do Supabase.
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('local-settings-changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('local-settings-changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadSleepLogs]);

  const fetchCloudData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const now = new Date();
    const localTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Executa as queries do Supabase em paralelo com Promise.all para acelerar o carregamento da Home
    const [
      { data: tarefas },
      { data: tTasks },
      { data: saude },
      { data: financas },
      { data: pendingFinanceTx }
    ] = await Promise.all([
      // 1. Pending Tarefas
      supabase
        .from('tarefas')
        .select('id, text')
        .eq('user_id', user.id)
        .eq('completed', false)
        .lte('due_date', localTodayStr),
      // 2. Tomorrow's tasks
      supabase
        .from('tarefas')
        .select('id, text, due_time, category')
        .eq('user_id', user.id)
        .eq('completed', false)
        .eq('due_date', tomorrowStr),
      // 3. Pending Saude
      supabase
        .from('saude_treinos')
        .select('id, type')
        .eq('user_id', user.id)
        .lte('date', localTodayStr)
        .eq('status', 'planejado'),
      // 4. Finance Balance
      supabase
        .from('financas_transacoes')
        .select('type, amount')
        .eq('user_id', user.id)
        .like('date', `${currentMonthStr}%`),
      // 5. Finance Pending SAÍDAS
      supabase
        .from('financas_transacoes')
        .select('id, name, amount, type')
        .eq('user_id', user.id)
        .eq('pending', true)
        .eq('type', 'saida')
        .lte('date', localTodayStr)
    ]);

    setPendingTarefas(tarefas?.length || 0);
    setTomorrowTasks((tTasks || []).map(t => ({ id: t.id, text: t.text, dueTime: t.due_time, category: t.category })));
    setPendingSaude(saude?.length || 0);

    let calculatedBalance = 0;
    if (financas) {
      const entradas = financas.filter(t => t.type === 'entrada').reduce((acc, t) => acc + Number(t.amount), 0);
      const saidas = financas.filter(t => t.type === 'saida').reduce((acc, t) => acc + Number(t.amount), 0);
      calculatedBalance = entradas - saidas;
      setFinanceBalance(calculatedBalance);
    } else {
      setFinanceBalance(0);
    }

    // 2. Pending Estudos (cálculo local otimizado)
    let deletedStudyTaskIds = new Set<string>();
    let estudos: any[] = [];
    try {
      deletedStudyTaskIds = new Set<string>(JSON.parse(localStorage.getItem('cp_deleted_study_task_ids') || '[]'));
      const estudosRaw = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
      estudos = Array.isArray(estudosRaw) ? estudosRaw : [];
    } catch {}
    const pendingStudyTasks = estudos.filter((t: any) => !deletedStudyTaskIds.has(t.id) && t.date <= localTodayStr && !t.done).length;

    let deletedScheduledIds = new Set<string>();
    let scheduled: any[] = [];
    try {
      deletedScheduledIds = new Set<string>(JSON.parse(localStorage.getItem('cp_deleted_scheduled_ids') || '[]'));
      const scheduledRaw = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');
      scheduled = Array.isArray(scheduledRaw) ? scheduledRaw : [];
    } catch {}
    const pendingScheduled = scheduled.filter((s: any) => {
      if (deletedScheduledIds.has(s.id)) return false;
      const sDate = s.date?.split('T')[0];
      if (sDate <= localTodayStr && s.status !== 'realizado') {
        const concId = s.concursoId || s.subjectId;
        if (concId) {
          try {
            const saved = localStorage.getItem(`cp_cronograma_prefs_${concId}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.isCronogramaEnabled === false) return false;
            }
          } catch (e) {}
        }
        return true;
      }
      return false;
    }).length;
    setPendingEstudos(pendingStudyTasks + pendingScheduled);

    const countPending = pendingFinanceTx?.length || 0;
    setPendingFinanceCount(countPending);

    generateNotifications({
      todayStr: localTodayStr,
      tarefas: (tarefas || []) as { id: string; text: string }[],
      pendingEstudos: pendingStudyTasks + pendingScheduled,
      saude: (saude || []) as { id: string; type: string }[],
      balance: calculatedBalance,
      pendingFinance: (pendingFinanceTx || []) as { id: string; name: string; amount: number; type: string }[]
    });
    // Nota: fetchCalendarData é gerenciado pelo próprio useEffect que observa calendarMonth.
    // Não é necessário chamá-lo aqui para evitar queries duplicadas.
    // IMPORTANTE: calendarMonth e fetchCalendarData foram removidos das dependências.
    // fetchCloudData busca dados do dashboard (pendências, notificações) e não deve
    // recriar sua referência a cada navegação de mês do calendário — isso causava
    // re-disparo desnecessário do useEffect abaixo (linha ~1573) com 5 queries extras.
  }, []);

  // Fetch initial data and sync when day changes
  useEffect(() => {
    fetchCloudData().catch(err => console.error('Error fetching hub data:', err));
  }, [todayStr, fetchCloudData]);

  // Periodic poll of cloud data (every 5 minutes — reduzido de 30s para economizar egress do Supabase)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCloudData().catch(err => console.error('Error polling hub data:', err));
    }, 300000); // 5 minutos = 300.000 ms
    return () => clearInterval(interval);
  }, [fetchCloudData]);

  // Immediately refresh pending estudos count and calendar when the estudos module
  // updates its local data (e.g. toggling a study activity as realizado/planejado).
  useEffect(() => {
    const handleEstudosChange = () => {
      try {
        const now = new Date();
        const localTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const deletedStudyTaskIds = new Set<string>(JSON.parse(localStorage.getItem('cp_deleted_study_task_ids') || '[]'));
        const estudosRaw = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
        const estudos = Array.isArray(estudosRaw) ? estudosRaw : [];
        const pendingStudyTasks = estudos.filter((t: any) => !deletedStudyTaskIds.has(t.id) && t.date <= localTodayStr && !t.done).length;

        const deletedScheduledIds = new Set<string>(JSON.parse(localStorage.getItem('cp_deleted_scheduled_ids') || '[]'));
        const scheduledRaw = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');
        const scheduled = Array.isArray(scheduledRaw) ? scheduledRaw : [];
        const pendingScheduled = scheduled.filter((s: any) => {
          if (deletedScheduledIds.has(s.id)) return false;
          const sDate = s.date?.split('T')[0];
          if (sDate && sDate <= localTodayStr && s.status !== 'realizado') {
            const concId = s.concursoId || s.subjectId;
            if (concId) {
              try {
                const saved = localStorage.getItem(`cp_cronograma_prefs_${concId}`);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed.isCronogramaEnabled === false) return false;
                }
              } catch (e) {}
            }
            return true;
          }
          return false;
        }).length;

        setPendingEstudos(pendingStudyTasks + pendingScheduled);
      } catch (e) {
        console.error('Error updating pending estudos count:', e);
      }
    };
    window.addEventListener('local-settings-changed', handleEstudosChange);
    return () => window.removeEventListener('local-settings-changed', handleEstudosChange);
  }, []);

  // Task limit checker running periodically — carrega tarefas 1x por dia, verifica em memória a cada 30s
  useEffect(() => {
    if (!pushEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    // Cache das tarefas de hoje com horário — carregado apenas 1x por dia
    let cachedTodayTasks: { id: string; text: string; due_time: string }[] = [];
    let cachedDayStr = '';

    const loadTodayTasksIfNeeded = async () => {
      const now = new Date();
      const localTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      // Só faz query ao Supabase se o dia mudou ou se ainda não carregou
      if (cachedDayStr === localTodayStr) return;

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data } = await supabase
        .from('tarefas')
        .select('id, text, due_time')
        .eq('user_id', user.id)
        .eq('completed', false)
        .eq('due_date', localTodayStr)
        .neq('due_time', '');

      // Filtra apenas as que têm horário definido (não vazias)
      cachedTodayTasks = (data || []).filter((t: any) => t.due_time && !t.due_time.startsWith('range:'));
      cachedDayStr = localTodayStr;
    };

    const checkLimitTasks = async () => {
      // Carrega do Supabase só se necessário (mudança de dia ou primeiro acesso)
      await loadTodayTasksIfNeeded();
      if (cachedTodayTasks.length === 0) return;

      const now = new Date();
      const currentHourMin = now.toTimeString().slice(0, 5); // HH:MM

      let notifiedIdsList: string[] = [];
      try {
        const saved = localStorage.getItem('cn_notified_task_ids');
        notifiedIdsList = saved ? JSON.parse(saved) : [];
      } catch {}

      let updated = false;
      cachedTodayTasks.forEach(task => {
        // Verifica em memória — sem nova query ao Supabase
        if (task.due_time <= currentHourMin && !notifiedIdsList.includes(task.id)) {
          triggerLocalNotification(
            'Tarefa no Limite! ⏰',
            `A tarefa "${task.text}" chegou ao horário limite (${task.due_time}).`
          );
          notifiedIdsList.push(task.id);
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem('cn_notified_task_ids', JSON.stringify(notifiedIdsList));
        setNotifiedTaskIds(notifiedIdsList);
      }
    };

    // Executa imediatamente e depois a cada 30 segundos (verificação em memória — sem query)
    const initialTimeout = setTimeout(checkLimitTasks, 3000);
    const interval = setInterval(checkLimitTasks, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [pushEnabled]);


  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const displayedNotifications = notifications.filter(n => n.date === todayStr || !n.read);
  const unreadCount = displayedNotifications.filter(n => !n.read).length;

  const completedToday = habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length;
  const pendingHabits = habits.length - completedToday;

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

  // Dias da semana atual para o preenchimento semanal de hábitos (Segunda a Domingo)
  const getWeekDates = (baseDate: Date) => {
    const d = new Date(baseDate);
    const day = d.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const dStr = new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const raw = current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const label = raw.charAt(0).toUpperCase() + raw.slice(1, 3);
      days.push({
        dateStr: dStr,
        label, // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
        dayNum: current.getDate(),
        isToday: dStr === todayStr,
        isFuture: dStr > todayStr
      });
    }
    return days;
  };
  const weekDays = useMemo(() => getWeekDates(currentTime), [currentTime, todayStr]);

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
    <div className={`flex-1 h-screen overflow-y-auto flex flex-col transition-all duration-300 ${
      alignment === 'left' ? 'items-start px-4 sm:px-6 md:px-12' :
      alignment === 'right' ? 'items-end px-4 sm:px-6 md:px-12' :
      'items-center'
    }`}>
        {/* Mobile Header */}
        <div className="w-full md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-30 select-none">
          <button
            onClick={() => window.dispatchEvent(new Event('open-main-sidebar'))}
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 p-2 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <FaviconIcon size={18} className="text-zinc-800 dark:text-white" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-white leading-none">Conscientemente</span>
          </div>

          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Main content */}
        <main className={`relative z-10 w-full ${showHabitsReport ? 'max-w-5xl' : 'max-w-[1720px]'} px-4 sm:px-6 lg:px-8 py-8 flex flex-col transition-all duration-300`}>
        {isHomeEditMode && !showHabitsReport && (
          <div className="w-full mb-6 p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 select-none">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Modo de Edição Ativo: Ajuste o Layout da sua Tela Inicial</span>
            </div>
            {/* Alignment buttons */}
            <div className="flex items-center gap-2 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700">
              <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest px-2">Alinhamento</span>
              <button
                onClick={() => handleSetAlignment('left')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  alignment === 'left'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                Esquerda
              </button>
              <button
                onClick={() => handleSetAlignment('center')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  alignment === 'center'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                Centro
              </button>
              <button
                onClick={() => handleSetAlignment('right')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  alignment === 'right'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                Direita
              </button>
            </div>
          </div>
        )}

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
              {([
                { label: 'Consistência', value: `${last7DaysRate}%`, sub: 'últimos 7 dias', Icon: BarChart3 },
                { label: 'Streak atual', value: `${currentStreak}d`, sub: 'dias seguidos', Icon: Flame },
                { label: 'Hábitos ativos', value: habits.length, sub: 'monitorados', Icon: Activity },
                { label: 'Conclusões', value: totalCompletions, sub: 'no histórico', Icon: Award },
              ] as const).map(stat => (
                <div key={stat.label} className="p-4 rounded-2xl border bg-zinc-100/90 dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                    <stat.Icon size={14} className="text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{stat.value}</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{stat.sub}</span>
                </div>
              ))}
            </div>

            {/* Calendar heatmap — 15 cols × 2 rows */}
            <div className="bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={13} className="text-zinc-900 dark:text-zinc-100" /> Mapa de Consistência — Últimos 30 Dias
                </h4>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                  <span>Menos</span>
                  <div className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="w-3 h-3 rounded bg-zinc-300 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded bg-zinc-500 dark:bg-zinc-500" />
                  <div className="w-3 h-3 rounded bg-zinc-900 dark:bg-white" />
                  <span>Mais</span>
                </div>
              </div>
              <div className="grid gap-2 grid-cols-15" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                {last30DaysList.map(day => {
                  let cell = 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400';
                  if (day.rate > 0 && day.rate <= 0.33) cell = 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
                  else if (day.rate > 0.33 && day.rate <= 0.66) cell = 'bg-zinc-400 dark:bg-zinc-600 text-white';
                  else if (day.rate > 0.66 && day.rate < 1) cell = 'bg-zinc-600 dark:bg-zinc-500 text-white';
                  else if (day.rate === 1) cell = 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black shadow-sm';
                  const isToday = day.dateStr === todayStr;
                  return (
                    <div
                      key={day.dateStr}
                      title={`${day.dateStr}: ${day.completed}/${day.total} hábitos concluídos`}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-default ${cell} ${isToday ? 'ring-2 ring-zinc-500 dark:ring-zinc-400 ring-offset-2 dark:ring-offset-zinc-900' : ''}`}
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
            <div className="bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 flex flex-col gap-4 shadow-sm">
              <h4 className="text-xs font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <Award size={13} className="text-zinc-900 dark:text-zinc-100" /> Desempenho por Hábito — Últimos 7 dias
                <span className="ml-auto text-[10px] text-zinc-500 dark:text-zinc-400 font-bold normal-case tracking-normal">Dica: clique nos botões abaixo para marcar/desmarcar o hábito no dia</span>
              </h4>

              <div className="flex flex-col gap-3">
                {habits.map(h => {
                  const habitColor = h.color || '#f97316';
                  const habitTotal = Object.values(habitHistory).filter(list => list.includes(h.id)).length;
                  const habit7DayCount = last7Days.filter(day => (habitHistory[day.dateStr] || []).includes(h.id)).length;
                  const habit7DayRate = Math.round((habit7DayCount / 7) * 100);
                  const textColor = 'text-zinc-900 dark:text-white font-extrabold';
                  return (
                    <div key={h.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: habitColor }} />
                      {/* Name row */}
                      <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: habitColor }} />
                          <span className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{habitTotal} conclusões totais</span>
                          <span className={`text-sm font-black ${textColor}`}>{habit7DayRate}%</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${habit7DayRate}%`, backgroundColor: habitColor }} />
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
                              style={done ? { backgroundColor: habitColor, borderColor: habitColor } : {}}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                done
                                  ? 'shadow-sm text-white font-black'
                                  : isToday
                                    ? 'bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 hover:border-zinc-950 dark:hover:border-white'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
                              }`}
                            >
                              <span className={`text-[10px] font-black uppercase tracking-wider ${done ? 'text-zinc-200 dark:text-zinc-700' : isToday ? 'text-zinc-900 dark:text-white font-black' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                {day.label}
                              </span>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${done ? 'bg-white/20 dark:bg-black/20' : 'bg-zinc-100 dark:bg-zinc-700/80'}`}>
                                {done
                                  ? <Check size={16} strokeWidth={3} className="text-white dark:text-zinc-950 animate-in zoom-in-50 duration-200" />
                                  : <span className={`text-xs font-black ${isToday ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>{day.dayNum}</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-[7rem_minmax(0,1fr)] xl:grid-cols-[8rem_minmax(0,1fr)] items-start gap-6 w-full lg:[&>div]:col-start-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <aside
                aria-label="Módulos"
                style={{ '--modules-row': modulesRow } as React.CSSProperties}
                className="w-full min-w-0 lg:col-start-1 lg:[grid-row-start:var(--modules-row)]"
              >
                {/* Lista de Módulos */}
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl lg:rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-2 lg:p-2.5 shadow-sm flex flex-row lg:flex-col items-center justify-between lg:justify-start gap-1 lg:gap-2">
                  <div className="hidden lg:flex items-center justify-center py-1 w-full border-b border-zinc-100 dark:border-zinc-800/80 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Módulos</span>
                  </div>
                  {homeCards.map((card, i) => {
                    const mod = MODULES.find(m => m.id === card.id);
                    if (!mod) return null;
                    return (
                      <ModuleCard 
                        key={mod.id} 
                        module={mod} 
                        index={i} 
                        size={card.size}
                        isEditMode={isHomeEditMode}
                        onCycleSize={() => cycleCardSize(mod.id)}
                        onDragStart={() => handleCardDragStart(i)}
                        onDragOver={(e) => handleCardDragOver(e, i)}
                        onDragEnd={handleCardDragEnd}
                        isDragged={draggedCardIndex === i}
                      />
                    );
                  })}
                </div>
              </aside>
              
          {visibleWidgets.map((widgetId) => {
            if (widgetId === 'calendar') {
              const isCalendarVisible = widgetsVisibility['calendar'] !== false;
              if (!isCalendarVisible && !isHomeEditMode) return null;
              return (
                <div 
                  key="calendar"
                  onMouseEnter={() => setIsCalendarHovered(true)}
                  onMouseLeave={() => setIsCalendarHovered(false)}
                  style={{ opacity: !isCalendarVisible ? 0.4 : (isCalendarHovered ? 1 : calendarOpacity) }}
                  className={`w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-xl transition-all duration-300 ${!isCalendarVisible ? 'ring-2 ring-dashed ring-rose-500/30' : ''}`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Calendário Mensal (Grade Principal) */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                      {/* Header do calendário com botões de navegação e atalho Hoje */}
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-white shadow-xs">
                            <CalendarDays size={18} />
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Agenda Unificada</span>
                            <h3 className="text-base md:text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                              {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Botão Atalho "Hoje" */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCalendarMonth(new Date());
                              setSelectedCalendarDate(todayStr);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                          >
                            Hoje
                          </button>

                          {/* Opacity & Visibility control for Calendar — only visible in edit mode */}
                          {isHomeEditMode && (
                            <div className="flex items-center gap-1.5 bg-zinc-100/60 dark:bg-zinc-800/50 px-2.5 py-1 rounded-xl border border-zinc-300/30 dark:border-zinc-700/50 animate-in fade-in duration-200">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleWidgetVisibility('calendar'); }}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                                title={isCalendarVisible ? 'Ocultar widget de calendário' : 'Exibir widget de calendário'}
                              >
                                {isCalendarVisible ? <Eye size={12} strokeWidth={2.5} /> : <EyeOff size={12} strokeWidth={2.5} className="text-rose-500" />}
                              </button>
                              <div className="w-[1px] h-3.5 bg-zinc-350 dark:bg-zinc-700 mx-0.5" />
                              <Sliders size={11} className="text-zinc-400 dark:text-zinc-500" />
                              <input 
                                type="range" 
                                min="0.2" 
                                max="1" 
                                step="0.05" 
                                value={calendarOpacity} 
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const val = parseFloat(e.target.value);
                                  setCalendarOpacity(val);
                                  localStorage.setItem('cn_calendar_opacity', val.toString());
                                }}
                                className="w-14 h-1 bg-zinc-250 dark:bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-zinc-500 dark:accent-zinc-400"
                                title="Opacidade do calendário"
                              />
                              <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 w-6 text-right mr-1">
                                {Math.round(calendarOpacity * 100)}%
                              </span>

                              <div className="w-[1px] h-3.5 bg-zinc-350 dark:bg-zinc-700 mx-0.5" />

                              <button
                                onClick={(e) => { e.stopPropagation(); moveWidget('calendar', 'up'); }}
                                disabled={widgetsOrder.indexOf('calendar') === 0}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                                title="Mover para cima"
                              >
                                <ChevronUp size={12} strokeWidth={3} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveWidget('calendar', 'down'); }}
                                disabled={widgetsOrder.indexOf('calendar') === widgetsOrder.length - 1}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                                title="Mover para baixo"
                              >
                                <ChevronDown size={12} strokeWidth={3} />
                              </button>
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              changeAgendaMonth(-1);
                            }}
                            type="button"
                            className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer ${
                              hasPastPendingEvents ? 'animate-pulse text-amber-500 dark:text-amber-400 font-black' : ''
                            }`}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              changeAgendaMonth(1);
                            }}
                            type="button"
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {calendarUnavailableSources.length > 0 && (
                        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
                          Dados indisponíveis no momento em {calendarUnavailableSources.join(', ')}.
                        </p>
                      )}
                      {/* Grade Ampliada do Calendário */}
                      <div className="grid grid-cols-7 gap-2">
                        {/* Dias da semana */}
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                          <div key={idx} className="text-center text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase py-2 tracking-wider">{day}</div>
                        ))}

                        {/* Células dos dias do mês */}
                        {(() => {
                          const year = calendarMonth.getFullYear();
                          const month = calendarMonth.getMonth();
                          const firstDayIndex = new Date(year, month, 1).getDay();
                          const totalDays = new Date(year, month + 1, 0).getDate();

                          const cells = [];
                          // Células vazias do mês anterior
                          for (let i = 0; i < firstDayIndex; i++) {
                            cells.push(<div key={`empty-${i}`} className="py-3" />);
                          }

                          // Dias do mês atual
                          for (let day = 1; day <= totalDays; day++) {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedCalendarDate;

                            const dayExams = concursoExamDates.filter(ed => ed.date === dateStr);
                            const isExamDay = dayExams.length > 0;

                            // Filtrar eventos do dia
                            const dayTasks = calendarEvents.tasks.filter(t => {
                              if (t.endDate) {
                                return t.due_date <= dateStr && dateStr <= t.endDate;
                              }
                              return t.due_date === dateStr;
                            });
                            const dayStudies = calendarEvents.studies.filter(s => s.date === dateStr);
                            const dayWorkouts = calendarEvents.workouts.filter(w => w.date === dateStr);
                            const dayFinances = calendarEvents.finances.filter(f => f.date === dateStr);

                            const hasRangeTask = dayTasks.some(t => !!t.endDate);
                            const isHealthProvaDay = dayWorkouts.some(w => {
                              const type = String(w.type || '').trim().toLowerCase();
                              return type.startsWith('prova') || type === 'prova';
                            });
                            const hasImportantTask = dayTasks.some(t => {
                              const isComp = t.completed === true || String(t.completed).toLowerCase() === 'true';
                              const cat = String(t.category || '').trim().toLowerCase();
                              return !isComp && (cat === 'importante' || cat === 'urgente');
                            });

                            const todayBorderClass = isExamDay
                              ? 'border-2 border-purple-500 dark:border-purple-400'
                              : isHealthProvaDay
                                ? 'border-2 border-blue-500 dark:border-blue-400'
                                : hasImportantTask
                                  ? 'border-2 border-red-500 dark:border-red-400'
                                  : 'border-zinc-300 dark:border-zinc-700';

                            cells.push(
                              <div
                                key={`day-${day}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCalendarDate(dateStr);
                                }}
                                className={`py-2.5 md:py-3.5 px-1 rounded-2xl border flex flex-col items-center justify-between min-h-[52px] md:min-h-[62px] relative cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs ${
                                  isSelected
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-md font-black scale-105 z-10'
                                    : isToday
                                      ? `bg-zinc-100 dark:bg-zinc-800/80 ${todayBorderClass} text-zinc-900 dark:text-white font-extrabold`
                                      : isExamDay
                                        ? 'bg-purple-500/10 dark:bg-purple-500/15 border-2 border-purple-500 dark:border-purple-400 text-purple-900 dark:text-purple-300 font-extrabold shadow-sm'
                                        : isHealthProvaDay
                                          ? 'bg-blue-500/10 dark:bg-blue-500/15 border-2 border-blue-500 dark:border-blue-400 text-blue-900 dark:text-blue-300 font-extrabold shadow-sm'
                                          : hasImportantTask
                                            ? 'bg-red-500/10 dark:bg-red-500/15 border-2 border-red-500 dark:border-red-400 text-red-900 dark:text-red-300 font-bold'
                                            : hasRangeTask
                                              ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                                              : 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600'
                                }`}
                              >
                                <span className="text-xs md:text-sm font-black leading-none">{day}</span>
                                
                                {/* Bolas elegantes indicadoras sob o dia */}
                                <div className="flex gap-1 mt-1 shrink-0 flex-wrap justify-center max-w-full">
                                  {dayStudies.map((s, idx) => {
                                    const isAtrasado = dateStr < todayStr && !s.completed;
                                    return (
                                      <div 
                                        key={`study-${s.id || idx}`}
                                        className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 transition-all ${
                                          isAtrasado 
                                            ? 'bg-purple-600 dark:bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.85)] scale-110 animate-pulse' 
                                            : 'bg-purple-500/80 dark:bg-purple-400/80'
                                        }`} 
                                      />
                                    );
                                  })}
                                  {dayTasks.filter(t => !t.endDate).map((t, idx) => {
                                    const cat = String(t.category || '').trim().toLowerCase();
                                    const isImportant = cat === 'importante' || cat === 'urgente';
                                    const isAtrasado = dateStr < todayStr && !t.completed;
                                    return (
                                      <div 
                                        key={`task-${t.id || idx}`}
                                        className={`rounded-full shrink-0 transition-all ${
                                          isImportant
                                            ? 'w-2 h-2 md:w-2.5 md:h-2.5 bg-red-600 dark:bg-red-400 ring-2 ring-red-400/50'
                                            : `w-1.5 h-1.5 md:w-2 md:h-2 ${
                                                isAtrasado 
                                                  ? 'bg-red-600 dark:bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.85)] scale-110 animate-pulse' 
                                                  : 'bg-red-500/80 dark:bg-red-400/80'
                                              }`
                                        }`} 
                                      />
                                    );
                                  })}
                                  {dayFinances.map((f, idx) => {
                                    const isAtrasado = dateStr < todayStr && f.pending;
                                    return (
                                      <div 
                                        key={`finance-${f.id || idx}`}
                                        className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 transition-all ${
                                          isAtrasado 
                                            ? 'bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_6px_rgba(10,185,129,0.85)] scale-110 animate-pulse' 
                                            : 'bg-emerald-500/80 dark:bg-emerald-400/80'
                                        }`} 
                                      />
                                    );
                                  })}
                                  {dayWorkouts.map((w, idx) => {
                                    const isAtrasado = dateStr < todayStr && w.status !== 'realizado';
                                    return (
                                      <div 
                                        key={`workout-${w.id || idx}`}
                                        className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 transition-all ${
                                          isAtrasado 
                                            ? 'bg-cyan-600 dark:bg-cyan-400 shadow-[0_0_6px_rgba(59,130,246,0.85)] scale-110 animate-pulse' 
                                            : 'bg-cyan-500/80 dark:bg-cyan-400/80'
                                        }`} 
                                      />
                                    );
                                  })}
                                  {calendarEvents.notes.some(note => note.date === dateStr) && (
                                    <span className="size-2 rounded-full bg-amber-500" title="Anotações" />
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return cells;
                        })()}
                      </div>
                    </div>

                    {/* Lista de Compromissos do Dia (Direita - Painel Destacado) */}
                    <div className="lg:col-span-4 flex flex-col gap-4 min-w-0 bg-zinc-50/80 dark:bg-zinc-800/40 p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-inner">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60 dark:border-zinc-700/50">
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                            Compromissos
                          </h4>
                          <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                            {(() => {
                              const parts = selectedCalendarDate.split('-');
                              if (parts.length === 3) {
                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                              }
                              return selectedCalendarDate;
                            })()}
                          </p>
                        </div>
                        <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-300 uppercase tracking-widest bg-zinc-200/60 dark:bg-zinc-700/60 px-2.5 py-1 rounded-xl">
                          {(() => {
                            const dayExams = concursoExamDates.filter(ed => ed.date === selectedCalendarDate);
                            const dayTasks = calendarEvents.tasks.filter(t => t.endDate ? (t.due_date <= selectedCalendarDate && selectedCalendarDate <= t.endDate) : t.due_date === selectedCalendarDate);
                            const dayStudies = calendarEvents.studies.filter(s => s.date === selectedCalendarDate);
                            const dayWorkouts = calendarEvents.workouts.filter(w => w.date === selectedCalendarDate);
                            const dayFinances = calendarEvents.finances.filter(f => f.date === selectedCalendarDate);
                            return dayExams.length + dayTasks.length + dayStudies.length + dayWorkouts.length + dayFinances.length +
                              selectedNotes.length;
                          })()} itens
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 space-y-2 flex flex-col max-h-[360px] custom-scrollbar">
                        {(() => {
                          const dayExams = concursoExamDates.filter(ed => ed.date === selectedCalendarDate);
                          const dayTasks = [...calendarEvents.tasks.filter(t => {
                            if (t.endDate) {
                              return t.due_date <= selectedCalendarDate && selectedCalendarDate <= t.endDate;
                            }
                            return t.due_date === selectedCalendarDate;
                          })].sort((a, b) => {
                            const isCompA = a.completed === true || String(a.completed).toLowerCase() === 'true';
                            const isCompB = b.completed === true || String(b.completed).toLowerCase() === 'true';
                            if (isCompA !== isCompB) return isCompA ? 1 : -1;
                            if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
                            if (a.due_time) return -1;
                            if (b.due_time) return 1;
                            const priorityMap: Record<string, number> = { 'Urgente': 1, 'Importante': 2, 'Tarefa': 3 };
                            const pA = priorityMap[a.category] || 4;
                            const pB = priorityMap[b.category] || 4;
                            if (pA !== pB) return pA - pB;
                            return a.text.localeCompare(b.text);
                          });
                          const dayStudies = [...calendarEvents.studies.filter(s => s.date === selectedCalendarDate)].sort((a, b) => {
                            if (a.completed !== b.completed) return a.completed ? 1 : -1;
                            return (a.text || '').localeCompare(b.text || '');
                          });
                          const dayWorkouts = calendarEvents.workouts.filter(w => w.date === selectedCalendarDate);
                          const dayFinances = calendarEvents.finances.filter(f => f.date === selectedCalendarDate);

                          const totalCount = dayExams.length + dayTasks.length + dayStudies.length + dayWorkouts.length + dayFinances.length +
                            selectedNotes.length;

                          if (totalCount === 0) {
                            return (
                              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-60">
                                <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                                <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Dia Livre</p>
                                <p className="text-[10px] text-zinc-400 mt-1">Nenhum compromisso pendente neste dia</p>
                              </div>
                            );
                          }

                          return (
                            <>
                               {/* Prova de Concurso (Destaque em Roxo) */}
                               {dayExams.map(exam => (
                                 <button type="button"
                                   key={`exam-${exam.id}`}
                                   onClick={() => {
                                     openAgendaTarget('estudos', { date: exam.date, id: exam.id, studyTab: 'concursos' });
                                   }}
                                   title="Abrir no Módulo de Estudos"
                                   className="flex w-full items-center gap-2.5 text-left p-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] bg-purple-500/15 dark:bg-purple-500/20 border-2 border-purple-500/50 dark:border-purple-400/60 shadow-sm"
                                 >
                                   <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-500 text-white shadow-xs">
                                     <Target size={16} strokeWidth={2.5} />
                                   </div>
                                   <div className="min-w-0 flex-1">
                                     <p className="text-[9px] font-black uppercase tracking-wider leading-none text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                       🎯 Prova do Concurso
                                     </p>
                                     <p className="text-xs font-black text-purple-950 dark:text-white truncate mt-0.5 leading-none">
                                       {exam.name}
                                     </p>
                                   </div>
                                 </button>
                               ))}
                               {/* Estudos */}
                               {dayStudies.map(s => {
                                 const isCompleted = s.completed;
                                 const isRevisao = s.text && (s.text.toLowerCase().includes('revisão') || s.text.toLowerCase().includes('revisao'));
                                 return (
                                   <button type="button"
                                     key={s.id} 
                                     onClick={() => {
                                       openAgendaTarget('estudos', {
                                         date: s.date,
                                         id: s.id,
                                         concursoId: s.concursoId,
                                         studyTab: 'calendar'
                                       });
                                     }}
                                     title="Abrir no módulo de Estudos"
                                     className={`flex w-full items-center gap-2.5 text-left p-2 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                       isCompleted
                                         ? 'bg-zinc-100/40 dark:bg-zinc-800/20 border border-zinc-200/25 dark:border-zinc-800/30 opacity-40'
                                         : isRevisao
                                           ? 'bg-amber-500/10 dark:bg-amber-500/10 border-2 border-amber-500/40 dark:border-amber-400/50 shadow-xs'
                                           : 'bg-purple-500/10 dark:bg-purple-500/10 border-2 border-purple-500/40 dark:border-purple-400/50 shadow-xs'
                                     }`}
                                   >
                                     <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                       isCompleted
                                         ? 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500'
                                         : isRevisao
                                           ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                           : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                     }`}>
                                       <BookOpen size={13} strokeWidth={2.2} />
                                     </div>
                                     <div className="min-w-0 flex-1">
                                       <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                         isCompleted ? 'text-zinc-400 dark:text-zinc-550' : isRevisao ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'
                                       }`}>
                                         {s.isSimulado ? 'Simulado' : isRevisao ? 'Revisão' : 'Estudo'} {!isCompleted && '• Pendente'}
                                       </p>
                                       <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${
                                         isCompleted ? 'line-through opacity-50' : ''
                                       }`}>{s.text}</p>
                                     </div>
                                   </button>
                                 );
                               })}

                               {/* Tarefas */}
                               {dayTasks.map(t => {
                                 const isCompleted = t.completed === true || String(t.completed).toLowerCase() === 'true';
                                 const cat = String(t.category || '').trim().toLowerCase();
                                 const isImportant = cat === 'importante' || cat === 'urgente';
                                 return (
                                   <button type="button"
                                     key={t.id} 
                                     onClick={() => openAgendaTarget('tarefas', { date: selectedCalendarDate, id: t.id })}
                                     title="Abrir no módulo de Tarefas"
                                     className={`flex w-full items-center gap-2.5 text-left p-2 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                       isCompleted
                                         ? 'bg-zinc-100/40 dark:bg-zinc-800/20 border border-zinc-200/25 dark:border-zinc-800/30 opacity-40'
                                         : isImportant
                                           ? 'bg-red-500/15 dark:bg-red-500/20 border-l-4 border-l-red-500 border-t border-r border-b border-red-500/35 dark:border-red-400/40 shadow-sm font-black'
                                           : 'bg-red-500/10 dark:bg-red-500/10 border border-red-500/20 dark:border-red-400/30 shadow-xs'
                                     }`}
                                   >
                                     <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                       isCompleted
                                         ? 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500'
                                         : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                     }`}>
                                       {isImportant ? (
                                         <AlertCircle size={13} strokeWidth={2.2} />
                                       ) : (
                                         <ListTodo size={13} strokeWidth={2.2} />
                                       )}
                                     </div>
                                     <div className="min-w-0 flex-1">
                                       <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                         isCompleted ? 'text-zinc-400 dark:text-zinc-550' : 'text-red-600 dark:text-red-400'
                                       }`}>
                                         {isImportant ? '⚠️ Tarefa Importante' : 'Tarefa'} {!isCompleted && '• Pendente'}
                                       </p>
                                       <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${
                                         isCompleted ? 'line-through opacity-50' : ''
                                       }`}>{t.text}</p>
                                     </div>
                                   </button>
                                 );
                               })}

                               {/* Treinos */}
                               {dayWorkouts.map(w => {
                                 const isCompleted = w.status === 'realizado';
                                 return (
                                   <button type="button"
                                     key={w.id} 
                                     onClick={() => {
                                       sessionStorage.setItem('saude_active_tab', 'planner');
                                       openAgendaTarget('saude', { date: w.date, id: w.id });
                                     }}
                                     title="Abrir no módulo de Saúde"
                                     className={`flex w-full items-center gap-2.5 text-left p-2 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                       isCompleted
                                         ? 'bg-zinc-100/40 dark:bg-zinc-800/20 border border-zinc-200/25 dark:border-zinc-800/30 opacity-40'
                                         : 'bg-blue-500/10 dark:bg-blue-500/10 border-2 border-blue-500/40 dark:border-blue-400/50 shadow-xs'
                                     }`}
                                   >
                                     <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                       isCompleted
                                         ? 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500'
                                         : 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                                     }`}>
                                       <Activity size={13} strokeWidth={2.2} />
                                     </div>
                                     <div className="min-w-0 flex-1">
                                       <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                         isCompleted ? 'text-zinc-400 dark:text-zinc-550' : 'text-blue-600 dark:text-blue-400'
                                       }`}>
                                         Treino {!isCompleted && '• Pendente'}
                                       </p>
                                       <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${
                                         isCompleted ? 'line-through opacity-50' : ''
                                       }`}>{w.type}{w.muscles && w.muscles.length > 0 ? ` (${w.muscles.join(', ')})` : ''}</p>
                                     </div>
                                   </button>
                                 );
                               })}

                               {/* Finanças */}
                               {dayFinances.map(f => (
                                 <button type="button"
                                   key={f.id} 
                                   onClick={() => openAgendaTarget('financas', { date: f.date, id: f.id })}
                                   title="Abrir no módulo de Finanças"
                                   className="flex w-full items-center gap-2.5 text-left p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/30 dark:border-emerald-400/45 shadow-xs cursor-pointer hover:scale-[1.01] transition-all duration-200"
                                 >
                                   <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                     <Wallet size={13} strokeWidth={2.2} />
                                   </div>
                                   <div className="min-w-0 flex-1">
                                     <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-none">
                                       {f.type === 'entrada' ? 'Receita' : 'Despesa'} • {f.pending ? 'Pendente' : 'Confirmada'}
                                     </p>
                                     <p className="text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none">
                                       {f.name}
                                     </p>
                                   </div>
                                   <span className="text-[9px] font-bold text-emerald-650 dark:text-emerald-400 shrink-0">
                                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.amount)}
                                   </span>
                                 </button>
                               ))}
                               {selectedNotes.map(note => (
                                 <button key={`note-${note.id}`} type="button"
                                   onClick={() => openAgendaTarget('anotacoes', { date: note.date, id: note.id })}
                                   className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-left">
                                   <StickyNote size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                   <span className="min-w-0">
                                     <span className="block text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">{note.category || 'Anotação'}</span>
                                     <span className="block truncate text-[10px] font-bold">{note.title || 'Sem título'}</span>
                                   </span>
                                 </button>
                               ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              );
            }

            if (widgetId === 'habits') {
              const isHabitsVisible = widgetsVisibility['habits'] !== false;
              if (!isHabitsVisible && !isHomeEditMode) return null;

              const completedTodayCount = habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length;
              const totalHabitsCount = habits.length;
              const dailyPct = totalHabitsCount > 0 ? Math.round((completedTodayCount / totalHabitsCount) * 100) : 0;
              const donutSize = 64;
              const strokeWidth = 5;
              const radius = 26;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (dailyPct / 100) * circumference;

              return (
                <div 
                  key="habits"
                  onMouseEnter={() => setIsHabitsHovered(true)}
                  onMouseLeave={() => setIsHabitsHovered(false)}
                  style={{ opacity: !isHabitsVisible ? 0.4 : (isHabitsHovered ? 1 : habitsOpacity) }}
                  className={`w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between p-4 overflow-hidden relative transition-all duration-300 min-h-[175px] ${!isHabitsVisible ? 'ring-2 ring-dashed ring-rose-500/30' : ''}`}
                >
                  <div className="flex-1 min-h-0 flex flex-col justify-between">
                    {/* Header do Widget */}
                    <div className="flex items-center justify-between mb-2.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ClipboardList size={13} className="text-zinc-450 dark:text-zinc-500" />
                          Rastreador de Hábitos
                        </h3>
                        <button
                          type="button"
                          onClick={() => { window.location.hash = 'habitos'; }}
                          className="text-[9px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 uppercase tracking-wider transition-colors ml-2 cursor-pointer"
                        >
                          Gerenciar →
                        </button>
                      </div>

                      {/* Opacity & Visibility control for Habit Tracker — only visible in edit mode */}
                      {isHomeEditMode && (
                        <div className="flex items-center gap-1.5 bg-zinc-100/60 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg border border-zinc-300/30 dark:border-zinc-700/50 animate-in fade-in duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWidgetVisibility('habits'); }}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                            title={isHabitsVisible ? 'Ocultar widget de hábitos' : 'Exibir widget de hábitos'}
                          >
                            {isHabitsVisible ? <Eye size={11} strokeWidth={2.5} /> : <EyeOff size={11} strokeWidth={2.5} className="text-rose-500" />}
                          </button>
                          <div className="w-[1px] h-3 bg-zinc-350 dark:bg-zinc-700 mx-0.5" />
                          <Sliders size={10} className="text-zinc-400 dark:text-zinc-500" />
                          <input 
                            type="range" 
                            min="0.2" 
                            max="1" 
                            step="0.05" 
                            value={habitsOpacity} 
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = parseFloat(e.target.value);
                              setHabitsOpacity(val);
                              localStorage.setItem('cn_habits_opacity', val.toString());
                            }}
                            className="w-14 h-1 bg-zinc-250 dark:bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-zinc-500 dark:accent-zinc-400"
                            title="Opacidade dos hábitos"
                          />
                          <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 w-6 text-right mr-1">
                            {Math.round(habitsOpacity * 100)}%
                          </span>

                          <div className="w-[1px] h-3 bg-zinc-350 dark:bg-zinc-700 mx-0.5" />

                          <button
                            onClick={(e) => { e.stopPropagation(); moveWidget('habits', 'up'); }}
                            disabled={widgetsOrder.indexOf('habits') === 0}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                            title="Mover para cima"
                          >
                            <ChevronUp size={11} strokeWidth={3} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveWidget('habits', 'down'); }}
                            disabled={widgetsOrder.indexOf('habits') === widgetsOrder.length - 1}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={11} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Conteúdo: Tabela semanal de hábitos + Gráfico de Rosca sem miolo */}
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      {/* Tabela de Preenchimento Semanal */}
                      <div className="flex-1 w-full min-w-0">
                        {habits.length === 0 ? (
                          <div className="py-4 text-center text-xs text-zinc-450 dark:text-zinc-500 font-medium">
                            Você não possui hábitos definidos. Acesse o módulo de Hábitos para criar.
                          </div>
                        ) : (
                          <div className="w-full">
                            {/* Cabeçalho dos dias da semana */}
                            <div className="flex items-center justify-between px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-200/60 dark:border-zinc-800/60 mb-1.5">
                              <span className="flex-1 min-w-0 truncate">Hábito</span>
                              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1">
                                {weekDays.map(day => (
                                  <div
                                    key={day.dateStr}
                                    className={`w-6 text-center flex flex-col items-center justify-center ${
                                      day.isToday ? 'text-zinc-900 dark:text-white font-black' : ''
                                    }`}
                                  >
                                    <span className="text-[8.5px] leading-none">{day.label}</span>
                                    <span className={`text-[8.5px] leading-none mt-0.5 ${
                                      day.isToday 
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full w-3.5 h-3.5 flex items-center justify-center font-black' 
                                        : 'opacity-70'
                                    }`}>
                                      {day.dayNum}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Lista de Hábitos com sequência de checkboxes */}
                            <div className="flex flex-col gap-1 max-h-[145px] overflow-y-auto custom-scrollbar pr-1">
                              {habits.map(h => {
                                const habitColor = h.color || '#f97316';
                                return (
                                  <div
                                    key={h.id}
                                    className="flex items-center justify-between px-2 py-1 rounded-xl transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 select-none group/habit-row"
                                  >
                                    {/* Nome do hábito e ponto de cor */}
                                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2" title={h.name}>
                                      <span 
                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                                        style={{ backgroundColor: habitColor }}
                                      />
                                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover/habit-row:text-zinc-950 dark:group-hover/habit-row:text-white">
                                        {h.name}
                                      </span>
                                    </div>

                                    {/* Sequência de checkboxes semanais */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1">
                                      {weekDays.map(day => {
                                        const isDone = (habitHistory[day.dateStr] || []).includes(h.id);
                                        return (
                                          <button
                                            key={day.dateStr}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleHabitOnDate(h.id, day.dateStr);
                                            }}
                                            title={`${h.name} • ${day.label} (${day.dayNum}/${day.dateStr.split('-')[1]}) — ${isDone ? 'Clique para desmarcar' : 'Clique para marcar'}`}
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer select-none group/box ${
                                              isDone
                                                ? 'scale-100 shadow-2xs hover:scale-110 active:scale-95'
                                                : 'hover:scale-105 active:scale-95'
                                            }`}
                                            style={
                                              isDone
                                                ? {
                                                    backgroundColor: habitColor,
                                                    border: `1.5px solid ${habitColor}`,
                                                    boxShadow: `0 2px 6px ${habitColor}45`
                                                  }
                                                : {
                                                    backgroundColor: 'transparent',
                                                    border: `1.5px solid ${habitColor}50`
                                                  }
                                            }
                                          >
                                            {isDone ? (
                                              <Check size={12} strokeWidth={3.5} className="text-white drop-shadow-xs" />
                                            ) : (
                                              day.isToday && (
                                                <div 
                                                  className="w-1.5 h-1.5 rounded-full opacity-60" 
                                                  style={{ backgroundColor: habitColor }}
                                                />
                                              )
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Divisor vertical */}
                      <div className="hidden md:block w-px self-stretch bg-zinc-200/60 dark:bg-zinc-800/60 my-1" />

                      {/* Gráfico Minimalista de Rosca sem miolo — Progresso Diário */}
                      <div className="shrink-0 flex items-center gap-3.5 px-2 py-1">
                        {/* SVG Rosca sem miolo */}
                        <div className="relative flex items-center justify-center" style={{ width: donutSize, height: donutSize }}>
                          <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} className="transform -rotate-90">
                            {/* Trilho vazado da rosca (sem miolo) */}
                            <circle
                              cx={donutSize / 2}
                              cy={donutSize / 2}
                              r={radius}
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth={strokeWidth}
                              className="text-zinc-200 dark:text-zinc-800"
                            />
                            {/* Arco de progresso */}
                            <circle
                              cx={donutSize / 2}
                              cy={donutSize / 2}
                              r={radius}
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth={strokeWidth}
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="text-zinc-900 dark:text-white transition-all duration-700 ease-out"
                            />
                          </svg>

                          {/* Miolo vazio apenas com porcentagem centralizada */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs font-black text-zinc-900 dark:text-white leading-none tracking-tight">
                              {dailyPct}%
                            </span>
                          </div>
                        </div>

                        {/* Legenda do Progresso Diário */}
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Progresso Diário
                          </span>
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">
                            <strong className="text-zinc-900 dark:text-white font-extrabold">{completedTodayCount}</strong>
                            <span className="text-zinc-400 dark:text-zinc-500 font-medium">/{totalHabitsCount} feitos</span>
                          </span>
                          {totalHabitsCount > 0 && completedTodayCount === totalHabitsCount ? (
                            <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                              <Check size={10} strokeWidth={3} /> Tudo pronto hoje!
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">
                              {Math.max(0, totalHabitsCount - completedTodayCount)} pendente{totalHabitsCount - completedTodayCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }


            if (widgetId === 'sleep') {
              const isSleepVisible = widgetsVisibility['sleep'] !== false;
              if (!isSleepVisible && !isHomeEditMode) return null;
              return (
                <div 
                  key="sleep"
                  onMouseEnter={() => setIsSleepHovered(true)}
                  onMouseLeave={() => setIsSleepHovered(false)}
                  style={{ opacity: !isSleepVisible ? 0.4 : (isSleepHovered ? 1 : sleepOpacity) }}
                  className={`w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between p-3.5 overflow-hidden relative transition-all duration-300 h-[190px] ${!isSleepVisible ? 'ring-2 ring-dashed ring-rose-500/30' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5 shrink-0">
                    <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Moon size={12} className="text-zinc-450 dark:text-zinc-500" />
                      Monitoramento de Sono (Últimos 7 dias)
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      {/* Opacity & Visibility control for Sleep — only visible in edit mode */}
                      {isHomeEditMode && (
                        <div className="flex items-center gap-1.5 bg-zinc-100/60 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg border border-zinc-300/30 dark:border-zinc-700/50 animate-in fade-in duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWidgetVisibility('sleep'); }}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                            title={isSleepVisible ? 'Ocultar widget de sono' : 'Exibir widget de sono'}
                          >
                            {isSleepVisible ? <Eye size={11} strokeWidth={2.5} /> : <EyeOff size={11} strokeWidth={2.5} className="text-rose-500" />}
                          </button>
                          <div className="w-[1px] h-3 bg-zinc-350 dark:bg-zinc-700 mx-0.5" />
                          <Sliders size={10} className="text-zinc-400 dark:text-zinc-500" />
                          <input 
                            type="range" 
                            min="0.2" 
                            max="1" 
                            step="0.05" 
                            value={sleepOpacity} 
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = parseFloat(e.target.value);
                              setSleepOpacity(val);
                              localStorage.setItem('cn_sleep_opacity', val.toString());
                            }}
                            className="w-14 h-1 bg-zinc-250 dark:bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-zinc-500 dark:accent-zinc-400"
                            title="Opacidade do sono"
                          />
                          <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 w-6 text-right mr-1">
                            {Math.round(sleepOpacity * 100)}%
                          </span>

                          <div className="w-[1px] h-3 bg-zinc-350 dark:bg-zinc-700 mx-0.5" />

                          <button
                            onClick={(e) => { e.stopPropagation(); moveWidget('sleep', 'up'); }}
                            disabled={widgetsOrder.indexOf('sleep') === 0}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                            title="Mover para cima"
                          >
                            <ChevronUp size={11} strokeWidth={3} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveWidget('sleep', 'down'); }}
                            disabled={widgetsOrder.indexOf('sleep') === widgetsOrder.length - 1}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={11} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                      
                      {/* Minimal and elegant shortcut button */}
                      <button
                        onClick={() => setShowAddSleepModal(true)}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-55/15 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200/50 dark:border-purple-900/50 px-2 py-1 rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer shrink-0 font-extrabold"
                        title="Registrar Noite de Sono"
                      >
                        <Plus size={10} strokeWidth={2.5} />
                        <span>Novo Registro</span>
                      </button>
                    </div>
                  </div>

                  {/* Sleep Graph Area */}
                  <div className="flex-1 w-full min-h-0 pt-2 relative">
                    {sleepChartData.some(d => d.horas > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sleepChartData} margin={{ top: 5, right: -5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSleepHoras" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                          <Area yAxisId="left" type="monotone" dataKey="horas" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSleepHoras)" name="Tempo (h)" />
                          <Area yAxisId="right" type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} fillOpacity={0} name="Score (%)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-semibold py-8">Nenhum registro de sono esta semana.</div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })}
      </div>

        {/* Modal para registrar sono */}
        {showAddSleepModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300 select-none">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setShowAddSleepModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-rose-500 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Moon size={16} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Registrar Noite de Sono</h3>
              </div>

              <form onSubmit={handleAddSleepLog} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Data do Sono</label>
                  <input
                    type="date"
                    value={sleepFormDate}
                    onChange={(e) => setSleepFormDate(e.target.value)}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Deep Sleep */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                    <span className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-2">Sono Profundo</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={sleepDeepH}
                        onChange={(e) => setSleepDeepH(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Horas"
                      />
                      <span className="text-zinc-400 text-xs">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepDeepM}
                        onChange={(e) => setSleepDeepM(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Min"
                      />
                    </div>
                  </div>

                  {/* REM Sleep */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                    <span className="text-[8px] font-black text-sky-500 dark:text-sky-400 uppercase tracking-wider block mb-2">Sono REM</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={sleepRemH}
                        onChange={(e) => setSleepRemH(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Horas"
                      />
                      <span className="text-zinc-400 text-xs">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepRemM}
                        onChange={(e) => setSleepRemM(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Min"
                      />
                    </div>
                  </div>

                  {/* Light Sleep */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block mb-2">Sono Leve</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={sleepLightH}
                        onChange={(e) => setSleepLightH(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Horas"
                      />
                      <span className="text-zinc-400 text-xs">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepLightM}
                        onChange={(e) => setSleepLightM(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Min"
                      />
                    </div>
                  </div>

                  {/* Awake Time */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider block mb-2">Acordado</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={sleepAwakeH}
                        onChange={(e) => setSleepAwakeH(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Horas"
                      />
                      <span className="text-zinc-400 text-xs">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepAwakeM}
                        onChange={(e) => setSleepAwakeM(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-center dark:text-zinc-200"
                        placeholder="Min"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Observações (Opcional)</label>
                  <textarea
                    value={sleepNotes}
                    onChange={(e) => setSleepNotes(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500 h-16 resize-none dark:text-zinc-100"
                    placeholder="Como foi a noite de sono..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all cursor-pointer font-extrabold"
                >
                  Salvar Registro
                </button>
              </form>
            </div>
          </div>
        )}

          </>
        )}
      </main>
    </div>
  );
};

export default HubHome;
