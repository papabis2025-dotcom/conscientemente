
import React from 'react';
import { Subject, StudySession, User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  timerSeconds: number;
  isTimerActive: boolean;
  timerSubjectId: string;
  subjects: Subject[];
  onToggleTimer: () => void;
  onSetTimerSubject: (id: string) => void;
  onResetTimer: () => void;
  onAddSession: (session: StudySession) => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, theme, toggleTheme,
  timerSeconds, isTimerActive, timerSubjectId, subjects,
  onToggleTimer, onSetTimerSubject, onResetTimer, onAddSession,
  currentUser, onLogout
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'concursos', label: 'Meus Editais', icon: '🏆' },
    { id: 'subjects', label: 'Disciplinas', icon: '📚' },
    { id: 'questions', label: 'Questões', icon: '🎯' },
    { id: 'simulados', label: 'Simulados', icon: '📝' },
    { id: 'calendar', label: 'Planner', icon: '📅' },
    { id: 'ai-coach', label: 'IA Mentor', icon: '🤖' },
  ];

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    if (timerSeconds > 0 && timerSubjectId) {
      onAddSession({
        id: `session-${Date.now()}`,
        subjectId: timerSubjectId,
        date: new Date().toISOString(),
        durationInMinutes: Math.floor(timerSeconds / 60) || 1, // Minimum 1 minute if started
        isSimulado: false
      });
    }
    onResetTimer();
  };

  return (
    <div className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 transition-colors z-50 shadow-xl overflow-hidden text-sm">
      <div className="mb-6 px-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 text-base">G</div>
          <div>
            <h1 className="text-[12px] font-black text-slate-800 dark:text-white leading-none tracking-tighter uppercase">Gabaritando</h1>
            <p className="text-[8px] font-black text-blue-600 tracking-widest uppercase opacity-70">Questões</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700">
        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-xl shadow-sm">
          {currentUser.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Perfil Ativo</p>
          <p className="text-xs font-black text-slate-800 dark:text-white truncate">{currentUser.name}</p>
        </div>
      </div>

      <div className="mb-5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
        <select
          value={timerSubjectId}
          onChange={(e) => onSetTimerSubject(e.target.value)}
          className="w-full text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none text-blue-600 dark:text-blue-400 mb-2"
        >
          <option value="">Cronômetro...</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="text-center py-1">
          <span className={`text-xl font-mono font-bold tabular-nums ${isTimerActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {formatTime(timerSeconds)}
          </span>
        </div>
        <div className="flex gap-1 mt-2">
          <button onClick={() => timerSubjectId && onToggleTimer()} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isTimerActive ? 'bg-amber-500 text-white' : 'bg-blue-700 text-white'}`}>{isTimerActive ? 'Pausar' : 'Iniciar'}</button>
          <button onClick={handleFinish} className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">Fim</button>
        </div>

      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] uppercase tracking-widest font-black">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-blue-700 bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] uppercase tracking-widest font-black">Ajustes</span>
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors">
          <span className="text-lg">🔓</span>
          <span className="text-[10px] uppercase tracking-widest font-black">Sair</span>
        </button>
      </div>
    </div >
  );
};

export default Sidebar;
