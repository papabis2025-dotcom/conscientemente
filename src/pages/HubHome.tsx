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
  setBgType: (type: 'default' | 'color' | 'image') => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  bgImage: string;
  setBgImage: (url: string) => void;
  bgImageStyle: string;
  setBgImageStyle: (style: string) => void;
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
    normal: 'col-span-1 sm:col-span-2 lg:col-span-2 lg:aspect-square',
    wide: 'col-span-1 sm:col-span-4 lg:col-span-4 lg:aspect-[2/1]',
    full: 'col-span-1 sm:col-span-6 lg:col-span-12 lg:min-h-[140px]',
  };

  return (
    <div
      onClick={handleClick}
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{ animationDelay: `${index * 80}ms` }}
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
        'overflow-hidden h-full flex flex-col justify-between',
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

      <div className="p-4 relative z-10 flex-1 flex flex-col justify-between h-full">
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 ${colors.icon} ${module.available ? '' : 'opacity-50 grayscale'}`}>
              {iconMap[module.id] ? React.cloneElement(iconMap[module.id] as React.ReactElement, { size: 16, strokeWidth: 2.5 }) : <TrendingUp size={16} />}
            </div>
            {!module.available ? (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
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
                className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-700 dark:text-zinc-200 shadow-sm border border-zinc-300 dark:border-zinc-700 cursor-pointer"
              >
                Tam: {size === 'normal' ? 'P' : size === 'wide' ? 'M' : 'G'}
              </button>
            ) : (
              <span className={`flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}>
                <ArrowUpRight size={14} />
              </span>
            )}
          </div>

          <p className="text-xs font-black text-zinc-800 dark:text-white uppercase tracking-wider mb-1">
            {module.label}
          </p>

        {/* Description removed */}
        </div>

        {module.available && (
          <div className="mt-2.5 pt-2 border-t border-zinc-150/70 dark:border-zinc-800/60 w-full shrink-0">
            <div className="flex items-center gap-1.5 w-full">
              {module.id === 'estudos' && (
                <>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'adicionar-estudo')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-indigo-100/85 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all"
                  >
                    + Estudo
                  </button>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'planner-estudos')}
                    className="flex-1 flex items-center justify-center text-center gap-1 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-violet-100/85 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-500 transition-all"
                  >
                    <Calendar size={9} /> Planner
                  </button>
                </>
              )}
              {module.id === 'saude' && (
                <button
                  onClick={(e) => handleShortcutClick(e, 'novo-treino')}
                  className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-cyan-100/85 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40 hover:bg-cyan-600 hover:text-white dark:hover:bg-cyan-500 transition-all"
                >
                  + Treino
                </button>
              )}
              {module.id === 'financas' && (
                <>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'financas-entrada')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-emerald-100/85 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 transition-all"
                  >
                    + Receita
                  </button>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'financas-saida')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-rose-100/85 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500 transition-all"
                  >
                    - Despesa
                  </button>
                </>
              )}
              {module.id === 'tarefas' && (
                <button
                  onClick={(e) => handleShortcutClick(e, 'nova-tarefa')}
                  className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-rose-100/85 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500 transition-all"
                >
                  + Tarefa
                </button>
              )}
              {module.id === 'habitos' && (
                <>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'habitos-gerenciar')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-zinc-200/85 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-zinc-700/60 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all"
                  >
                    Gerenciar
                  </button>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'habitos-relatorio')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-zinc-200/85 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-zinc-700/60 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all"
                  >
                    Relatório
                  </button>
                </>
              )}
              {module.id === 'anotacoes' && (
                <>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'anotacoes-rapida')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-amber-100/85 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 transition-all"
                  >
                    + Rápida
                  </button>
                  <button
                    onClick={(e) => handleShortcutClick(e, 'anotacoes-leitura')}
                    className="flex-1 flex items-center justify-center text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-yellow-100/85 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200/60 dark:border-yellow-800/40 hover:bg-yellow-600 hover:text-white dark:hover:bg-yellow-500 transition-all"
                  >
                    + Leitura
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HubHome: React.FC<HubHomeProps> = ({ 
  userName, theme, toggleTheme, onLogout, 
  bgType, setBgType, bgColor, setBgColor, 
  bgImage, setBgImage, bgImageStyle, setBgImageStyle 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

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
        .eq('user_id', user.id)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth);

      const { data: dbWorkouts } = await supabase
        .from('saude_treinos')
        .select('id, type, date, status')
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

      const activeConcursoId = localStorage.getItem('cp_selected_concurso_id') || 'all';
      let activeSubjectIds = new Set<string>();
      if (activeConcursoId !== 'all' && dbConcursos) {
        const activeConc = dbConcursos.find((c: any) => c.id === activeConcursoId);
        if (activeConc) {
          const subjectsList = activeConc.subjects || [];
          subjectsList.forEach((s: any) => activeSubjectIds.add(s.id));
        }
      }

      const studyTasksRaw = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
      const scheduledStudiesRaw = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');

      let studyTasksFiltered = studyTasksRaw;
      let scheduledStudiesFiltered = scheduledStudiesRaw;
      let simuladosFiltered = dbSimulados || [];

      if (activeConcursoId !== 'all') {
        studyTasksFiltered = studyTasksRaw.filter((t: any) => activeSubjectIds.has(t.subjectId));
        scheduledStudiesFiltered = scheduledStudiesRaw.filter((s: any) => activeSubjectIds.has(s.subjectId));
        simuladosFiltered = (dbSimulados || []).filter((sim: any) => 
          sim.results && sim.results.some((r: any) => activeSubjectIds.has(r.subjectId))
        );
      }

      // Filter out individual simulado study sessions from scheduled studies
      const nonSimuladoScheduledStudies = scheduledStudiesFiltered.filter((s: any) => s.activityType !== 'Simulado');

      const studiesList = [
        ...studyTasksFiltered.map((t: any) => ({ 
          id: t.id, 
          text: t.subjectName + ' - ' + (t.topicName || 'Geral'), 
          date: t.date, 
          completed: t.done 
        })),
        ...nonSimuladoScheduledStudies.map((s: any) => ({ 
          id: s.id, 
          text: s.activityType + ' (' + (s.durationInMinutes || 0) + ' min)', 
          date: s.date?.split('T')[0], 
          completed: s.status === 'realizado' 
        })),
        ...simuladosFiltered.map((sim: any) => ({
          id: sim.id,
          text: `🏆 SIMULADO: ${sim.name} (${sim.duration_minutes || sim.durationInMinutes || 0} min)`,
          date: sim.date?.split('T')[0] || sim.date,
          completed: true,
          isSimulado: true
        }))
      ].filter(s => s.date >= startOfMonth && s.date <= endOfMonth);

      setCalendarEvents({
        tasks: dbTasks || [],
        studies: studiesList,
        workouts: dbWorkouts || [],
        finances: dbFinances || []
      });
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

  const [isHomeEditMode, setIsHomeEditMode] = useState(false);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          localStorage.setItem('cn_custom_bg_image', compressedBase64);
          setBgImage(compressedBase64);
          setBgType('image');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        alert('✅ Todos os dados foram apagados. O sistema foi resetado.');
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert('Erro ao resetar dados.');
      }
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

  const handleTogglePushNotifications = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPushEnabled(true);
        localStorage.setItem('cn_push_notifications_enabled', 'true');
        triggerLocalNotification('Notificações Ativas 🔔', 'Você receberá alertas das tarefas limite.');
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
  const last30DaysList = getDaysInMonthList();

  return (
    <div 
      className={`min-h-screen ${bgType === 'default' ? 'bg-zinc-50 dark:bg-zinc-950' : 'bg-transparent'} flex relative overflow-hidden transition-colors duration-300`}
    >

      {/* Backdrop para menu mobile */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" 
        />
      )}

      {/* Sidebar Esquerda */}
      <aside 
        className={`fixed md:relative z-50 md:z-20 h-screen flex flex-col justify-between py-6 border-r border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 md:bg-white/50 md:dark:bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0 ${
          sidebarExpanded ? 'w-64 px-5' : 'w-20 px-3'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6 w-full">
          {/* Logo & Branding */}
          <div 
            className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-zinc-950/5 dark:bg-white/5 text-zinc-900 dark:text-white shrink-0 ${
              sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
            }`}
            title="Conscientemente"
          >
            <Brain size={16} className="text-zinc-900 dark:text-white shrink-0" />
            {sidebarExpanded && (
              <span className="text-[10px] font-black uppercase tracking-wider select-none animate-in fade-in duration-200">
                Conscientemente
              </span>
            )}
          </div>

          {/* Clock & Date */}
          {sidebarExpanded && (
            <div className="flex flex-col px-3 py-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-800/40 animate-in fade-in duration-200 select-none">
              <span className="text-lg font-black text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                {timeStr}
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 capitalize mt-1 tracking-wide">
                {dateStr}
              </span>
            </div>
          )}

          {/* Welcome User */}
          {sidebarExpanded && (
            <div className="px-3 select-none flex flex-col gap-0.5 animate-in fade-in duration-200">
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none">Boas-vindas de volta,</span>
              <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate mt-1">{userName}</span>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60 w-full" />

          {/* Navigation Items / Buttons */}
          <nav className="flex flex-col gap-2 w-full">
            {/* Popover de Notificações */}
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => {
                  setShowNotificationsPopover(!showNotificationsPopover);
                  requestNotificationPermission();
                }}
                className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-850/50 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all hover:scale-102 hover:shadow-sm ${
                  sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
                }`}
                title="Notificações"
              >
                <div className="relative flex items-center justify-center shrink-0">
                  <Bell size={16} className={unreadCount > 0 ? "animate-pulse text-rose-500" : ""} />
                  {unreadCount > 0 && !sidebarExpanded && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </div>
                {sidebarExpanded && (
                  <span className="text-[10px] font-black uppercase tracking-wider shrink-0">
                    Notificações
                  </span>
                )}
                {sidebarExpanded && unreadCount > 0 && (
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[8px] font-black bg-rose-500 text-white leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsPopover && (
                <div className="absolute left-full top-0 ml-3 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 p-4 animate-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Notificações</span>
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
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700'
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
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug break-words font-medium">
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

            {/* Configurações */}
            <button
              onClick={() => { setShowSettingsModal(true); fetchLogs(); setMobileMenuOpen(false); }}
              className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all hover:scale-102 hover:shadow-sm ${
                sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
              }`}
              title="Configurações"
            >
              <Settings size={16} />
              {sidebarExpanded && (
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Configurações
                </span>
              )}
            </button>

            {/* Preferências de Usuário */}
            <button
              onClick={() => { setShowProfileModal(true); setMobileMenuOpen(false); }}
              className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all hover:scale-102 hover:shadow-sm ${
                sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
              }`}
              title="Preferências"
            >
              <User size={16} />
              {sidebarExpanded && (
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Preferências
                </span>
              )}
            </button>

            {/* Alternador de Tema */}
            <button
              onClick={toggleTheme}
              className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all hover:scale-102 hover:shadow-sm ${
                sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
              }`}
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {sidebarExpanded && (
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                </span>
              )}
            </button>

            {/* Ajustar Layout */}
            <button
              onClick={() => setIsHomeEditMode(!isHomeEditMode)}
              className={`w-full h-11 rounded-xl flex items-center gap-3 border transition-all hover:scale-102 hover:shadow-sm ${
                isHomeEditMode
                  ? 'bg-emerald-500 text-white border-emerald-500 font-extrabold shadow-sm'
                  : 'border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
              } ${
                sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
              }`}
              title={isHomeEditMode ? 'Salvar Layout' : 'Ajustar Layout'}
            >
              <Sliders size={16} />
              {sidebarExpanded && (
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isHomeEditMode ? 'Salvar Layout' : 'Ajustar Layout'}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Footer Sidebar (Logout & Collapse Control) */}
        <div className="flex flex-col gap-2 w-full">
          {/* Botão Sair */}
          <button
            onClick={onLogout}
            className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300/50 dark:hover:border-rose-900/50 transition-all hover:scale-102 hover:shadow-sm ${
              sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
            }`}
            title="Sair"
          >
            <LogOut size={16} />
            {sidebarExpanded && (
              <span className="text-[10px] font-black uppercase tracking-wider">
                Sair
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60 w-full my-1" />

          {/* Toggle Sidebar Button */}
          <button
            onClick={toggleSidebar}
            className="w-full h-9 rounded-xl flex items-center justify-center border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title={sidebarExpanded ? "Recolher Menu" : "Expandir Menu"}
          >
            {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </aside>

      {/* Wrapper do Conteúdo Principal com Centralização */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col items-center">
        {/* Mobile Header */}
        <div className="w-full md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-30 select-none">
          <button
            onClick={() => setMobileMenuOpen(true)}
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
            {/* Section label — Módulos */}
            <div 
              onClick={toggleModules}
          className="flex items-center gap-3 mb-4 cursor-pointer group/section select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">Módulos</p>
          <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-800" />
          
          <button 
            type="button"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            title={modulesCollapsed ? 'Expandir Módulos' : 'Minimizar Módulos'}
          >
            {modulesCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Module grid */}
        {!modulesCollapsed && (
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
        )}

        {/* Section label — Calendário Unificado */}
        <div 
          onClick={toggleCalendar}
          className="flex items-center gap-3 mt-8 mb-4 cursor-pointer group/section select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">Calendário Unificado</p>
          <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-800" />
          
          <button 
            type="button"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            title={calendarCollapsed ? 'Expandir Calendário' : 'Minimizar Calendário'}
          >
            {calendarCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {!calendarCollapsed && (
          <div className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 opacity-95 hover:opacity-100 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
              
              {/* Calendário Mensal (Grade) */}
              <div className="sm:col-span-4 flex flex-col gap-2">
                {/* Header do calendário com botões de navegação */}
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays size={12} />
                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newDate = new Date(calendarMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCalendarMonth(newDate);
                      }}
                      type="button"
                      className="p-1 hover:bg-zinc-200/30 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer"
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
                      cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                    }

                    // Dias do mês atual
                    for (let day = 1; day <= totalDays; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedCalendarDate;

                      // Filtrar eventos do dia
                      const dayTasks = calendarEvents.tasks.filter(t => t.due_date === dateStr);
                      const dayStudies = calendarEvents.studies.filter(s => s.date === dateStr);
                      const dayWorkouts = calendarEvents.workouts.filter(w => w.date === dateStr);
                      const dayFinances = calendarEvents.finances.filter(f => f.date === dateStr);

                      const hasTasks = dayTasks.length > 0;
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
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-sm'
                              : isToday
                                ? 'bg-zinc-200/50 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-white font-bold'
                                : 'bg-white/10 dark:bg-zinc-900/10 border-zinc-200/10 dark:border-zinc-800/10 text-zinc-750 dark:text-zinc-350 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <span className="text-[10px] font-black leading-none">{day}</span>
                          
                          {/* Bolinhas indicadoras sob o dia */}
                          <div className="flex gap-1 mt-1 shrink-0">
                            {hasStudies && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm" />}
                            {hasTasks && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />}
                            {hasFinances && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />}
                            {hasWorkouts && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />}
                          </div>
                        </div>
                      );
                    }

                    return cells;
                  })()}
                </div>
              </div>

              {/* Lista de Compromissos do Dia (Direita) */}
              <div className="sm:col-span-8 flex flex-col gap-3 min-w-0 sm:border-l sm:border-zinc-200/20 dark:sm:border-zinc-800/20 sm:pl-6">
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

                <div className="flex-1 overflow-y-auto max-h-[190px] pr-1 space-y-1.5 flex flex-col">
                  {(() => {
                    const dayTasks = calendarEvents.tasks.filter(t => t.due_date === selectedCalendarDate);
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
                        {dayStudies.map(s => (
                          <div key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-purple-550/5 dark:bg-purple-500/5 border border-purple-500/10 dark:border-purple-500/15 hover:bg-purple-500/10 transition-colors">
                            <Brain size={12} className="text-purple-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider leading-none">Estudo</p>
                              <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${s.completed ? 'line-through opacity-50' : ''}`}>{s.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Tarefas */}
                        {dayTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl bg-red-550/5 dark:bg-red-500/5 border border-red-500/10 dark:border-red-500/15 hover:bg-red-550/10 transition-colors">
                            <ListTodo size={12} className="text-red-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider leading-none">Tarefa</p>
                              <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${t.completed ? 'line-through opacity-50' : ''}`}>{t.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Treinos */}
                        {dayWorkouts.map(w => (
                          <div key={w.id} className="flex items-center gap-2 p-2 rounded-xl bg-blue-550/5 dark:bg-blue-500/5 border border-blue-500/10 dark:border-blue-500/15 hover:bg-blue-550/10 transition-colors">
                            <Activity size={12} className="text-blue-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider leading-none">Treino</p>
                              <p className={`text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none ${w.status === 'realizado' ? 'line-through opacity-50' : ''}`}>{w.type}</p>
                            </div>
                          </div>
                        ))}

                        {/* Finanças */}
                        {dayFinances.map(f => (
                          <div key={f.id} className="flex items-center gap-2 p-2 rounded-xl bg-emerald-550/5 dark:bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/15 hover:bg-emerald-550/10 transition-colors">
                            <DollarSign size={12} className="text-emerald-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-none">Despesa</p>
                              <p className="text-[10px] font-bold text-zinc-750 dark:text-zinc-200 truncate mt-0.5 leading-none">{f.name}</p>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-500 shrink-0">
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
        )}

        {/* Widgets section label */}
        <div 
          onClick={toggleWidgets}
          className="flex items-center gap-3 mt-8 mb-4 cursor-pointer group/section select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">Widgets</p>
          <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-800" />
          
          <button 
            type="button"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            title={widgetsCollapsed ? 'Expandir Widgets' : 'Minimizar Widgets'}
          >
            {widgetsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Habit Tracker Container */}
        {!widgetsCollapsed && (
          <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Habit Tracker Section */}
            <div className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-3.5 p-4 overflow-hidden relative opacity-95 hover:opacity-100 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ClipboardList size={12} className="text-zinc-450 dark:text-zinc-500" />
                      Rastreador de Hábitos
                    </h3>
                  </div>
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
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isCompleted
                              ? 'bg-zinc-200/20 dark:bg-zinc-950/10 border-zinc-200/10 dark:border-zinc-900/10 opacity-40'
                              : 'bg-white/20 dark:bg-zinc-900/10 border-zinc-200/30 dark:border-zinc-850/40 hover:border-zinc-350 dark:hover:border-zinc-700 hover:shadow-sm'
                          }`}
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-zinc-950 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-950'
                                : 'border-zinc-350 dark:border-zinc-700 bg-transparent'
                            }`}>
                              {isCompleted && <Check size={9} strokeWidth={3} />}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold transition-all truncate leading-none ${
                            isCompleted
                              ? 'line-through text-zinc-450 dark:text-zinc-500 font-medium'
                              : 'text-zinc-650 dark:text-zinc-300'
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
                  <div className="w-full h-1 bg-zinc-200/40 dark:bg-zinc-800/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-450 dark:bg-zinc-500 transition-all duration-500"
                      style={{ width: `${(habits.filter(h => (habitHistory[todayStr] || []).includes(h.id)).length / habits.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          </>
        )}
      </main>
    </div>

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
                   <h3 className="font-bold text-lg flex items-center gap-2 text-zinc-800 dark:text-white"><Database size={20} className="text-zinc-500" /> Backup de Dados</h3>
                   <p className="text-sm text-zinc-500 leading-relaxed">Exporte ou importe seus dados do Supabase.</p>
                   <div className="flex flex-col gap-3">
                     <button onClick={handleExport} disabled={isExporting} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-900 dark:hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                       {isExporting ? '⏳ Exportando...' : 'Exportar JSON'}
                     </button>
                     <button onClick={() => fileRef.current?.click()} disabled={isImporting} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                       {isImporting ? '⏳ Importando...' : 'Importar JSON'}
                     </button>
                     <input type="file" ref={fileRef} onChange={handleImport} className="hidden" accept=".json" />
                   </div>
                 </div>
                 
                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                   <h3 className="font-bold text-lg flex items-center gap-2 text-zinc-800 dark:text-white"><Cloud size={20} className="text-zinc-500" /> Sincronização</h3>
                   <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex justify-between items-center border border-emerald-100 dark:border-emerald-800">
                     <div>
                       <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Status</p>
                       <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">Conectado ao Supabase</p>
                     </div>
                     <CheckCircle2 size={24} className="text-emerald-500" />
                   </div>
                   <p className="text-xs text-zinc-500">Seus dados estão sendo salvos automaticamente na nuvem.</p>
                 </div>
                 
                 <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 shadow-sm space-y-6 md:col-span-2">
                   <h3 className="font-bold text-lg flex items-center gap-2 text-rose-600 dark:text-rose-400"><AlertTriangle size={20} /> Zona de Perigo</h3>
                   <button onClick={handleResetAllData} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95">
                     FÁBRICA: Resetar Tudo
                   </button>
                 </div>
               </div>

               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
                 <h3 className="font-bold text-lg flex items-center gap-2 mb-6 text-zinc-800 dark:text-white"><FileText size={20} className="text-zinc-500" /> Logs do Sistema</h3>
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
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Notificações Push</p>
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-zinc-800 dark:text-white">Receber alertas de tarefas no limite</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Notifica você no celular quando uma tarefa agendada chega ao horário limite.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={pushEnabled} 
                        onChange={handleTogglePushNotifications}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Efeitos Sonoros</p>
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-zinc-800 dark:text-white">Habilitar efeitos sonoros</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Ativa ou desativa sons sofisticados em cliques e conclusões de tarefas.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={soundEnabled} 
                        onChange={handleToggleSound}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Personalização de Fundo</p>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                   <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-3 ${bgType === 'image' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'}`}>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${bgType === 'image' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400'}`}>Imagem</span>
                     <button 
                       onClick={() => document.getElementById('custom-bg-input')?.click()} 
                       className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-3 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors truncate"
                     >
                       {bgImage ? 'Alterar Imagem' : 'Selecionar'}
                     </button>
                     <input 
                       id="custom-bg-input" 
                       type="file" 
                       onChange={handleImageUpload} 
                       accept="image/*" 
                       className="hidden" 
                     />
                   </div>
                 </div>

                 {bgType === 'image' && (
                   <div className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Ajuste da Imagem</label>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {[
                         { val: 'cover', label: 'Preenchida' },
                         { val: 'contain', label: 'Ajustada' },
                         { val: 'center', label: 'Centralizada' },
                         { val: 'repeat', label: 'Lado a lado' }
                       ].map(opt => (
                         <button
                           key={opt.val}
                           onClick={() => {
                             localStorage.setItem('cn_custom_bg_style', opt.val);
                             setBgImageStyle(opt.val);
                           }}
                           className={`py-2 px-1 text-[10px] font-bold uppercase tracking-wider rounded-xl border text-center transition-all ${bgImageStyle === opt.val ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-black' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-700'}`}
                         >
                           {opt.label}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubHome;
