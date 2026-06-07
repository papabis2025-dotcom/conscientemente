import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabase';
import Login from './pages/Login';
import HubHome from './pages/HubHome';
import HabitosHub from './pages/HabitosHub';
import EstudosApp from './modules/estudos/App';
import FinancasApp from './modules/financas/App';
import SaudeApp from './modules/saude/App';
import TarefasApp from './modules/tarefas/App';
import AnotacoesApp from './modules/anotacoes/App';
import type { Session } from '@supabase/supabase-js';
import { playSound } from './utils/audio';

interface SyncedPayload {
  updatedAt: number;
  settings: Record<string, string | null>;
}

const SYNC_KEYS = [
  'cn_habits',
  'cn_habit_history',
  'cp_study_tasks',
  'cp_global_daily_goal',
  'cp_selected_concurso_id',
  'cp_dashboard_layout_v19',
  'cp_dashboard_layout_v20',
  'cp_menu_order',
  'cn_theme',
  'cn_notifications',
  'cn_cleared_notifications',
  'cn_anotacoes',
  'cn_anotacoes_folders',
  'cn_custom_bg_image',
  'cn_custom_bg_style',
  'cn_push_notifications_enabled',
  'cn_deleted_habit_ids',
  'cp_scheduled_studies',
  'cn_saude_activity_types',
  'cn_saude_muscle_groups',
  'cn_saude_dashboard_layout',
  'cn_home_cards_layout'
];

function mergeLists<T extends { id: string }>(listA: T[], listB: T[]): T[] {
  const mergedMap = new Map<string, T>();
  listA.forEach(item => mergedMap.set(item.id, item));
  listB.forEach(item => {
    if (mergedMap.has(item.id)) {
      mergedMap.set(item.id, { ...mergedMap.get(item.id)!, ...item });
    } else {
      mergedMap.set(item.id, item);
    }
  });
  return Array.from(mergedMap.values());
}

function mergeHabitHistory(localHistory: Record<string, string[]>, remoteHistory: Record<string, string[]>): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...remoteHistory };
  Object.keys(localHistory).forEach(date => {
    if (merged[date]) {
      merged[date] = Array.from(new Set([...merged[date], ...localHistory[date]]));
    } else {
      merged[date] = localHistory[date];
    }
  });
  return merged;
}

function mergeSettings(
  local: Record<string, string | null>,
  remote: Record<string, string | null>,
  preferRemote: boolean
): Record<string, string | null> {
  const merged: Record<string, string | null> = {};

  SYNC_KEYS.forEach(key => {
    const localVal = local[key];
    const remoteVal = remote[key];

    if (!localVal) {
      merged[key] = remoteVal;
      return;
    }
    if (!remoteVal) {
      merged[key] = localVal;
      return;
    }

    if (
      key === 'cp_study_tasks' || 
      key === 'cn_anotacoes' || 
      key === 'cn_anotacoes_folders' ||
      key === 'cp_dashboard_layout_v19' ||
      key === 'cp_dashboard_layout_v20' ||
      key === 'cp_scheduled_studies' ||
      key === 'cn_saude_dashboard_layout' ||
      key === 'cn_home_cards_layout'
    ) {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          const mergedList = preferRemote
            ? mergeLists(localList, remoteList)
            : mergeLists(remoteList, localList);
          merged[key] = JSON.stringify(mergedList);
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_habits') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          const mergedList = preferRemote
            ? mergeLists(localList, remoteList)
            : mergeLists(remoteList, localList);

          // Get and parse deleted habit IDs
          const localDeletedRaw = local['cn_deleted_habit_ids'] || '[]';
          const remoteDeletedRaw = remote['cn_deleted_habit_ids'] || '[]';
          const deletedIdsSet = new Set<string>();
          try {
            const localDeleted = JSON.parse(localDeletedRaw);
            if (Array.isArray(localDeleted)) localDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}
          try {
            const remoteDeleted = JSON.parse(remoteDeletedRaw);
            if (Array.isArray(remoteDeleted)) remoteDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}

          // Filter out any deleted habits
          const filteredList = mergedList.filter((h: any) => !deletedIdsSet.has(h.id));
          merged[key] = JSON.stringify(filteredList);
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_cleared_notifications' || key === 'cn_deleted_habit_ids') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          merged[key] = JSON.stringify(Array.from(new Set([...localList, ...remoteList])));
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_habit_history') {
      try {
        const localHistory = JSON.parse(localVal);
        const remoteHistory = JSON.parse(remoteVal);
        if (typeof localHistory === 'object' && typeof remoteHistory === 'object') {
          merged[key] = JSON.stringify(mergeHabitHistory(localHistory, remoteHistory));
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_saude_activity_types' || key === 'cn_saude_muscle_groups') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          merged[key] = JSON.stringify(Array.from(new Set([...localList, ...remoteList])));
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else {
      merged[key] = preferRemote ? remoteVal : localVal;
    }
  });

  return merged;
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.replace('#', '') || 'hub');

  // Global click event listener for premium click sound feedback
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      
      const interactiveEl = target.closest('button, a, [role="button"], .cursor-pointer');
      if (interactiveEl) {
        playSound.click();
      }
    };
    
    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cn_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [bgType, setBgType] = useState<'default' | 'color' | 'image'>('default');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState<string>(() => localStorage.getItem('cn_custom_bg_image') || '');
  const [bgImageStyle, setBgImageStyle] = useState<string>(() => localStorage.getItem('cn_custom_bg_style') || 'cover');
  const [isPrefsLoaded, setIsPrefsLoaded] = useState(false);

  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [lastKnownSettings, setLastKnownSettings] = useState<string>('');

  const prefsLoadedForUserRef = useRef<string | null>(null);
  const initialBgRef = useRef({ bgType: 'default', bgColor: '#ffffff' });

  useEffect(() => {
    if (!session) {
      setIsPrefsLoaded(false);
      prefsLoadedForUserRef.current = null;
      return;
    }

    if (prefsLoadedForUserRef.current === session.user.id) {
      return;
    }
    prefsLoadedForUserRef.current = session.user.id;

    const loadPreferences = async () => {
      let finished = false;
      const safetyTimeout = setTimeout(() => {
        if (!finished) {
          console.warn('loadPreferences timed out after 3 seconds. Proceeding.');
          setIsPrefsLoaded(true);
        }
      }, 3000);

      try {
        const { data: prefs, error: selectError } = await supabase
          .from('user_preferences')
          .select('hub_bg_type, hub_bg_color, hub_bg_image_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (selectError) {
          throw selectError;
        }

        if (prefs) {
          const loadedBgType = prefs.hub_bg_type || 'default';
          const loadedBgColor = prefs.hub_bg_color || '#ffffff';
          setBgType(loadedBgType as any);
          setBgColor(loadedBgColor);
          initialBgRef.current = { bgType: loadedBgType, bgColor: loadedBgColor };

          const localSettings: Record<string, string | null> = {};
          SYNC_KEYS.forEach(key => {
            localSettings[key] = localStorage.getItem(key);
          });

          let remotePayload: SyncedPayload | null = null;
          if (prefs.hub_bg_image_url) {
            try {
              remotePayload = JSON.parse(prefs.hub_bg_image_url);
            } catch (e) {
              console.error('Failed to parse remote settings JSON:', e);
            }
          }

          const remoteSettings = remotePayload?.settings || {};
          const remoteUpdatedAt = remotePayload?.updatedAt || 0;

          // Merge local and remote
          const merged = mergeSettings(localSettings, remoteSettings, remoteUpdatedAt > 0);

          // Save merged to localStorage
          SYNC_KEYS.forEach(key => {
            const val = merged[key];
            if (val !== null && val !== undefined) {
              localStorage.setItem(key, val);
            } else {
              localStorage.removeItem(key);
            }
          });
          window.dispatchEvent(new Event('local-storage-sync'));

          const mergedTheme = merged['cn_theme'];
          if (mergedTheme && (mergedTheme === 'light' || mergedTheme === 'dark')) {
            setTheme(mergedTheme);
          }

          if (merged['cn_custom_bg_image']) setBgImage(merged['cn_custom_bg_image']);
          if (merged['cn_custom_bg_style']) setBgImageStyle(merged['cn_custom_bg_style']);

          const updatedTime = Date.now();
          setLastSyncTime(updatedTime);
          setLastKnownSettings(JSON.stringify(merged));

          const payload: SyncedPayload = {
            updatedAt: updatedTime,
            settings: merged
          };

          await supabase.from('user_preferences').upsert({
            user_id: session.user.id,
            hub_bg_type: loadedBgType,
            hub_bg_color: loadedBgColor,
            hub_bg_image_url: JSON.stringify(payload)
          }, { onConflict: 'user_id' });
        } else {
          // Initialize DB row with local settings
          initialBgRef.current = { bgType, bgColor };
          const localSettings: Record<string, string | null> = {};
          SYNC_KEYS.forEach(key => {
            localSettings[key] = localStorage.getItem(key);
          });

          const updatedTime = Date.now();
          setLastSyncTime(updatedTime);
          setLastKnownSettings(JSON.stringify(localSettings));

          const payload: SyncedPayload = {
            updatedAt: updatedTime,
            settings: localSettings
          };

          await supabase.from('user_preferences').upsert({
            user_id: session.user.id,
            hub_bg_type: bgType,
            hub_bg_color: bgColor,
            hub_bg_image_url: JSON.stringify(payload)
          }, { onConflict: 'user_id' });
        }
      } catch (err) {
        console.error('Error loading and syncing preferences:', err);
      } finally {
        finished = true;
        clearTimeout(safetyTimeout);
        setIsPrefsLoaded(true);
      }
    };
    loadPreferences();
  }, [session]);

  useEffect(() => {
    if (!isPrefsLoaded || !session) return;

    if (bgType === initialBgRef.current.bgType && bgColor === initialBgRef.current.bgColor) {
      return;
    }

    const savePrefs = async () => {
      const localSettings: Record<string, string | null> = {};
      SYNC_KEYS.forEach(key => {
        localSettings[key] = localStorage.getItem(key);
      });
      const payload: SyncedPayload = {
        updatedAt: lastSyncTime || Date.now(),
        settings: localSettings
      };
      await supabase.from('user_preferences').upsert({
        user_id: session.user.id,
        hub_bg_type: bgType,
        hub_bg_color: bgColor,
        hub_bg_image_url: JSON.stringify(payload)
      }, { onConflict: 'user_id' });

      initialBgRef.current = { bgType, bgColor };
    };
    savePrefs().catch(err => console.error('Error saving user preferences:', err));
  }, [bgType, bgColor, isPrefsLoaded, session]);

  // Periodic background check & sync loop
  useEffect(() => {
    if (!session || !isPrefsLoaded) return;

    const interval = setInterval(async () => {
      const localSettings: Record<string, string | null> = {};
      SYNC_KEYS.forEach(key => {
        localSettings[key] = localStorage.getItem(key);
      });

      const currentSerialized = JSON.stringify(localSettings);
      if (currentSerialized !== lastKnownSettings) {
        const updatedTime = Date.now();
        const payload: SyncedPayload = {
          updatedAt: updatedTime,
          settings: localSettings
        };

        try {
          await supabase.from('user_preferences').upsert({
            user_id: session.user.id,
            hub_bg_type: bgType,
            hub_bg_color: bgColor,
            hub_bg_image_url: JSON.stringify(payload)
          }, { onConflict: 'user_id' });

          setLastKnownSettings(currentSerialized);
          setLastSyncTime(updatedTime);
        } catch (err) {
          console.error('Failed to sync local settings to Supabase:', err);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [session, isPrefsLoaded, lastKnownSettings, bgType, bgColor, lastSyncTime]);

  // Pull remote preferences on focus or hashchange
  useEffect(() => {
    if (!session || !isPrefsLoaded) return;

    const pullAndMerge = async () => {
      try {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('hub_bg_image_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (prefs?.hub_bg_image_url) {
          let remotePayload: SyncedPayload | null = null;
          try {
            remotePayload = JSON.parse(prefs.hub_bg_image_url);
          } catch (e) {
            console.error('Failed to parse remote settings JSON on focus:', e);
          }

          if (remotePayload && remotePayload.updatedAt > lastSyncTime) {
            const localSettings: Record<string, string | null> = {};
            SYNC_KEYS.forEach(key => {
              localSettings[key] = localStorage.getItem(key);
            });

            const merged = mergeSettings(localSettings, remotePayload.settings, true);

            SYNC_KEYS.forEach(key => {
              const val = merged[key];
              if (val !== null && val !== undefined) {
                localStorage.setItem(key, val);
              } else {
                localStorage.removeItem(key);
              }
            });
            window.dispatchEvent(new Event('local-storage-sync'));

            const mergedTheme = merged['cn_theme'];
            if (mergedTheme && (mergedTheme === 'light' || mergedTheme === 'dark')) {
              setTheme(mergedTheme);
            }

            if (merged['cn_custom_bg_image']) setBgImage(merged['cn_custom_bg_image']);
            if (merged['cn_custom_bg_style']) setBgImageStyle(merged['cn_custom_bg_style']);

            const updatedTime = Date.now();
            setLastSyncTime(updatedTime);
            setLastKnownSettings(JSON.stringify(merged));

            const payload: SyncedPayload = {
              updatedAt: updatedTime,
              settings: merged
            };

            await supabase.from('user_preferences').upsert({
              user_id: session.user.id,
              hub_bg_type: bgType,
              hub_bg_color: bgColor,
              hub_bg_image_url: JSON.stringify(payload)
            }, { onConflict: 'user_id' });
          }
        }
      } catch (err) {
        console.error('Error during automatic pull & merge:', err);
      }
    };

    window.addEventListener('focus', pullAndMerge);
    window.addEventListener('hashchange', pullAndMerge);

    return () => {
      window.removeEventListener('focus', pullAndMerge);
      window.removeEventListener('hashchange', pullAndMerge);
    };
  }, [session, isPrefsLoaded, lastSyncTime, bgType, bgColor]);

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('cn_theme', theme);
  }, [theme]);

  // Auth state listener
  useEffect(() => {
    let subscription: any = null;
    let finished = false;

    // Safety timeout for loading state to prevent hanging on offline Supabase
    const safetyTimeout = setTimeout(() => {
      if (!finished) {
        console.warn('supabase.auth.getSession() timed out. Proceeding.');
        setLoading(false);
      }
    }, 4000);

    // Get initial session on mount to ensure we load the session immediately
    supabase.auth.getSession()
      .then(({ data }) => {
        finished = true;
        clearTimeout(safetyTimeout);
        setSession(data?.session || null);
        setLoading(false);
      })
      .catch(err => {
        finished = true;
        clearTimeout(safetyTimeout);
        console.error('Error getting initial session:', err);
        setLoading(false);
      });

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setLoading(false);
      });
      subscription = data?.subscription;
    } catch (err) {
      console.error('Error setting up auth state listener:', err);
    }

    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.replace('#', '') || 'hub');
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLoginSuccess = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session || null);
    } catch (err) {
      console.error('Error on handleLoginSuccess:', err);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cn_') || key.startsWith('cp_') || key.startsWith('isSidebarCollapsed_')) {
        localStorage.removeItem(key);
      }
    });
    await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (loading || (session && !isPrefsLoaded)) {
    return (
      <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <span className="text-4xl animate-pulse select-none">🧠</span>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const userName = session.user.user_metadata?.name
    || session.user.email?.split('@')[0]
    || 'você';

  let bgStyle: React.CSSProperties = {};
  if (bgType === 'color') {
    bgStyle = { backgroundColor: bgColor };
  } else if (bgType === 'image' && bgImage) {
    bgStyle = {
      backgroundImage: `url(${bgImage})`,
      backgroundAttachment: 'fixed',
    };
    if (bgImageStyle === 'center') {
      bgStyle.backgroundPosition = 'center';
      bgStyle.backgroundRepeat = 'no-repeat';
      bgStyle.backgroundSize = 'auto';
    } else if (bgImageStyle === 'repeat') {
      bgStyle.backgroundRepeat = 'repeat';
      bgStyle.backgroundSize = 'auto';
    } else if (bgImageStyle === 'contain') {
      bgStyle.backgroundRepeat = 'no-repeat';
      bgStyle.backgroundPosition = 'center';
      bgStyle.backgroundSize = 'contain';
    } else { // cover
      bgStyle.backgroundRepeat = 'no-repeat';
      bgStyle.backgroundPosition = 'center';
      bgStyle.backgroundSize = 'cover';
    }
  }
  const bgClass = bgType === 'default' ? 'bg-zinc-50 dark:bg-zinc-950' : 'bg-transparent';

  let pageContent;
  if (currentRoute === 'estudos') {
    pageContent = <EstudosApp theme={theme} toggleTheme={toggleTheme} />;
  } else if (currentRoute === 'financas') {
    pageContent = <FinancasApp />;
  } else if (currentRoute === 'saude') {
    pageContent = <SaudeApp />;
  } else if (currentRoute === 'tarefas') {
    pageContent = <TarefasApp />;
  } else if (currentRoute === 'anotacoes') {
    pageContent = <AnotacoesApp />;
  } else if (currentRoute === 'habitos') {
    pageContent = (
      <HabitosHub
        onBack={() => { window.location.hash = 'hub'; }}
        theme={theme}
        toggleTheme={toggleTheme}
        userName={userName}
      />
    );
  } else {
    pageContent = (
      <HubHome
        userName={userName}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        bgType={bgType}
        setBgType={setBgType}
        bgColor={bgColor}
        setBgColor={setBgColor}
        bgImage={bgImage}
        setBgImage={setBgImage}
        bgImageStyle={bgImageStyle}
        setBgImageStyle={setBgImageStyle}
      />
    );
  }

  return (
    <div 
      className={`min-h-screen ${bgClass} transition-colors duration-300`}
      style={bgStyle}
    >
      {pageContent}
    </div>
  );
};

export default App;
