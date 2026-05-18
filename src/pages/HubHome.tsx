import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MODULES } from '../constants';
import { Module } from '../types';
import { LogOut, Sun, Moon, ArrowUpRight, Lock, BookOpen, Wallet, ListTodo, Brain, ChevronRight, Sparkles } from 'lucide-react';

interface HubHomeProps {
  userName: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
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

const moduleIcons: Record<string, React.ReactNode> = {
  estudos: <BookOpen size={22} />,
  financas: <Wallet size={22} />,
  saude: <span className="text-xl leading-none">🏃</span>,
  tarefas: <ListTodo size={22} />,
};

const ModuleCard: React.FC<{ module: Module; index: number }> = ({ module, index }) => {
  const colors = colorMap[module.color] ?? colorMap.indigo;

  const handleClick = () => {
    if (!module.available) return;
    window.location.hash = module.route;
  };

  return (
    <button
      onClick={handleClick}
      disabled={!module.available}
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
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors.icon} transition-transform duration-300 group-hover:scale-110`}>
            {moduleIcons[module.id] ?? <span className="text-xl">{module.emoji}</span>}
          </div>

          {/* Badge / Arrow */}
          {!module.available ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
              <Lock size={9} />
              Em breve
            </span>
          ) : (
            <span className={`flex items-center justify-center w-7 h-7 rounded-full ${colors.icon} opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}>
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
          <div className={`mt-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 ${colorMap[module.color]?.badge.split(' ').filter(c => c.startsWith('text-')).join(' ') ?? 'text-zinc-500'}`}>
            Acessar módulo <ChevronRight size={10} />
          </div>
        )}
      </div>
    </button>
  );
};

const HubHome: React.FC<HubHomeProps> = ({ userName, theme, toggleTheme, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingTarefas, setPendingTarefas] = useState(0);
  const [pendingEstudos, setPendingEstudos] = useState(0);
  const [financeBalance, setFinanceBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  useEffect(() => {
    try {
      const tarefasRaw = JSON.parse(localStorage.getItem('cn_tarefas') || '[]');
      const tarefas = Array.isArray(tarefasRaw) ? tarefasRaw : [];
      setPendingTarefas(tarefas.filter((t: any) => !t.completed && t.dueDate === todayStr).length);

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

      const financasRaw = JSON.parse(localStorage.getItem('cn_financas') || '[]');
      const financas = Array.isArray(financasRaw) ? financasRaw : [];
      const currentMonthStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
      const monthTransactions = financas.filter((t: any) => t.date?.startsWith(currentMonthStr));
      const entradas = monthTransactions.filter((t: any) => t.type === 'entrada').reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
      const saidas = monthTransactions.filter((t: any) => t.type === 'saida').reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
      setFinanceBalance(entradas - saidas);
    } catch (e) {
      console.error(e);
    }
  }, [todayStr]);

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const firstName = userName.split(' ')[0];

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col relative overflow-hidden transition-colors duration-300`}>

      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-400/10 dark:bg-indigo-600/8 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-400/10 dark:bg-violet-600/8 blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-sky-400/5 dark:bg-sky-500/5 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-widest leading-none">
              Conscientemente
            </h1>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">Sistema operacional pessoal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col">

        {/* Hero section */}
        <div className={`mb-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Greeting */}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-amber-400" />
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{greeting()}</p>
          </div>
          <h2 className="text-3xl font-black text-zinc-800 dark:text-white tracking-tight mb-1">
            {firstName} <span className="text-zinc-300 dark:text-zinc-600">👋</span>
          </h2>

          {/* Live clock widget */}
          <div className="mt-4 inline-flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col">
              <span className="font-black text-zinc-800 dark:text-white text-lg leading-none tracking-tight tabular-nums">
                {timeStr}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium capitalize mt-0.5">
                {dateStr}
              </span>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Ao vivo</span>
            </div>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {pendingTarefas > 0 ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-500/20">
                <ListTodo size={11} />
                {pendingTarefas} {pendingTarefas === 1 ? 'tarefa' : 'tarefas'} hoje
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                <ListTodo size={11} />
                Dia livre
              </span>
            )}

            {pendingEstudos > 0 ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-500/20">
                <BookOpen size={11} />
                {pendingEstudos} {pendingEstudos === 1 ? 'estudo pendente' : 'estudos pendentes'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                <BookOpen size={11} />
                Estudos ok ✓
              </span>
            )}

            {financeBalance !== null && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                financeBalance >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              }`}>
                <Wallet size={11} />
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financeBalance)}
              </span>
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

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">
            Conscientemente · v0.1 · Seu sistema operacional pessoal
          </p>
        </div>
      </main>
    </div>
  );
};

export default HubHome;
