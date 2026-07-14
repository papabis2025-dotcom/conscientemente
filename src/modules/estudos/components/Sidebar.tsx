
import React, { useState, useEffect } from 'react';
import { Subject, StudySession, User } from '../types';
import {
  LayoutDashboard,
  GraduationCap,
  Library,
  FileSpreadsheet,
  Calendar,
  Settings,
  LogOut,
  ChartNoAxesColumn,
  BarChart2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Plus,
  Trophy,
  X,
  GripVertical,
  Clock,
  BookOpen,
  Check,
  LayoutTemplate,
  Menu,
  Percent,
  CalendarRange,
  Link,
  History
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

import { PercentSearchIcon } from './PercentSearchIcon';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'concursos', label: 'Cursos', icon: GraduationCap },
  { id: 'subjects', label: 'Disciplinas', icon: Library },
  { id: 'statistics', label: 'Análise Estatística', icon: Percent },
  { id: 'cronograma', label: 'Cronograma', icon: CalendarRange },
  { id: 'simulados', label: 'Simulados', icon: FileSpreadsheet },
  { id: 'calendar', label: 'Planner', icon: Calendar },
  { id: 'questions_links', label: 'Cadernos de Questões', icon: Link },
  { id: 'atividades', label: 'Atividades', icon: History },
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
      onUpdateUser(editName, editAvatar || 'student');
      setIsEditingProfile(false);
    }
  };

  return (
    <>
      {/* Backdrop for mobile when sidebar is open */}
      {!isCollapsed && (
        <div 
          onClick={onToggleCollapse}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" 
        />
      )}

      {/* Floating Menu Button on Mobile */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="md:hidden fixed bottom-6 left-6 z-40 w-10 h-10 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer animate-in zoom-in duration-200"
        >
          <Menu size={18} />
        </button>
      )}      <div className={`fixed md:relative ${isCollapsed ? 'w-64 md:w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'} h-screen md:h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-5 transition-all duration-300 z-50 shadow-lg text-sm`}>
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-100 shadow-sm z-50 hover:scale-110 transition-transform cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

      <div className={`mb-8 px-1 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center gap-3 text-indigo-500">
          <BookOpen size={28} className="drop-shadow-sm shrink-0" />
          {!isCollapsed && (
            <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-300">
              Estudos
            </span>
          )}
        </div>
      </div>


      
      <button 
        onClick={onOpenAddModal}
        className={`mb-4 w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-4'} bg-zinc-900 dark:bg-zinc-750 text-white rounded-[1.5rem] shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-650 transition-all active:scale-95 group overflow-hidden relative`}
      >
        <Plus size={isCollapsed ? 24 : 20} className={isCollapsed ? '' : 'shrink-0'} />
        {!isCollapsed && <span className="text-xs font-black uppercase tracking-widest">Adicionar Atividade</span>}
      </button>


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
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/85 font-semibold'
              } ${isReorderMode ? 'cursor-move' : ''} ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
          >
            {isReorderMode && !isCollapsed && <GripVertical size={14} className="opacity-50" />}
            <span className="flex-shrink-0 flex items-center justify-center"><item.icon size={20} /></span>
            {!isCollapsed && (
              <span className="text-sm flex items-center gap-2 select-none truncate">
                {item.label}
                {item.id === 'study_plan' && (studyTasks || []).some(t => {
                  const today = new Date().toISOString().split('T')[0];
                  return t.date === today && !t.done;
                }) && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                  )}
              </span>
            )}
            {isCollapsed && item.id === 'study_plan' && (studyTasks || []).some(t => {
              const today = new Date().toISOString().split('T')[0];
              return t.date === today && !t.done;
            }) && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              )}
          </button>
        ))}


      </nav>

      <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/85 font-semibold'}`} title="Ajustes">
          <Settings size={20} />
          {!isCollapsed && <span className="text-sm">Ajustes</span>}
        </button>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 px-2 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded-xl transition-colors font-extrabold text-[11px] uppercase tracking-wider" title="Voltar ao Hub">
          <LayoutTemplate size={18} className={isCollapsed ? '' : 'shrink-0'} />
          {!isCollapsed && <span>Voltar ao Hub</span>}
        </button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
