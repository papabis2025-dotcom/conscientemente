import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Brain, Bell, Settings, User, Sun, Moon, Sliders, LogOut, 
  ChevronLeft, ChevronRight, X, Database, Cloud, CheckCircle2, 
  AlertTriangle, FileText, Check 
} from 'lucide-react';
import { LogEntry } from '../modules/estudos/types';
import LogView from '../modules/estudos/pages/LogView';
import { api } from '../modules/estudos/services/api';
import { supabase } from '../modules/estudos/services/supabase';
import { playSound } from '../utils/audio';
import FaviconIcon from './FaviconIcon';


interface AppNotification {
  id: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  type: 'tarefa' | 'estudo' | 'saude' | 'financas' | 'sistema';
  timestamp: number;
}

interface GlobalSidebarProps {
  currentRoute: string;
  userName: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
  isHomeEditMode: boolean;
  setIsHomeEditMode: (val: boolean) => void;
  bgType: 'default' | 'color' | 'image';
  setBgType: (type: 'default' | 'color' | 'image') => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  bgImage: string;
  setBgImage: (url: string) => void;
  bgImageStyle: string;
  setBgImageStyle: (style: string) => void;
}

const GlobalSidebar: React.FC<GlobalSidebarProps> = ({
  currentRoute, userName, theme, toggleTheme, onLogout,
  isHomeEditMode, setIsHomeEditMode,
  bgType, setBgType, bgColor, setBgColor,
  bgImage, setBgImage, bgImageStyle, setBgImageStyle
}) => {
  const [userSidebarExpanded, setUserSidebarExpanded] = useState(() => {
    return localStorage.getItem('cn_sidebar_expanded') !== 'false';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('cn_push_notifications_enabled') === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('cn_sound_enabled') !== 'false';
  });

  // Profile modal states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('cn_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [clearedNotifications, setClearedNotifications] = useState<string[]>(() => {
    const saved = localStorage.getItem('cn_cleared_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Force sidebar contracted in modules
  const sidebarExpanded = currentRoute === 'hub' ? userSidebarExpanded : false;

  useEffect(() => {
    const handleOpenMainSidebar = () => {
      setMobileMenuOpen(true);
    };
    window.addEventListener('open-main-sidebar', handleOpenMainSidebar);
    return () => {
      window.removeEventListener('open-main-sidebar', handleOpenMainSidebar);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync notification states from other tabs or actions
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('cn_notifications');
        setNotifications(saved ? JSON.parse(saved) : []);
        const savedCleared = localStorage.getItem('cn_cleared_notifications');
        setClearedNotifications(savedCleared ? JSON.parse(savedCleared) : []);
        const savedPush = localStorage.getItem('cn_push_notifications_enabled') === 'true';
        setPushEnabled(savedPush);
      } catch (e) {
        console.error('Error syncing local storage states on sidebar:', e);
      }
    };
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotificationsPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    if (currentRoute !== 'hub') return;
    setUserSidebarExpanded(prev => {
      const next = !prev;
      localStorage.setItem('cn_sidebar_expanded', String(next));
      return next;
    });
  };

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

  const todayStr = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const displayedNotifications = notifications.filter(n => n.date === todayStr || !n.read);
  const unreadCount = displayedNotifications.filter(n => !n.read).length;

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('cn_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('local-storage-sync'));
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('cn_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('local-storage-sync'));
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    const idsToClear = notifications.map(n => n.id);
    setClearedNotifications(prev => {
      const updatedCleared = Array.from(new Set([...prev, ...idsToClear]));
      localStorage.setItem('cn_cleared_notifications', JSON.stringify(updatedCleared));
      return updatedCleared;
    });
    setNotifications([]);
    localStorage.removeItem('cn_notifications');
    window.dispatchEvent(new Event('local-storage-sync'));
  };

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
        window.dispatchEvent(new Event('local-storage-sync'));
        triggerLocalNotification('Notificações Ativas', 'Você receberá alertas das tarefas limite.');
      } else {
        alert('Por favor, autorize a permissão de notificações no seu navegador/dispositivo.');
        setPushEnabled(false);
        localStorage.setItem('cn_push_notifications_enabled', 'false');
        window.dispatchEvent(new Event('local-storage-sync'));
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('cn_push_notifications_enabled', 'false');
      window.dispatchEvent(new Event('local-storage-sync'));
    }
  };

  const handleToggleSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSoundEnabled(checked);
    localStorage.setItem('cn_sound_enabled', String(checked));
    window.dispatchEvent(new Event('local-storage-sync'));
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
          window.dispatchEvent(new Event('local-storage-sync'));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
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
            onClick={() => {
              window.location.hash = 'hub';
              setMobileMenuOpen(false);
            }}
            className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-zinc-950/5 dark:bg-white/5 text-zinc-900 dark:text-white shrink-0 cursor-pointer ${
              sidebarExpanded ? 'px-4 justify-start' : 'justify-center'
            }`}
            title="Conscientemente"
          >
            <FaviconIcon size={18} className="shrink-0" />
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
                className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-855/50 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all hover:scale-102 hover:shadow-sm ${
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
                          className="text-[9px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-655 dark:hover:text-indigo-400 transition-colors"
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
                                  className="opacity-0 group-hover/item:opacity-100 text-[8px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 hover:underline shrink-0 self-center transition-all px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-805"
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
              className={`w-full h-11 rounded-xl flex items-center gap-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-zinc-500 hover:text-zinc-850 dark:hover:text-white transition-all hover:scale-102 hover:shadow-sm ${
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
            {currentRoute === 'hub' && (
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
            )}
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
          {currentRoute === 'hub' && (
            <button
              onClick={toggleSidebar}
              className="w-full h-9 rounded-xl flex items-center justify-center border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title={sidebarExpanded ? "Recolher Menu" : "Expandir Menu"}
            >
              {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
             <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 z-10 text-zinc-450 hover:text-rose-500 bg-zinc-100 dark:bg-zinc-800 rounded-full p-2"><X size={16} /></button>
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
                   <p className="text-xs text-zinc-550">Seus dados estão sendo salvos automaticamente na nuvem.</p>
                 </div>
                 
                 <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 shadow-sm space-y-6 md:col-span-2">
                   <h3 className="font-bold text-lg flex items-center gap-2 text-rose-600 dark:text-rose-400"><AlertTriangle size={20} /> Zona de Perigo</h3>
                   <button onClick={handleResetAllData} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95">
                     FÁBRICA: Resetar Tudo
                   </button>
                 </div>
               </div>

               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
                 <h3 className="font-bold text-lg flex items-center gap-2 mb-6 text-zinc-800 dark:text-white"><FileText size={20} className="text-zinc-505" /> Logs do Sistema</h3>
                 <LogView logs={logs} onClearLogs={handleClearLogs} onDeleteLog={handleDeleteLog} />
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-y-auto p-8 relative animate-in zoom-in-95 custom-scrollbar">
             <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-zinc-450 hover:text-rose-500 bg-zinc-100 dark:bg-zinc-800 rounded-full p-2"><X size={16} /></button>
             <h2 className="text-xl font-black uppercase tracking-widest text-zinc-800 dark:text-white mb-6 flex items-center gap-2"><User size={20} /> Preferências de Usuário</h2>
             
             <div className="space-y-6">
               <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xl font-black shadow-lg">
                    {userName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-white">{userName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-450">Usuário Autenticado</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                 <div className="space-y-4">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alterar Senha</p>
                   <div className="space-y-3">
                     <input type="password" placeholder="Nova Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
                     <input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
                     <button onClick={handlePasswordChange} className="w-full bg-zinc-900 dark:bg-zinc-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-605">Alterar Senha</button>
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
                     <span className={`text-[10px] font-black uppercase tracking-widest ${bgType === 'color' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-650 dark:text-zinc-400'}`}>Cor Sólida</span>
                     <div className="flex items-center gap-2 w-full">
                       <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setBgType('color'); window.dispatchEvent(new Event('local-storage-sync')); }} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                       <span className="text-xs font-mono text-zinc-500">{bgColor}</span>
                     </div>
                   </div>

                   <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-3 ${bgType === 'image' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'}`}>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${bgType === 'image' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-650 dark:text-zinc-400'}`}>Imagem</span>
                     <button 
                       onClick={() => document.getElementById('custom-bg-input-sidebar')?.click()} 
                       className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-3 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors truncate"
                     >
                       {bgImage ? 'Alterar Imagem' : 'Selecionar'}
                     </button>
                     <input 
                       id="custom-bg-input-sidebar" 
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
                             window.dispatchEvent(new Event('local-storage-sync'));
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
    </>
  );
};

export default GlobalSidebar;
