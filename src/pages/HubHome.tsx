import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MODULES } from '../constants';
import { Module } from '../types';
import { LogEntry } from '../modules/estudos/types';
import { LogOut, Sun, Moon, ArrowUpRight, Lock, BookOpen, Wallet, ListTodo, Brain, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Sliders, Activity, TrendingUp, Settings, User, X, HeartPulse, Bell, Plus, Trash2, Check, ClipboardList, BarChart3, Calendar, Award, CheckCircle2, StickyNote, Flame, Clock, DollarSign, Database, Cloud, AlertTriangle, FileText, CalendarDays, Menu } from 'lucide-react';
import LogView from '../modules/estudos/pages/LogView';
import { api } from '../modules/estudos/services/api';
import { supabase } from '../modules/estudos/services/supabase';
import { playSound } from '../utils/audio';

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
  size: 'normal' | 'wide' | 'full';
  isEditMode: boolean;
  onCycleSize: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragged: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  module, index, size, isEditMode, onCycleSize, onDragStart, onDragOver, onDragEnd, isDragged 
}) => {
  const colors = colorMap[module.color] ?? colorMap.indigo;

  const handleClick = () => {
    if (isEditMode) return;
    if (!module.available) return;
    window.location.hash = module.route;
  };

  const handleShortcutClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    if (isEditMode) return;
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
    } else if (action === 'habitos-gerenciar') {
      sessionStorage.setItem('habitosActiveTab', 'painel');
      window.location.hash = 'habitos';
    } else if (action === 'habitos-relatorio') {
      sessionStorage.setItem('habitosActiveTab', 'relatorio');
      window.location.hash = 'habitos';
    } else if (action === 'anotacoes-rapida') {
      sessionStorage.setItem('openAddNoteModal', 'true');
      sessionStorage.setItem('anotacoesActiveTab', 'Anotações');
      window.location.hash = 'anotacoes';
    } else if (action === 'anotacoes-leitura') {
      sessionStorage.setItem('openAddNoteModal', 'true');
      sessionStorage.setItem('anotacoesActiveTab', 'Diário de Leitura');
      window.location.hash = 'anotacoes';
    }
  };

  const sizeClasses = {
    normal: 'col-span-1 sm:col-span-2 lg:col-span-2',
    wide: 'col-span-1 sm:col-span-4 lg:col-span-4',
    full: 'col-span-1 sm:col-span-6 lg:col-span-12',
  };

  const cardHeight = 144; // px — valor médio entre o pequeno (96) e o original (aspect-square ~200px)

  return (
    <div
      onClick={handleClick}
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{ animationDelay: `${index * 80}ms`, minHeight: `${cardHeight}px`, height: `${cardHeight}px` }}
      className={[
        'group relative w-full text-left rounded-2xl border-2 transition-all duration-300',
        'bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm',
        'border-zinc-200 dark:border-zinc-800',
        'shadow-sm',
        sizeClasses[size] || sizeClasses.normal,
        module.available && !isEditMode
          ? `cursor-pointer hover:shadow-2xl hover:-translate-y-1.5 ${colors.glow} ${colors.border} hover:border-opacity-80`
          : '',
        isEditMode ? 'cursor-move ring-2 ring-emerald-500/20' : '',
        isDragged ? 'opacity-50 scale-95' : 'opacity-100',
        !module.available ? 'opacity-45 cursor-not-allowed' : '',
        'animate-in fade-in slide-in-from-bottom-4 duration-500',
        'overflow-hidden flex flex-col justify-between',
      ].join(' ')}
    >
      {/* Gradient top strip — always visible subtly, bright on hover */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${colors.gradient} opacity-25 group-hover:opacity-100 transition-all duration-300`} />

      {/* Background sophisticated gradient */}
      {module.available && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
          {/* Subtle gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${
            module.color === 'indigo' ? 'from-indigo-500/[0.03] via-violet-500/[0.01] to-transparent' :
            module.color === 'emerald' ? 'from-emerald-500/[0.03] via-teal-500/[0.01] to-transparent' :
            module.color === 'cyan' ? 'from-cyan-500/[0.03] via-sky-500/[0.01] to-transparent' :
            module.color === 'rose' ? 'from-rose-500/[0.03] via-pink-500/[0.01] to-transparent' :
            module.color === 'spacegray' ? 'from-slate-500/[0.04] via-zinc-500/[0.02] to-transparent' :
            'from-amber-500/[0.03] via-orange-500/[0.01] to-transparent'
          } dark:${
            module.color === 'indigo' ? 'from-indigo-500/[0.06] via-violet-500/[0.02] to-transparent' :
            module.color === 'emerald' ? 'from-emerald-500/[0.06] via-teal-500/[0.02] to-transparent' :
            module.color === 'cyan' ? 'from-cyan-500/[0.06] via-sky-500/[0.02] to-transparent' :
            module.color === 'rose' ? 'from-rose-500/[0.06] via-pink-500/[0.02] to-transparent' :
            module.color === 'spacegray' ? 'from-slate-500/[0.08] via-zinc-500/[0.04] to-transparent' :
            'from-amber-500/[0.06] via-orange-500/[0.02] to-transparent'
          }`} />

          {/* Radial glow at the bottom-right corner */}
          <div className={`absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-3xl opacity-15 dark:opacity-25 bg-gradient-to-br ${colors.gradient}`} />
        </div>
      )}

      {/* Background Icon Watermark acting as the "Background Image" */}
      {iconMap[module.id] && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0 select-none">
          <div className={[
            'transition-all duration-500 ease-out transform group-hover:scale-110 group-hover:rotate-6',
            module.color === 'indigo' ? 'text-indigo-500/5 dark:text-indigo-400/5 group-hover:text-indigo-500/10' :
            module.color === 'emerald' ? 'text-emerald-500/5 dark:text-emerald-400/5 group-hover:text-emerald-500/10' :
            module.color === 'cyan' ? 'text-cyan-500/5 dark:text-cyan-400/5 group-hover:text-cyan-500/10' :
            module.color === 'rose' ? 'text-rose-500/5 dark:text-rose-400/5 group-hover:text-rose-500/10' :
            module.color === 'spacegray' ? 'text-slate-500/5 dark:text-zinc-500/5 group-hover:text-slate-500/10' :
            'text-amber-500/5 dark:text-amber-400/5 group-hover:text-amber-500/10'
          ].join(' ')}>
            {React.cloneElement(iconMap[module.id] as any, { 
              size: size === 'normal' ? 64 : size === 'wide' ? 72 : 80, 
              strokeWidth: 1.2
            })}
          </div>
        </div>
      )}

      <div className="p-3 relative z-10 flex flex-col justify-between h-full w-full">
        {/* Top row: icon badge + action button */}
        <div className="flex items-start justify-between">
          {/* Small themed icon badge */}
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl ${colors.icon} transition-all duration-300 group-hover:scale-110`}>
            {iconMap[module.id] && React.cloneElement(iconMap[module.id] as any, { size: 16, strokeWidth: 2 })}
          </div>

          {!module.available ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              <Lock size={9} />
              Em breve
            </span>
          ) : isEditMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCycleSize();
              }}
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-700 dark:text-zinc-200 shadow-sm border border-zinc-300 dark:border-zinc-700 cursor-pointer"
            >
              Tam: {size === 'normal' ? 'P' : size === 'wide' ? 'M' : 'G'}
            </button>
          ) : (
            <span className={`flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}>
              <ArrowUpRight size={12} />
            </span>
          )}
        </div>

        {/* Bottom row: module name + description */}
        <div className="flex flex-col gap-0.5 mt-auto">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 leading-tight tracking-tight">
            {module.label}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-snug line-clamp-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-10 group-hover:opacity-100 transition-all duration-300 ease-out">
            {module.description}
          </p>
        </div>
      </div>
    </div>
  );
};

const HubHome: React.FC<HubHomeProps> = ({ 
  userName, theme, toggleTheme, onLogout, bgType, 
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
  }>({ tasks: [], studies: [], workouts: [], finances: [] });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [hasPastPendingEvents, setHasPastPendingEvents] = useState(false);

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

  const fetchCalendarData = useCallback(async (date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const { data: dbTasks } = await supabase
        .from('tarefas')
        .select('id, text, due_date, completed, due_time, category')
        .eq('user_id', user.id);

      const { data: dbWorkouts } = await supabase
        .from('saude_treinos')
        .select('id, type, date, status, muscles')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: dbFinances } = await supabase
        .from('financas_transacoes')
        .select('id, name, amount, type, date, pending')
        .eq('user_id', user.id)
        .eq('type', 'saida')
        .eq('pending', true)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: dbConcursos } = await supabase
        .from('concursos')
        .select('*')
        .eq('user_id', user.id);

      const { data: dbSimulados } = await supabase
        .from('simulados')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      // Normalizar simulados para lidar com o novo formato do campo JSONB 'results'
      const normalizedSimulados = (dbSimulados || []).map((s: any) => {
        let durationInMinutes = s.duration_minutes || 0;
        let results = s.results;
        
        if (s.results && !Array.isArray(s.results) && typeof s.results === 'object') {
          durationInMinutes = s.results.durationInMinutes || 0;
          results = s.results.subjectResults || [];
        }
        
        return {
          ...s,
          durationInMinutes,
          results
        };
      });

      const studyTasksFiltered = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
      const scheduledStudiesFiltered = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');
      const simuladosFiltered = normalizedSimulados;

      // Filter out individual simulado study sessions from scheduled studies
      const nonSimuladoScheduledStudies = scheduledStudiesFiltered.filter((s: any) => s.activityType !== 'Simulado');

      // Helper to parse notes group
      const parseNotesGroup = (notes: string) => {
        const match = notes?.match(/^\[groupId:([^\]]+)\](.*)/s);
        if (match) {
          return { groupId: match[1], cleanNotes: match[2].trim() };
        }
        return { groupId: null, cleanNotes: notes || '' };
      };

      // Group nonSimuladoScheduledStudies by groupId
      const groupedMap = new Map<string, any[]>();
      const nonGroupedStudies: any[] = [];

      nonSimuladoScheduledStudies.forEach((s: any) => {
        if (s.notes) {
          const { groupId } = parseNotesGroup(s.notes);
          if (groupId) {
            if (!groupedMap.has(groupId)) {
              groupedMap.set(groupId, []);
            }
            groupedMap.get(groupId)!.push(s);
            return;
          }
        }
        nonGroupedStudies.push(s);
      });

      const groupedStudies = Array.from(groupedMap.entries()).map(([groupId, list]) => {
        const first = list[0];
        const totalDuration = list.reduce((acc, item) => acc + (item.durationInMinutes || 0), 0);
        return {
          id: first.id,
          activityType: first.activityType,
          durationInMinutes: totalDuration,
          date: first.date,
          status: first.status,
          notes: first.notes,
          subjectId: first.subjectId
        };
      });

      const consolidatedStudies = [...nonGroupedStudies, ...groupedStudies];

      const subjectMap = new Map<string, any>();
      if (dbConcursos) {
        dbConcursos.forEach((c: any) => {
          const subjectsList = c.subjects || [];
          subjectsList.forEach((sub: any) => {
            subjectMap.set(sub.id, sub);
          });
        });
      }

      const studiesList = [
        ...studyTasksFiltered.map((t: any) => ({ 
          id: t.id, 
          text: t.subjectName + ' - ' + (t.topicName || 'Geral'), 
          date: t.date, 
          completed: t.done 
        })),
        ...consolidatedStudies.map((s: any) => {
          const sub = subjectMap.get(s.subjectId);
          const subjectName = sub ? sub.name : 'Disciplina';
          const isCompleted = s.status === 'realizado';
          const text = !isCompleted
            ? `${subjectName} - ${s.activityType} (${s.durationInMinutes || 0} min)`
            : `${s.activityType} (${s.durationInMinutes || 0} min)`;
          return {
            id: s.id,
            text,
            date: s.date?.split('T')[0],
            completed: isCompleted
          };
        }),
        ...simuladosFiltered.map((sim: any) => ({
          id: sim.id,
          text: `SIMULADO: ${sim.name} (${sim.durationInMinutes || 0} min)`,
          date: sim.date?.split('T')[0] || sim.date,
          completed: true,
          isSimulado: true
        }))
      ].filter(s => s.date >= startOfMonth && s.date <= endOfMonth);

      const parsedTasks = (dbTasks || []).map(t => {
        let endDate: string | undefined = undefined;
        let dueTime = t.due_time || '';
        if (dueTime.startsWith('range:')) {
          endDate = dueTime.substring(6);
          dueTime = '';
        }
        return {
          ...t,
          due_time: dueTime,
          endDate
        };
      });

      setCalendarEvents({
        tasks: parsedTasks,
        studies: studiesList,
        workouts: dbWorkouts || [],
        finances: dbFinances || []
      });

      // Query past incomplete tasks from Supabase
      const { count: pastTasksCount } = await supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', false)
        .lt('due_date', startOfMonth);

      const hasPastTasks = (pastTasksCount || 0) > 0;
      
      const hasPastStudies = 
        studyTasksFiltered.some((t: any) => t.date && t.date < startOfMonth && !t.done) ||
        nonSimuladoScheduledStudies.some((s: any) => {
          const sDate = s.date?.split('T')[0];
          return sDate && sDate < startOfMonth && s.status !== 'realizado';
        });

      setHasPastPendingEvents(hasPastTasks || hasPastStudies);
    } catch (e) {
      console.error('Error fetching calendar data:', e);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData(calendarMonth).catch(console.error);
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

  const toggleHabit = (habitId: string) => {
    setHabitHistory(prev => {
      const todayLogs = prev[todayStr] || [];
      let newTodayLogs: string[];
      if (todayLogs.includes(habitId)) {
        newTodayLogs = todayLogs.filter(id => id !== habitId);
      } else {
        newTodayLogs = [...todayLogs, habitId];
        playSound.success();
      }
      const updated = { ...prev, [todayStr]: newTodayLogs };
      localStorage.setItem('cn_habit_history', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleHabitOnDate = (habitId: string, dateStr: string) => {
    setHabitHistory(prev => {
      const logs = prev[dateStr] || [];
      const isCompleted = logs.includes(habitId);
      if (!isCompleted) {
        playSound.success();
      }
      const updated = {
        ...prev,
        [dateStr]: isCompleted
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
      alert('Dados exportados com sucesso!');
    } catch (error) {
      console.error(error); alert('Erro ao exportar dados.');
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

      alert('Dados importados com sucesso! Recarregue a página.');
      window.location.reload();
    } catch (error) {
      console.error(error); alert('Erro ao importar dados.');
    } finally { setIsImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleResetAllData = async () => {
    if (confirm('TEM CERTEZA? Isso apagará TODOS os seus dados permanentemente.') &&
        confirm('Último aviso: Essa ação não pode ser desfeita. Confirmar reset total?')) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

        // Sync calendar events from local changes
        fetchCalendarData(calendarMonth).catch(console.error);
      } catch (e) {
        console.error('Error reloading local storage states on sync event:', e);
      }
    };
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [calendarMonth, fetchCalendarData]);

  const fetchCloudData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const localTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    // 1. Pending Tarefas
    const { data: tarefas } = await supabase
      .from('tarefas')
      .select('id, text')
      .eq('user_id', user.id)
      .eq('completed', false)
      .lte('due_date', localTodayStr);
    setPendingTarefas(tarefas?.length || 0);

    // Fetch tomorrow's tasks
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const { data: tTasks } = await supabase
      .from('tarefas')
      .select('id, text, due_time, category')
      .eq('user_id', user.id)
      .eq('completed', false)
      .eq('due_date', tomorrowStr);
    setTomorrowTasks((tTasks || []).map(t => ({ id: t.id, text: t.text, dueTime: t.due_time, category: t.category })));

    // 2. Pending Estudos
    const estudosRaw = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
    const estudos = Array.isArray(estudosRaw) ? estudosRaw : [];
    const pendingStudyTasks = estudos.filter((t: any) => t.date <= localTodayStr && !t.done).length;

    const scheduledRaw = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');
    const scheduled = Array.isArray(scheduledRaw) ? scheduledRaw : [];
    const pendingScheduled = scheduled.filter((s: any) => {
      const sDate = s.date?.split('T')[0];
      return sDate <= localTodayStr && s.status !== 'realizado';
    }).length;
    setPendingEstudos(pendingStudyTasks + pendingScheduled);

    // 3. Pending Saude
    const { data: saude } = await supabase
      .from('saude_treinos')
      .select('id, type')
      .eq('user_id', user.id)
      .lte('date', localTodayStr)
      .eq('status', 'planejado');
    setPendingSaude(saude?.length || 0);

    // 4. Finance Balance
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
      .lte('date', localTodayStr);
    
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

    // Sync calendar events from database fetch
    fetchCalendarData(calendarMonth).catch(console.error);
  }, [calendarMonth, fetchCalendarData]);

  // Fetch initial data and sync when day changes
  useEffect(() => {
    fetchCloudData().catch(err => console.error('Error fetching hub data:', err));
  }, [todayStr, fetchCloudData]);

  // Periodic poll of cloud data (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCloudData().catch(err => console.error('Error polling hub data:', err));
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchCloudData]);

  // Task limit checker running periodically
  useEffect(() => {
    if (!pushEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const checkLimitTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      // Format as YYYY-MM-DD
      const localTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const currentHourMin = now.toTimeString().slice(0, 5); // HH:MM

      const { data: todayTasks } = await supabase
        .from('tarefas')
        .select('id, text, due_date, due_time')
        .eq('user_id', user.id)
        .eq('completed', false)
        .eq('due_date', localTodayStr);

      if (todayTasks && todayTasks.length > 0) {
        let notifiedIdsList: string[] = [];
        try {
          const saved = localStorage.getItem('cn_notified_task_ids');
          notifiedIdsList = saved ? JSON.parse(saved) : [];
        } catch {}

        let updated = false;
        todayTasks.forEach(task => {
          if (!task.due_time) return;
          
          // Check if the current time has reached/passed the due_time, and we haven't notified yet
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
      }
    };

    // Run check immediately on mount/update, then every 30 seconds
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
    return (
    <div className="flex-1 h-screen overflow-y-auto flex flex-col items-center">
        {/* Mobile Header */}
        <div className="w-full md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-30 select-none">
          <button
            onClick={() => window.dispatchEvent(new Event('open-main-sidebar'))}
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 p-2 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-zinc-800 dark:text-white" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-white leading-none">Conscientemente</span>
          </div>

          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Main content */}
        <main className={`relative z-10 w-full ${showHabitsReport ? 'max-w-4xl' : 'max-w-7xl'} px-6 py-10 flex flex-col transition-all duration-300`}>

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
                  const habitTotal = Object.values(habitHistory).filter(list => list.includes(h.id)).length;
                  const habit7DayCount = last7Days.filter(day => (habitHistory[day.dateStr] || []).includes(h.id)).length;
                  const habit7DayRate = Math.round((habit7DayCount / 7) * 100);
                  const rateColor = 'bg-zinc-900 dark:bg-white';
                  const textColor = 'text-zinc-900 dark:text-white font-extrabold';
                  return (
                    <div key={h.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
                      {/* Name row */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">{h.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{habitTotal} conclusões totais</span>
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
                                  ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white shadow-sm text-white dark:text-zinc-950 font-black'
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
            {/* Module grid */}
            <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-3 w-full animate-in fade-in slide-in-from-top-2 duration-300">
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

        <div 
          onMouseEnter={() => setIsCalendarHovered(true)}
          onMouseLeave={() => setIsCalendarHovered(false)}
          style={{ opacity: isCalendarHovered ? 1 : calendarOpacity }}
          className="w-full mt-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
              
              {/* Calendário Mensal (Grade) */}
              <div className="sm:col-span-8 flex flex-col gap-2">
                {/* Header do calendário com botões de navegação */}
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays size={12} />
                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Opacity control for Calendar — only visible in edit mode */}
                    {isHomeEditMode && (
                      <div className="flex items-center gap-1 bg-zinc-100/60 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg border border-zinc-300/30 dark:border-zinc-700/50 animate-in fade-in duration-200">
                        <Sliders size={10} className="text-zinc-400 dark:text-zinc-500" />
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
                        <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 w-6 text-right">
                          {Math.round(calendarOpacity * 100)}%
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newDate = new Date(calendarMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCalendarMonth(newDate);
                      }}
                      type="button"
                      className={`p-1 hover:bg-zinc-200/30 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer ${
                        hasPastPendingEvents ? 'animate-pulse text-amber-500 dark:text-amber-400 font-black' : ''
                      }`}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newDate = new Date(calendarMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCalendarMonth(newDate);
                      }}
                      type="button"
                      className="p-1 hover:bg-zinc-200/30 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Grade do Calendário */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Dias da semana */}
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center text-[9px] font-black text-zinc-400 dark:text-zinc-650 uppercase py-1">{day}</div>
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
                      cells.push(<div key={`empty-${i}`} className="py-1.5" />);
                    }

                    // Dias do mês atual
                    for (let day = 1; day <= totalDays; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedCalendarDate;

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

                      const hasTasks = dayTasks.length > 0;
                      const hasRangeTask = dayTasks.some(t => !!t.endDate);
                      const hasStudies = dayStudies.length > 0;
                      const hasWorkouts = dayWorkouts.length > 0;
                      const hasFinances = dayFinances.length > 0;

                      cells.push(
                        <div
                          key={`day-${day}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCalendarDate(dateStr);
                          }}
                          className={`py-1.5 rounded-xl border flex flex-col items-center justify-center relative cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-sm'
                              : isToday
                                ? 'bg-zinc-200/50 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-white font-bold'
                                : hasRangeTask
                                  ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                                  : 'bg-zinc-50/40 dark:bg-zinc-900/40 border-zinc-250/60 dark:border-zinc-800/70 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-650'
                          }`}
                        >
                          <span className="text-[10px] font-black leading-none">{day}</span>
                          
                          {/* Ícones indicadores sob o dia */}
                          <div className="flex gap-0.5 mt-1 shrink-0 flex-wrap justify-center max-w-full">
                            {dayStudies.map((s, idx) => {
                              const isAtrasado = dateStr < todayStr && !s.completed;
                              return (
                                <BookOpen 
                                  key={`study-${s.id || idx}`}
                                  size={12} 
                                  className={`shrink-0 transition-all ${
                                    isAtrasado 
                                      ? 'text-purple-600 dark:text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.85)] scale-110 animate-pulse' 
                                      : 'text-purple-500/80 dark:text-purple-400/80'
                                  }`} 
                                />
                              );
                            })}
                            {dayTasks.filter(t => !t.endDate).map((t, idx) => {
                              const isAtrasado = dateStr < todayStr && !t.completed;
                              return (
                                <ListTodo 
                                  key={`task-${t.id || idx}`}
                                  size={12} 
                                  className={`shrink-0 transition-all ${
                                    isAtrasado 
                                      ? 'text-red-600 dark:text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.85)] scale-110 animate-pulse' 
                                      : 'text-red-500/80 dark:text-red-400/80'
                                  }`} 
                                />
                              );
                            })}
                            {dayFinances.map((f, idx) => {
                              const isAtrasado = dateStr < todayStr;
                              return (
                                <DollarSign 
                                  key={`finance-${f.id || idx}`}
                                  size={12} 
                                  className={`shrink-0 transition-all ${
                                    isAtrasado 
                                      ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_4px_rgba(10,185,129,0.85)] scale-110 animate-pulse' 
                                      : 'text-emerald-500/80 dark:text-emerald-400/80'
                                  }`} 
                                />
                              );
                            })}
                            {dayWorkouts.map((w, idx) => {
                              const isAtrasado = dateStr < todayStr && w.status !== 'realizado';
                              return (
                                <Activity 
                                  key={`workout-${w.id || idx}`}
                                  size={12} 
                                  className={`shrink-0 transition-all ${
                                    isAtrasado 
                                      ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_4px_rgba(59,130,246,0.85)] scale-110 animate-pulse' 
                                      : 'text-blue-500/80 dark:text-blue-400/80'
                                  }`} 
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return cells;
                  })()}
                </div>
              </div>

              {/* Lista de Compromissos do Dia (Direita) */}
              <div className="sm:col-span-4 flex flex-col gap-3 min-w-0 sm:pl-6">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                    Compromissos do Dia
                  </h4>
                  <span className="text-[8px] font-bold text-zinc-400">
                    {(() => {
                      const parts = selectedCalendarDate.split('-');
                      if (parts.length === 3) {
                        return `${parts[2]}/${parts[1]}`;
                      }
                      return '';
                    })()}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 flex flex-col">
                  {(() => {
                    const dayTasks = calendarEvents.tasks.filter(t => {
                      if (t.endDate) {
                        return t.due_date <= selectedCalendarDate && selectedCalendarDate <= t.endDate;
                      }
                      return t.due_date === selectedCalendarDate;
                    });
                    const dayStudies = calendarEvents.studies.filter(s => s.date === selectedCalendarDate);
                    const dayWorkouts = calendarEvents.workouts.filter(w => w.date === selectedCalendarDate);
                    const dayFinances = calendarEvents.finances.filter(f => f.date === selectedCalendarDate);

                    const totalCount = dayTasks.length + dayStudies.length + dayWorkouts.length + dayFinances.length;

                    if (totalCount === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-50">
                          <CheckCircle2 size={20} className="text-zinc-400 mb-1" />
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Dia Livre</p>
                        </div>
                      );
                    }

                    return (
                      <>
                         {/* Estudos */}
                         {dayStudies.map(s => {
                           const isCompleted = s.completed;
                           const isRevisao = s.text && (s.text.toLowerCase().includes('revisão') || s.text.toLowerCase().includes('revisao'));
                           return (
                             <div 
                               key={s.id} 
                               onClick={() => { window.location.hash = 'estudos'; sessionStorage.setItem('estudosActiveTab', 'calendar'); }}
                               title="Abrir no módulo de Estudos"
                               className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                 isCompleted
                                   ? 'bg-zinc-100/40 dark:bg-zinc-800/20 border border-zinc-200/25 dark:border-zinc-800/30 opacity-40'
                                   : isRevisao
                                     ? 'bg-amber-500/10 dark:bg-amber-500/10 border-2 border-amber-500/40 dark:border-amber-400/50 shadow-xs'
                                     : 'bg-purple-500/10 dark:bg-purple-500/10 border-2 border-purple-500/40 dark:border-purple-400/50 shadow-xs'
                               }`}
                             >
                               <Brain size={12} className={isCompleted ? 'text-zinc-450 dark:text-zinc-600 shrink-0' : isRevisao ? 'text-amber-500 shrink-0' : 'text-purple-500 shrink-0'} />
                               <div className="min-w-0 flex-1">
                                 <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                   isCompleted ? 'text-zinc-400 dark:text-zinc-550' : isRevisao ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'
                                 }`}>
                                   {isRevisao ? 'Revisão' : 'Estudo'} {!isCompleted && '• Pendente'}
                                 </p>
                                 <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${
                                   isCompleted ? 'line-through opacity-50' : ''
                                 }`}>{s.text}</p>
                               </div>
                             </div>
                           );
                         })}

                         {/* Tarefas */}
                         {dayTasks.map(t => {
                           const isCompleted = t.completed;
                           return (
                             <div 
                               key={t.id} 
                               onClick={() => { window.location.hash = 'tarefas'; }}
                               title="Abrir no módulo de Tarefas"
                               className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                 isCompleted
                                   ? 'bg-zinc-100/40 dark:bg-zinc-800/20 border border-zinc-200/25 dark:border-zinc-800/30 opacity-40'
                                   : 'bg-red-500/10 dark:bg-red-500/10 border-2 border-red-500/40 dark:border-red-400/50 shadow-xs'
                               }`}
                             >
                               <ListTodo size={12} className={isCompleted ? 'text-zinc-450 dark:text-zinc-600 shrink-0' : 'text-red-500 shrink-0'} />
                               <div className="min-w-0 flex-1">
                                 <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                   isCompleted ? 'text-zinc-400 dark:text-zinc-550' : 'text-red-600 dark:text-red-400'
                                 }`}>
                                   Tarefa {!isCompleted && '• Pendente'}
                                 </p>
                                 <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${
                                   isCompleted ? 'line-through opacity-50' : ''
                                 }`}>{t.text}</p>
                               </div>
                             </div>
                           );
                         })}

                         {/* Treinos */}
                         {dayWorkouts.map(w => {
                           const isCompleted = w.status === 'realizado';
                           return (
                             <div 
                               key={w.id} 
                               onClick={() => { window.location.hash = 'saude'; sessionStorage.setItem('saude_active_tab', 'planner'); }}
                               title="Abrir no módulo de Saúde"
                               className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                 isCompleted
                                   ? 'bg-zinc-100/40 dark:bg-zinc-800/20 border border-zinc-200/25 dark:border-zinc-800/30 opacity-40'
                                   : 'bg-blue-500/10 dark:bg-blue-500/10 border-2 border-blue-500/40 dark:border-blue-400/50 shadow-xs'
                               }`}
                             >
                               <Activity size={12} className={isCompleted ? 'text-zinc-450 dark:text-zinc-600 shrink-0' : 'text-blue-500 shrink-0'} />
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
                             </div>
                           );
                         })}

                         {/* Finanças */}
                         {dayFinances.map(f => (
                           <div 
                             key={f.id} 
                             onClick={() => { window.location.hash = 'financas'; sessionStorage.setItem('openAddFinancasType', 'saida'); }}
                             title="Abrir no módulo de Finanças"
                             className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/30 dark:border-emerald-400/45 shadow-xs cursor-pointer hover:scale-[1.01] transition-all duration-200"
                           >
                             <DollarSign size={12} className="text-emerald-500 shrink-0" />
                             <div className="min-w-0 flex-1">
                               <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-none">
                                 Despesa • Pendente
                               </p>
                               <p className="text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none">
                                 {f.name}
                               </p>
                             </div>
                             <span className="text-[9px] font-bold text-emerald-650 dark:text-emerald-400 shrink-0">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.amount)}
                             </span>
                           </div>
                         ))}
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>

        {/* Habit Tracker Container */}
        <div className="w-full mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Habit Tracker Section */}
            <div 
              onMouseEnter={() => setIsHabitsHovered(true)}
              onMouseLeave={() => setIsHabitsHovered(false)}
              style={{ opacity: isHabitsHovered ? 1 : habitsOpacity }}
              className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-3.5 p-3.5 overflow-hidden relative transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ClipboardList size={12} className="text-zinc-450 dark:text-zinc-500" />
                      Rastreador de Hábitos
                    </h3>
                  </div>

                  {/* Opacity control for Habit Tracker — only visible in edit mode */}
                  {isHomeEditMode && (
                    <div className="flex items-center gap-1 bg-zinc-100/60 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg border border-zinc-300/30 dark:border-zinc-700/50 animate-in fade-in duration-200">
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
                      <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 w-6 text-right">
                        {Math.round(habitsOpacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* List of habits checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                  {habits.length === 0 ? (
                    <div className="py-4 text-center text-xs text-zinc-450 dark:text-zinc-500 font-medium col-span-full">
                      Você não possui hábitos definidos. Acesse o card de Hábitos para criar.
                    </div>
                  ) : (
                    habits.map(h => {
                      const isCompleted = (habitHistory[todayStr] || []).includes(h.id);
                      return (
                        <div
                          key={h.id}
                          onClick={() => toggleHabit(h.id)}
                          className={`flex items-center gap-3 p-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                            isCompleted
                              ? 'bg-zinc-100/50 dark:bg-zinc-950/15 border-zinc-200 dark:border-zinc-900/50 opacity-60'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm'
                          }`}
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-slate-700 dark:bg-slate-600 border-slate-700 dark:border-slate-600 text-white shadow-sm shadow-slate-500/25'
                                : 'border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 group-hover:border-slate-500'
                            }`}>
                              {isCompleted && <Check size={9} strokeWidth={3} />}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold transition-all truncate leading-none ${
                            isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500 font-medium'
                              : 'text-zinc-800 dark:text-zinc-150'
                          }`}>
                            {h.name}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progress Indicator */}
              {habits.length > 0 && (
                <div className="mt-1 pt-2 border-t border-zinc-200/20 dark:border-zinc-800/20 animate-in fade-in duration-300 shrink-0">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    <span>Progresso de hoje</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length}/{habits.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200/40 dark:bg-zinc-800/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-slate-600 to-zinc-500 rounded-full transition-all duration-500"
                      style={{ width: `${(habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length / habits.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          </>
        )}
      </main>
    </div>
  );
};

export default HubHome;
