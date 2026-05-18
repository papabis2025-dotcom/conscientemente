import React, { useState, useEffect, useRef } from 'react';
import { MODULES } from '../constants';
import { Module, LogEntry } from '../types';
import { LogOut, Sun, Moon, ArrowUpRight, Lock, BookOpen, Wallet, ListTodo, Brain, ChevronRight, Activity, TrendingUp, Settings, User, X } from 'lucide-react';
import LogView from '../modules/estudos/pages/LogView';
import { api } from '../modules/estudos/services/api';
import { supabase } from '../modules/estudos/services/supabase';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

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
      const exportData = { version: '1.0', exportDate: new Date().toISOString(), data: { concursos, sessions, simulados, scheduledStudies: schedule, dailyGoals: goals } };
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
      if (concursos) for (const c of concursos) await api.concursos.upsert(c);
      if (sessions) for (const s of sessions) await api.sessions.create(s);
      if (simulados) for (const s of simulados) await api.simulados.create(s);
      if (scheduledStudies) for (const s of scheduledStudies) await api.schedule.create(s);
      if (dailyGoals) for (const g of dailyGoals) await api.dailyGoals.upsert(g);
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

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

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
      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col">

        {/* Hero section */}
        <div className={`mb-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Live clock widget */}
          <div className="mt-4 inline-flex items-center gap-5 px-6 py-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md">
            <div className="flex flex-col">
              <span className="font-black text-zinc-800 dark:text-white text-4xl leading-none tracking-tight tabular-nums">
                {timeStr}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-bold capitalize mt-1.5">
                {dateStr}
              </span>
            </div>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Ao vivo</span>
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
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                <ListTodo size={11} />
                Dia livre ✓
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
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubHome;
