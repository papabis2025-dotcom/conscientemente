
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
  GripVertical,
  Clock,
  Trophy
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
  sessions: StudySession[];
  onOpenAddModal?: () => void;
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
  studyTasks,
  sessions,
  onOpenAddModal
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);

  // Stats calculation
  const totalQuestions = sessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);


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
      
      <button 
        onClick={onOpenAddModal}
        className={`mb-4 w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-4'} bg-zinc-900 dark:bg-zinc-700 text-white rounded-[1.5rem] shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-all active:scale-95 group overflow-hidden relative`}
      >
        <Plus size={isCollapsed ? 24 : 20} className={isCollapsed ? '' : 'shrink-0'} />
        {!isCollapsed && <span className="text-xs font-black uppercase tracking-widest">Adicionar Atividade</span>}
      </button>

      <div className="mb-5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700">
        {!isCollapsed ? (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Progresso Geral</span>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy size={12} className="text-amber-500" />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Questões</span>
                </div>
                <p className="text-lg font-black text-zinc-800 dark:text-white leading-none">{totalQuestions}</p>
              </div>

              <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={12} className="text-blue-500" />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Horas</span>
                </div>
                <p className="text-lg font-black text-zinc-800 dark:text-white leading-none">{totalHours}<span className="text-[10px] font-bold ml-0.5">h</span></p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
             <Trophy size={16} className="text-amber-500" />
             <Clock size={16} className="text-blue-500" />
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
