
import React, { useState, useEffect } from 'react';
import { Subject, StudySession, User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // New Timer Props
  timeLeft: number;
  isActive: boolean;
  isAlarmPlaying: boolean;
  onStartTimer: (minutes: number) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  onStopAlarm: () => void;

  subjects: Subject[]; // Still needed for other things? Maybe not for timer.
  onAddSession: (session: StudySession) => void;
  currentUser: User;
  onLogout: () => void;
  isReorderMode?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateUser?: (name: string, avatar: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'concursos', label: 'Meus Editais', icon: '🏆' },
  { id: 'subjects', label: 'Disciplinas', icon: '📚' },
  { id: 'questions', label: 'Questões', icon: '🎯' },
  { id: 'simulados', label: 'Simulados', icon: '📝' },
  { id: 'calendar', label: 'Planner', icon: '📅' },
  { id: 'ai-coach', label: 'IA Mentor', icon: '🤖' },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, theme, toggleTheme,
  timeLeft, isActive, isAlarmPlaying,
  onStartTimer, onPauseTimer, onResumeTimer, onResetTimer, onStopAlarm,
  subjects,
  onAddSession,
  currentUser, onLogout, isReorderMode = false,
  isCollapsed = false, onToggleCollapse, onUpdateUser
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [inputMinutes, setInputMinutes] = useState(30);

  useEffect(() => {
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatar);
  }, [currentUser]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('cp_menu_order');
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        return savedIds.map((id: string) => DEFAULT_MENU_ITEMS.find(item => item.id === id)!).filter(Boolean);
      } catch {
        return DEFAULT_MENU_ITEMS;
      }
    }
    return DEFAULT_MENU_ITEMS;
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('cp_menu_order', JSON.stringify(menuItems.map(item => item.id)));
  }, [menuItems]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...menuItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setMenuItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const resetMenuOrder = () => {
    setMenuItems(DEFAULT_MENU_ITEMS);
    localStorage.removeItem('cp_menu_order');
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveProfile = () => {
    if (onUpdateUser && editName.trim()) {
      onUpdateUser(editName, editAvatar || '🎓');
      setIsEditingProfile(false);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 transition-all duration-300 z-50 shadow-xl overflow-hidden text-sm relative`}>

      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-xs shadow-sm z-50 hover:scale-110 transition-transform"
      >
        {isCollapsed ? '➡' : '⬅'}
      </button>

      <div className={`mb-6 px-1 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 text-base shrink-0">G</div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <h1 className="text-[12px] font-black text-slate-800 dark:text-white leading-none tracking-tighter uppercase">Gabaritando</h1>
              <p className="text-[8px] font-black text-blue-600 tracking-widest uppercase opacity-70">Questões</p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        )}
      </div>

      <div className={`mb-6 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 ${isCollapsed ? 'justify-center' : ''}`}>
        {!isEditingProfile || isCollapsed ? (
          <>
            <div onClick={() => !isCollapsed && setIsEditingProfile(true)} className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform">
              {currentUser.avatar}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-4 duration-300 cursor-pointer" onClick={() => setIsEditingProfile(true)}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Perfil Ativo</p>
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{currentUser.name}</p>
              </div>
            )}
          </>
        ) : (
          <div className="w-full space-y-2 animate-in fade-in zoom-in-95 duration-200">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1 text-xs font-bold border rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Seu nome"
              autoFocus
            />
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                className="w-10 text-center px-1 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="😎"
                maxLength={2}
              />
              <div className="flex gap-1">
                <button onClick={() => { setIsEditingProfile(false); setEditName(currentUser.name); setEditAvatar(currentUser.avatar); }} className="text-[10px] text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
                <button onClick={handleSaveProfile} className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-md font-bold hover:bg-emerald-600">✓</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
        {!isCollapsed ? (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Timer de Foco</span>

            {isAlarmPlaying ? (
              <button
                onClick={onStopAlarm}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest rounded-xl animate-pulse shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
                <span>🔔</span> Parar Alarme
              </button>
            ) : (isActive || timeLeft > 0) ? (
              <>
                <div className="text-center py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className={`text-2xl font-mono font-bold tabular-nums ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => isActive ? onPauseTimer() : onResumeTimer()}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                  >
                    {isActive ? 'Pausar' : 'Retomar'}
                  </button>
                  <button
                    onClick={onResetTimer}
                    className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    Resetar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={inputMinutes}
                  onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                  className="w-16 px-2 text-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
                <button
                  onClick={() => onStartTimer(inputMinutes)}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-[9px]"
                >
                  Iniciar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAlarmPlaying ? 'bg-red-500 animate-pulse' : isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-mono">{formatTime(timeLeft)}</span>
            {isAlarmPlaying ? (
              <button onClick={onStopAlarm} className="text-lg">🔔</button>
            ) : (
              <button
                onClick={() => isActive ? onPauseTimer() : (timeLeft > 0 ? onResumeTimer() : onStartTimer(inputMinutes))}
                className="text-lg"
              >
                {isActive ? '⏸️' : '▶️'}
              </button>
            )}
          </div>
        )}
      </div>

      {isReorderMode && !isCollapsed && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 animate-in fade-in">
          <p className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 mb-2">🔄 Arraste para reorganizar</p>
          <button
            onClick={resetMenuOrder}
            className="w-full py-1.5 bg-amber-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-amber-700"
          >
            Restaurar Padrão
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            draggable={isReorderMode && !isCollapsed}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => !isReorderMode && setActiveTab(item.id)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-2.5 px-3'} py-2.5 rounded-xl transition-all ${activeTab === item.id
              ? 'bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              } ${isReorderMode ? 'cursor-move' : ''} ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            {isReorderMode && !isCollapsed && <span className="text-xs opacity-50">⋮⋮</span>}
            <span className="text-lg">{item.icon}</span>
            {!isCollapsed && <span className="text-[10px] uppercase tracking-widest font-black whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
        {/* Logs Link Added Permanently or via menuItems? user asked to add it. I'll add it to default menu items below separately or ensure it's here */}
        <button
          onClick={() => setActiveTab('logs')}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-2.5 px-3'} py-2.5 rounded-xl transition-all ${activeTab === 'logs'
            ? 'bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          title={isCollapsed ? 'Logs' : ''}
        >
          <span className="text-lg">📋</span>
          {!isCollapsed && <span className="text-[10px] uppercase tracking-widest font-black whitespace-nowrap">Logs</span>}
        </button>
      </nav>

      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-2.5 px-3'} py-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-blue-700 bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`} title="Ajustes">
          <span className="text-lg">⚙️</span>
          {!isCollapsed && <span className="text-[10px] uppercase tracking-widest font-black">Ajustes</span>}
        </button>
        <button onClick={onLogout} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-2.5 px-3'} py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors`} title="Sair">
          <span className="text-lg">🔓</span>
          {!isCollapsed && <span className="text-[10px] uppercase tracking-widest font-black">Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
