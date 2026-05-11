
import React, { useState, useEffect } from 'react';
import { Subject, StudySession, User } from '../types';
import {
  LayoutDashboard,
  GraduationCap,
  Library,
  Target,
  FileSpreadsheet,
  Calendar,
  Brain,
  Settings,
  LogOut,
  ChartNoAxesColumn,
  BarChart2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Bell,
  X,
  Check,
  GripVertical
} from 'lucide-react';
import logoImg from '../assets/logo.png';

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

  subjects: Subject[];
  onAddSession: (session: StudySession) => void;
  currentUser: User;
  onLogout: () => void;
  isReorderMode?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateUser?: (name: string, avatar: string) => void;
  studyTasks: { id: string, subjectId: string, subjectName: string, done: boolean, date: string }[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'concursos', label: 'Meus Editais', icon: GraduationCap },
  { id: 'subjects', label: 'Disciplinas', icon: Library },
  { id: 'statistics', label: 'Análise Estatística', icon: BarChart2 },
  { id: 'simulados', label: 'Simulados', icon: FileSpreadsheet },
  { id: 'calendar', label: 'Planner', icon: Calendar },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, theme, toggleTheme,
  timeLeft, isActive, isAlarmPlaying,
  onStartTimer, onPauseTimer, onResumeTimer, onResetTimer, onStopAlarm,
  subjects,
  onAddSession,
  currentUser, onLogout, isReorderMode = false,
  isCollapsed = false, onToggleCollapse, onUpdateUser,
  studyTasks
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
        // Recover saved items that still exist in defaults
        const currentItems = savedIds
          .map((id: string) => DEFAULT_MENU_ITEMS.find(item => item.id === id))
          .filter(Boolean) as MenuItem[];

        // Find any default items that are missing from the saved list (e.g. new features)
        const missingItems = DEFAULT_MENU_ITEMS.filter(
          defaultItem => !currentItems.some(savedItem => savedItem.id === defaultItem.id)
        );

        return [...currentItems, ...missingItems];
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
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-4 transition-all duration-300 z-50 shadow-xl overflow-hidden text-sm relative`}>

      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`mb-6 px-1 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg shrink-0 object-contain" />
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <h1 className="text-sm font-bold text-zinc-800 dark:text-white leading-none tracking-tight">Legis</h1>
              <p className="text-[10px] font-medium text-zinc-900 dark:text-zinc-100 tracking-wide">Pro</p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 p-1 flex items-center ${theme === 'dark' ? 'bg-zinc-900 dark:bg-zinc-700 justify-end' : 'bg-zinc-300 justify-start'}`}
            title={theme === 'light' ? 'Mudar para Escuro' : 'Mudar para Claro'}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center">
              {theme === 'dark' ? <Moon size={10} className="text-zinc-900 dark:text-zinc-100" /> : <Sun size={10} className="text-amber-500" />}
            </div>
          </div>
        )}
      </div>

      <div className={`mb-6 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl flex items-center gap-3 border border-zinc-100 dark:border-zinc-700 ${isCollapsed ? 'justify-center' : ''}`}>
        {!isEditingProfile || isCollapsed ? (
          <>
            {/* Profile Picture Removed */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-4 duration-300 cursor-pointer" onClick={() => setIsEditingProfile(true)}>
                <p className="text-[10px] font-semibold text-zinc-400 leading-none mb-1">Bem-vindo,</p>
                <p className="text-lg font-bold text-zinc-800 dark:text-white truncate">{currentUser.name}</p>
              </div>
            )}
          </>
        ) : (
          <div className="w-full space-y-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2 py-1 text-xs font-medium border rounded-lg dark:bg-zinc-700 dark:text-white dark:border-zinc-600 focus:ring-2 focus:ring-zinc-500 outline-none"
                placeholder="Seu nome"
                autoFocus
              />
              <div className="flex gap-2 items-center">
                {/* Avatar selection removed */}

                <div className="flex-1 flex justify-end gap-1">
                  <button onClick={() => { setIsEditingProfile(false); setEditName(currentUser.name); setEditAvatar(currentUser.avatar); }} className="text-zinc-400 hover:text-zinc-600 p-1"><X size={14} /></button>
                  <button onClick={handleSaveProfile} className="text-emerald-500 hover:text-emerald-600 p-1"><Check size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700">
        {!isCollapsed && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold text-zinc-400">Timer de Foco</span>

            {isAlarmPlaying ? (
              <button
                onClick={onStopAlarm}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl animate-pulse shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
              >
                <Bell size={16} /> Parar Alarme
              </button>
            ) : (isActive || timeLeft > 0) ? (
              <>
                <div className="text-center py-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className={`text-2xl font-mono font-bold tabular-nums ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => isActive ? onPauseTimer() : onResumeTimer()}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1 ${isActive ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                  >
                    {isActive ? <Pause size={12} /> : <Play size={12} />}
                    {isActive ? 'Pausar' : 'Retomar'}
                  </button>
                  <button
                    onClick={onResetTimer}
                    className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded-lg text-[9px] font-bold uppercase tracking-wide hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center gap-1"
                  >
                    <RotateCcw size={12} /> Resetar
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
                  className="w-16 px-2 text-center font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white text-sm"
                />
                <button
                  onClick={() => onStartTimer(inputMinutes)}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-wide rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-[9px] flex items-center justify-center gap-1"
                >
                  <Play size={12} /> Iniciar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isReorderMode && !isCollapsed && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 animate-in fade-in">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1"><GripVertical size={12} /> Arraste para reorganizar</p>
          <button
            onClick={resetMenuOrder}
            className="w-full py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700"
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
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all ${activeTab === item.id
              ? 'bg-zinc-900 dark:bg-zinc-700 text-white font-semibold shadow-md shadow-zinc-900/10 dark:shadow-zinc-900/50'
              : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium'
              } ${isReorderMode ? 'cursor-move' : ''} ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            {isReorderMode && !isCollapsed && <GripVertical size={14} className="opacity-50" />}
            <span className={`${isCollapsed ? '' : ''}`}><item.icon size={20} /></span>
            {!isCollapsed && (
              <span className="text-sm flex items-center gap-2">
                {item.label}
                {item.id === 'study_plan' && studyTasks.some(t => {
                  const today = new Date().toISOString().split('T')[0];
                  return t.date === today && !t.done;
                }) && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                  )}
              </span>
            )}
            {isCollapsed && item.id === 'study_plan' && studyTasks.some(t => {
              const today = new Date().toISOString().split('T')[0];
              return t.date === today && !t.done;
            }) && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              )}
          </button>
        ))}


      </nav>

      <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white font-medium'}`} title="Ajustes">
          <Settings size={20} />
          {!isCollapsed && <span className="text-sm">Ajustes</span>}
        </button>
        <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2 rounded-xl transition-colors ${activeTab === 'logs' ? 'text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white font-medium'}`} title="Logs">
          <ChartNoAxesColumn size={20} />
          {!isCollapsed && <span className="text-sm">Logs</span>}
        </button>
        <button onClick={onLogout} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors font-medium`} title="Sair">
          <LogOut size={20} />
          {!isCollapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </div >
  );
};

export default Sidebar;
