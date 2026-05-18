import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MODULES } from '../constants';
import { Module } from '../types';
import { LogOut, Sun, Moon, ArrowUpRight, Lock, CheckCircle2, BookOpen, Wallet } from 'lucide-react';

interface HubHomeProps {
  userName: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
}

const accentMap: Record<string, string> = {
  indigo: 'text-indigo-500 dark:text-indigo-400',
  emerald: 'text-emerald-500 dark:text-emerald-400',
  cyan: 'text-cyan-500 dark:text-cyan-400',
  rose: 'text-rose-500 dark:text-rose-400',
  amber: 'text-amber-500 dark:text-amber-400',
};

const borderAccentMap: Record<string, string> = {
  indigo: 'hover:border-indigo-400/60 dark:hover:border-indigo-500/50',
  emerald: 'hover:border-emerald-400/60 dark:hover:border-emerald-500/50',
  cyan: 'hover:border-cyan-400/60 dark:hover:border-cyan-500/50',
  rose: 'hover:border-rose-400/60 dark:hover:border-rose-500/50',
  amber: 'hover:border-amber-400/60 dark:hover:border-amber-500/50',
};

function greeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Bom dia, ${name}`;
  if (hour < 18) return `Boa tarde, ${name}`;
  return `Boa noite, ${name}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

const ModuleCard: React.FC<{ module: Module }> = ({ module }) => {
  const accentClass = accentMap[module.color] ?? 'text-zinc-500';
  const hoverBorderClass = borderAccentMap[module.color] ?? '';

  const handleClick = () => {
    if (!module.available) return;
    window.location.hash = module.route;
  };

  return (
    <button
      onClick={handleClick}
      disabled={!module.available}
      className={[
        'group relative w-full text-left p-5 rounded-2xl border transition-all duration-200',
        'bg-white dark:bg-zinc-900',
        'border-zinc-200 dark:border-zinc-800',
        module.available
          ? `cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${hoverBorderClass}`
          : 'opacity-60 cursor-not-allowed',
      ].join(' ')}
    >
      {/* Lock badge for unavailable */}
      {!module.available && (
        <span className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          <Lock size={10} />
          Em breve
        </span>
      )}

      {/* Arrow for available */}
      {module.available && (
        <span className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${accentClass}`}>
          <ArrowUpRight size={16} />
        </span>
      )}

      <div className="flex items-start gap-4">
        {/* Emoji icon */}
        <span className="text-2xl leading-none mt-0.5 select-none">{module.emoji}</span>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-black uppercase tracking-wider mb-1 ${accentClass}`}>
            {module.label}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            {module.description}
          </p>
        </div>
      </div>
    </button>
  );
};

const HubHome: React.FC<HubHomeProps> = ({ userName, theme, toggleTheme, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingTarefas, setPendingTarefas] = useState(0);
  const [pendingEstudos, setPendingEstudos] = useState(0);
  const [financeBalance, setFinanceBalance] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  useEffect(() => {
    try {
      const tarefasRaw = JSON.parse(localStorage.getItem('cn_tarefas') || '[]');
      const tarefas = Array.isArray(tarefasRaw) ? tarefasRaw : [];
      const todayTarefas = tarefas.filter((t: any) => !t.completed && t.dueDate === todayStr);
      setPendingTarefas(todayTarefas.length);

      const estudosRaw = JSON.parse(localStorage.getItem('cp_study_tasks') || '[]');
      const estudos = Array.isArray(estudosRaw) ? estudosRaw : [];
      const pendingEstudosList = estudos.filter((t: any) => t.date === todayStr && !t.done);

      const scheduledStudiesRaw = JSON.parse(localStorage.getItem('cp_scheduled_studies') || '[]');
      const scheduledStudies = Array.isArray(scheduledStudiesRaw) ? scheduledStudiesRaw : [];
      const pendingScheduledList = scheduledStudies.filter((s: any) => {
        const sDate = s.date?.split('T')[0];
        return sDate === todayStr && s.status !== 'realizado';
      });

      setPendingEstudos(pendingEstudosList.length + pendingScheduledList.length);

      const financasRaw = JSON.parse(localStorage.getItem('cn_financas') || '[]');
      const financas = Array.isArray(financasRaw) ? financasRaw : [];
      const currentMonthStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
      const monthTransactions = financas.filter((t: any) => t.date?.startsWith(currentMonthStr));
      const totalEntradas = monthTransactions.filter((t: any) => t.type === 'entrada').reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
      const totalSaidas = monthTransactions.filter((t: any) => t.type === 'saida').reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
      setFinanceBalance(totalEntradas - totalSaidas);
    } catch (e) {
      console.error(e);
    }
  }, [todayStr]);

  const greet = greeting(userName.split(' ')[0]);
  const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeString = currentTime.toLocaleTimeString('pt-BR');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">

      {/* Top bar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none">🧠</span>
          <h1 className="text-lg font-black text-zinc-800 dark:text-white uppercase tracking-widest">
            Conscientemente
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col items-center">

        {/* Hub title & Clock */}
        <div className="mb-10 text-center w-full">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">
            {dateString} • {timeString}
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {pendingTarefas > 0 ? (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-500/20 shadow-sm shadow-rose-500/10">
                <CheckCircle2 size={14} /> {pendingTarefas} {pendingTarefas === 1 ? 'Tarefa hoje' : 'Tarefas hoje'}
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                <CheckCircle2 size={14} /> Dia livre de tarefas
              </span>
            )}
            
            {pendingEstudos > 0 ? (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-500/20 shadow-sm shadow-indigo-500/10">
                <BookOpen size={14} /> {pendingEstudos} {pendingEstudos === 1 ? 'Assunto pendente' : 'Assuntos pendentes'}
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                <BookOpen size={14} /> Estudos concluídos
              </span>
            )}

            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/10">
              <Wallet size={14} /> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financeBalance)}
            </span>
          </div>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {MODULES.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest mt-10">
          Versão 0.1 · Seu sistema operacional pessoal
        </p>
      </main>
    </div>
  );
};

export default HubHome;
