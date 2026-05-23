import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Login from './pages/Login';
import HubHome from './pages/HubHome';
import EstudosApp from './modules/estudos/App';
import FinancasApp from './modules/financas/App';
import SaudeApp from './modules/saude/App';
import TarefasApp from './modules/tarefas/App';
import AnotacoesApp from './modules/anotacoes/App';
import type { Session } from '@supabase/supabase-js';

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
  'cp_menu_order',
  'cn_theme',
  'cn_notifications',
  'cn_anotacoes'
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

    if (key === 'cn_habits' || key === 'cp_study_tasks' || key === 'cn_anotacoes') {
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cn_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [bgType, setBgType] = useState<'default' | 'color'>('default');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isPrefsLoaded, setIsPrefsLoaded] = useState(false);

  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [lastKnownSettings, setLastKnownSettings] = useState<string>('');

  useEffect(() => {
    if (!session) {
      setIsPrefsLoaded(false);
      return;
    }
    const loadPreferences = async () => {
      try {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('hub_bg_type, hub_bg_color, hub_bg_image_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (prefs) {
          if (prefs.hub_bg_type) setBgType(prefs.hub_bg_type as any);
          if (prefs.hub_bg_color) setBgColor(prefs.hub_bg_color);

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

          const mergedTheme = merged['cn_theme'];
          if (mergedTheme && (mergedTheme === 'light' || mergedTheme === 'dark')) {
            setTheme(mergedTheme);
          }

          const updatedTime = Date.now();
          setLastSyncTime(updatedTime);
          setLastKnownSettings(JSON.stringify(merged));

          const payload: SyncedPayload = {
            updatedAt: updatedTime,
            settings: merged
          };

          await supabase.from('user_preferences').upsert({
            user_id: session.user.id,
            hub_bg_type: prefs.hub_bg_type || bgType,
            hub_bg_color: prefs.hub_bg_color || bgColor,
            hub_bg_image_url: JSON.stringify(payload)
          }, { onConflict: 'user_id' });
        } else {
          // Initialize DB row with local settings
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
        setIsPrefsLoaded(true);
      }
    };
    loadPreferences();
  }, [session]);

  useEffect(() => {
    if (isPrefsLoaded && session) {
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
      };
      savePrefs().catch(err => console.error('Error saving user preferences:', err));
    }
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

            const mergedTheme = merged['cn_theme'];
            if (mergedTheme && (mergedTheme === 'light' || mergedTheme === 'dark')) {
              setTheme(mergedTheme);
            }

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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.replace('#', '') || 'hub');
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <span className="text-4xl animate-pulse select-none">🧠</span>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  const userName = session.user.user_metadata?.name
    || session.user.email?.split('@')[0]
    || 'você';

  const bgStyle = bgType === 'color' ? { backgroundColor: bgColor } : {};
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
