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
import { Brain, Lock } from 'lucide-react';
import GlobalSidebar from './components/GlobalSidebar';
import FaviconIcon from './components/FaviconIcon';

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
  'cn_custom_bg_type',
  'cn_custom_bg_color',
  'cn_custom_bg_image',
  'cn_custom_bg_style',
  'cn_push_notifications_enabled',
  'cn_deleted_habit_ids',
  'cn_deleted_note_ids',
  'cn_deleted_folder_ids',
  'cp_deleted_study_task_ids',
  'cn_saude_activity_types',
  'cn_saude_muscle_groups',
  'cn_saude_dashboard_layout',
  'cn_saude_sleep_logs',
  'cn_saude_sleep_calibrations',
  'cn_home_cards_layout',
  'cn_home_widgets_order',
  'cn_home_widgets_visibility',
  'cn_global_alignment',
  'cn_module_pins',
  'cn_sleep_opacity',
  'cn_calendar_opacity',
  'cn_habits_opacity',
  'cn_calendar_collapsed',
  'cn_sidebar_expanded',
  'global_sidebar_collapsed',
  'estudos_deleted_review_ids',
  'cn_sound_enabled',
  'estudos_custom_review_days',
  'estudos_disabled_reviews_map',
  'cp_cronograma_prefs_map',
  'cp_deleted_scheduled_ids',
  'estudos_weights_by_course',
  'estudos_weight_acc',
  'estudos_weight_subj',
  'estudos_weight_qtd',
  'estudos_weight_time',
  'estudos_review_days_locked',
  'estudos_weights_locked',
];

function getSanitizedLocalSettings(): Record<string, string | null> {
  const localSettings: Record<string, string | null> = {};
  SYNC_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    localSettings[key] = val;
  });
  return localSettings;
}

function getSupabaseSanitizedSettings(settings: Record<string, string | null>): Record<string, string | null> {
  const sanitized = { ...settings };
  if (sanitized['cn_custom_bg_image'] && sanitized['cn_custom_bg_image'].startsWith('data:image/') && sanitized['cn_custom_bg_image'].length > 450_000) {
    sanitized['cn_custom_bg_image'] = null;
  }
  return sanitized;
}

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
      key === 'cp_dashboard_layout_v19' ||
      key === 'cp_dashboard_layout_v20' ||
      key === 'cp_scheduled_studies' ||
      key === 'cn_saude_dashboard_layout' ||
      key === 'cn_home_cards_layout' ||
      key === 'cn_saude_sleep_logs' ||
      key === 'cn_saude_sleep_calibrations'
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
    } else if (key === 'cn_home_widgets_visibility' || key === 'cn_module_pins') {
      try {
        const localObj = localVal ? JSON.parse(localVal) : {};
        const remoteObj = remoteVal ? JSON.parse(remoteVal) : {};
        if (typeof localObj === 'object' && typeof remoteObj === 'object') {
          merged[key] = JSON.stringify({ ...remoteObj, ...localObj });
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_anotacoes') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          const mergedList = preferRemote
            ? mergeLists(localList, remoteList)
            : mergeLists(remoteList, localList);
          
          const localDeletedRaw = local['cn_deleted_note_ids'] || '[]';
          const remoteDeletedRaw = remote['cn_deleted_note_ids'] || '[]';
          const deletedIdsSet = new Set<string>();
          try {
            const localDeleted = JSON.parse(localDeletedRaw);
            if (Array.isArray(localDeleted)) localDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}
          try {
            const remoteDeleted = JSON.parse(remoteDeletedRaw);
            if (Array.isArray(remoteDeleted)) remoteDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}

          const filteredList = mergedList.filter((n: any) => !deletedIdsSet.has(n.id));
          merged[key] = JSON.stringify(filteredList);
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_anotacoes_folders') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          const mergedList = preferRemote
            ? mergeLists(localList, remoteList)
            : mergeLists(remoteList, localList);
          
          const localDeletedRaw = local['cn_deleted_folder_ids'] || '[]';
          const remoteDeletedRaw = remote['cn_deleted_folder_ids'] || '[]';
          const deletedIdsSet = new Set<string>();
          try {
            const localDeleted = JSON.parse(localDeletedRaw);
            if (Array.isArray(localDeleted)) localDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}
          try {
            const remoteDeleted = JSON.parse(remoteDeletedRaw);
            if (Array.isArray(remoteDeleted)) remoteDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}

          const filteredList = mergedList.filter((f: any) => !deletedIdsSet.has(f.id));
          merged[key] = JSON.stringify(filteredList);
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cp_study_tasks') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          const mergedList = preferRemote
            ? mergeLists(localList, remoteList)
            : mergeLists(remoteList, localList);
          
          const localDeletedRaw = local['cp_deleted_study_task_ids'] || '[]';
          const remoteDeletedRaw = remote['cp_deleted_study_task_ids'] || '[]';
          const deletedIdsSet = new Set<string>();
          try {
            const localDeleted = JSON.parse(localDeletedRaw);
            if (Array.isArray(localDeleted)) localDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}
          try {
            const remoteDeleted = JSON.parse(remoteDeletedRaw);
            if (Array.isArray(remoteDeleted)) remoteDeleted.forEach(id => deletedIdsSet.add(id));
          } catch {}

          const filteredList = mergedList.filter((t: any) => !deletedIdsSet.has(t.id));
          merged[key] = JSON.stringify(filteredList);
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
    } else if (
      key === 'cn_cleared_notifications' ||
      key === 'cn_deleted_habit_ids' ||
      key === 'cn_deleted_note_ids' ||
      key === 'cn_deleted_folder_ids' ||
      key === 'cp_deleted_study_task_ids' ||
      key === 'estudos_deleted_review_ids'
    ) {
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
    } else if (key === 'cn_saude_activity_types') {
      try {
        const localList = JSON.parse(localVal);
        const remoteList = JSON.parse(remoteVal);
        if (Array.isArray(localList) && Array.isArray(remoteList)) {
          const map = new Map<string, { name: string; color: string }>();
          localList.forEach((item: any) => {
            if (item && item.name) map.set(item.name.toLowerCase(), item);
          });
          remoteList.forEach((item: any) => {
            if (item && item.name) map.set(item.name.toLowerCase(), item);
          });
          merged[key] = JSON.stringify(Array.from(map.values()));
        } else {
          merged[key] = preferRemote ? remoteVal : localVal;
        }
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cn_saude_muscle_groups') {
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
    } else if (key === 'cp_cronograma_prefs_map' || key === 'estudos_weights_by_course' || key === 'estudos_disabled_reviews_map') {
      try {
        const localObj = localVal ? JSON.parse(localVal) : {};
        const remoteObj = remoteVal ? JSON.parse(remoteVal) : {};
        merged[key] = JSON.stringify({ ...remoteObj, ...localObj });
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'cp_deleted_scheduled_ids' || key === 'estudos_deleted_review_ids') {
      try {
        const localList = localVal ? JSON.parse(localVal) : [];
        const remoteList = remoteVal ? JSON.parse(remoteVal) : [];
        merged[key] = JSON.stringify(Array.from(new Set([...localList, ...remoteList])));
      } catch {
        merged[key] = preferRemote ? remoteVal : localVal;
      }
    } else if (key === 'estudos_custom_review_days') {
      try {
        const localArr = localVal ? JSON.parse(localVal) : null;
        const remoteArr = remoteVal ? JSON.parse(remoteVal) : null;
        const isLocalCustom = Array.isArray(localArr) && localArr.length > 0 && localVal !== '[7,30,90,15,45]';
        const isRemoteCustom = Array.isArray(remoteArr) && remoteArr.length > 0 && remoteVal !== '[7,30,90,15,45]';

        if (isLocalCustom) {
          merged[key] = localVal;
        } else if (isRemoteCustom) {
          merged[key] = remoteVal;
        } else if (Array.isArray(localArr) && localArr.length > 0) {
          merged[key] = localVal;
        } else if (Array.isArray(remoteArr) && remoteArr.length > 0) {
          merged[key] = remoteVal;
        } else {
          merged[key] = localVal || remoteVal;
        }
      } catch {
        merged[key] = localVal || remoteVal;
      }
    } else if (key === 'cn_custom_bg_image') {
      if (localVal && !remoteVal) {
        merged[key] = localVal;
      } else if (!localVal && remoteVal) {
        merged[key] = remoteVal;
      } else if (localVal && remoteVal) {
        merged[key] = preferRemote ? remoteVal : localVal;
      } else {
        merged[key] = null;
      }
    } else {
      merged[key] = preferRemote ? remoteVal : localVal;
    }
  });

  return merged;
}

function isColorDark(hexColor: string): boolean {
  if (!hexColor || !hexColor.startsWith('#')) return true;
  const c = hexColor.substring(1);
  let r = 0, g = 0, b = 0;
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16);
    g = parseInt(c[1] + c[1], 16);
    b = parseInt(c[2] + c[2], 16);
  } else if (c.length === 6) {
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  } else {
    return true;
  }
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128;
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.replace('#', '') || 'hub');
  const [isHomeEditMode, setIsHomeEditMode] = useState(false);
  const [globalAlignment, setGlobalAlignment] = useState<'left' | 'center' | 'right'>(() => {
    return (localStorage.getItem('cn_global_alignment') as any) || 'center';
  });

  useEffect(() => {
    const handleSync = () => {
      const savedAlign = (localStorage.getItem('cn_global_alignment') as any) || 'center';
      setGlobalAlignment(savedAlign);
    };
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('local-settings-changed', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('local-settings-changed', handleSync);
    };
  }, []);

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
  const [lastAutoColor, setLastAutoColor] = useState<string>('');

  const [bgType, setBgType] = useState<'default' | 'color' | 'image'>(() => {
    return (localStorage.getItem('cn_custom_bg_type') as any) || 'default';
  });
  const [bgColor, setBgColor] = useState<string>(() => {
    return localStorage.getItem('cn_custom_bg_color') || '#ffffff';
  });
  const [bgImage, setBgImage] = useState<string>(() => localStorage.getItem('cn_custom_bg_image') || '');
  const [bgImageStyle, setBgImageStyle] = useState<string>(() => localStorage.getItem('cn_custom_bg_style') || 'cover');

  useEffect(() => {
    localStorage.setItem('cn_custom_bg_type', bgType);
  }, [bgType]);

  useEffect(() => {
    localStorage.setItem('cn_custom_bg_color', bgColor);
  }, [bgColor]);
  const [isPrefsLoaded, setIsPrefsLoaded] = useState(true);
  const [unlockedModules, setUnlockedModules] = useState<Set<string>>(() => new Set());
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    setUnlockedModules(new Set());
  }, [session?.user?.id]);

  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [lastKnownSettings, setLastKnownSettings] = useState<string>('');

  const prefsLoadedForUserRef = useRef<string | null>(null);
  const initialBgRef = useRef({ bgType: 'default', bgColor: '#ffffff' });

  // useRef para o throttle do pullAndMerge — persiste entre re-execuções do useEffect,
  // ao contrário de uma variável local que seria zerada a cada re-render do efeito.
  const lastPullAtRef = useRef<number>(0);

  // Refs para bgType/bgColor/lastSyncTime usados no pullAndMerge — evitam a necessidade
  // de listá-los como dependências do useEffect, estabilizando os listeners focus/hashchange.
  const bgTypeRef = useRef(bgType);
  const bgColorRef = useRef(bgColor);
  const lastSyncTimeRef = useRef(lastSyncTime);

  // Manter refs sincronizados com os estados
  useEffect(() => { bgTypeRef.current = bgType; }, [bgType]);
  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);
  useEffect(() => { lastSyncTimeRef.current = lastSyncTime; }, [lastSyncTime]);

  useEffect(() => {
    if (!session) {
      setIsPrefsLoaded(false);
      prefsLoadedForUserRef.current = null;
      return;
    }

    if (prefsLoadedForUserRef.current === session.user.id) {
      return;
    }

    // Safety check: se o usuário logado for diferente do usuário anterior salvo localmente,
    // limpa o localStorage local para prevenir vazamento e contaminação de preferências entre contas.
    const lastUser = localStorage.getItem('cn_last_user_id');
    if (lastUser && lastUser !== session.user.id) {
      Object.keys(localStorage).forEach(key => {
        if (
          key.startsWith('cn_') ||
          key.startsWith('cp_') ||
          key.startsWith('gp_') ||
          key.startsWith('estudos_') ||
          key.startsWith('financas_') ||
          key.startsWith('saude_') ||
          key.startsWith('tarefas_') ||
          key.startsWith('anotacoes_') ||
          key.startsWith('global_') ||
          key.startsWith('isSidebarCollapsed_')
        ) {
          localStorage.removeItem(key);
        }
      });
    }
    localStorage.setItem('cn_last_user_id', session.user.id);
    prefsLoadedForUserRef.current = session.user.id;
    lastPullAtRef.current = 0; // Permite sincronização imediata sem esperar o throttle na primeira carga

    const loadPreferences = async () => {
      // 1. Immediately apply local settings so UI renders without delay
      try {
        const savedBgType = (localStorage.getItem('cn_custom_bg_type') as any) || 'default';
        const savedBgColor = localStorage.getItem('cn_custom_bg_color') || '#ffffff';
        const savedBgImage = localStorage.getItem('cn_custom_bg_image') || '';
        const savedBgStyle = localStorage.getItem('cn_custom_bg_style') || 'cover';
        setBgType(savedBgType);
        setBgColor(savedBgColor);
        setBgImage(savedBgImage);
        setBgImageStyle(savedBgStyle);
        initialBgRef.current = { bgType: savedBgType, bgColor: savedBgColor };
      } catch (e) {
        console.warn('Error reading initial local settings:', e);
      } finally {
        setIsPrefsLoaded(true);
      }

      // 2. Optional background sync with Supabase (never blocks UI)
      try {
        const { data: prefs, error: selectError } = await supabase
          .from('user_preferences')
          .select('hub_bg_type, hub_bg_color, hub_bg_image_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (selectError || !prefs) return;

        const localSettings = getSanitizedLocalSettings();
        let remotePayload: SyncedPayload | null = null;
        if (prefs.hub_bg_image_url) {
          try {
            remotePayload = JSON.parse(prefs.hub_bg_image_url);
          } catch (e) {}
        }

        const remoteSettings = remotePayload?.settings || {};
        const remoteUpdatedAt = remotePayload?.updatedAt || 0;
        const merged = mergeSettings(localSettings, remoteSettings, remoteUpdatedAt > 0);

        const finalBgType = (merged['cn_custom_bg_type'] as any) || prefs.hub_bg_type || 'default';
        const finalBgColor = merged['cn_custom_bg_color'] || prefs.hub_bg_color || '#ffffff';
        const finalBgImage = merged['cn_custom_bg_image'] || '';
        const finalBgStyle = merged['cn_custom_bg_style'] || 'cover';
        setBgType(finalBgType);
        setBgColor(finalBgColor);
        if (finalBgImage) setBgImage(finalBgImage);
        if (finalBgStyle) setBgImageStyle(finalBgStyle);

        SYNC_KEYS.forEach(key => {
          const val = merged[key];
          if (val !== null && val !== undefined) {
            localStorage.setItem(key, val);

            if (key === 'cp_cronograma_prefs_map') {
              try {
                const map = JSON.parse(val);
                if (map && typeof map === 'object') {
                  Object.entries(map).forEach(([concId, p]) => {
                    if (p) localStorage.setItem(`cp_cronograma_prefs_${concId}`, typeof p === 'string' ? p : JSON.stringify(p));
                  });
                }
              } catch (e) {}
            } else if (key === 'estudos_disabled_reviews_map') {
              try {
                const map = JSON.parse(val);
                if (map && typeof map === 'object') {
                  Object.entries(map).forEach(([concId, isDisabled]) => {
                    if (isDisabled) {
                      localStorage.setItem(`estudos_disabled_reviews_${concId}`, 'true');
                    } else {
                      localStorage.removeItem(`estudos_disabled_reviews_${concId}`);
                    }
                  });
                }
              } catch (e) {}
            }
          }
        });
        window.dispatchEvent(new Event('local-storage-sync'));
      } catch (err) {
        console.warn('Supabase preferences sync bypassed (using local storage):', err);
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
      const localSettings = getSanitizedLocalSettings();
      const dbSettings = getSupabaseSanitizedSettings(localSettings);
      const payload: SyncedPayload = {
        updatedAt: lastSyncTime || Date.now(),
        settings: dbSettings
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
  // Runs every 60s (not 5s) to avoid overwhelming the database.
  useEffect(() => {
    if (!session || !isPrefsLoaded) return;

    const interval = setInterval(async () => {
      const localSettings = getSanitizedLocalSettings();
      const dbSettings = getSupabaseSanitizedSettings(localSettings);

      const currentSerialized = JSON.stringify(localSettings);
      if (currentSerialized !== lastKnownSettings) {
        const updatedTime = Date.now();
        const payload: SyncedPayload = {
          updatedAt: updatedTime,
          settings: dbSettings
        };

        const payloadJson = JSON.stringify(payload);

        // Safety guard: skip write if payload is larger than 800 KB.
        // A large payload indicates corrupted/duplicated data in localStorage.
        if (payloadJson.length > 800_000) {
          console.warn(
            `Sync skipped: payload too large (${(payloadJson.length / 1024).toFixed(0)} KB). ` +
            'Clear corrupted localStorage keys to resume sync.'
          );
          return;
        }

        try {
          await supabase.from('user_preferences').upsert({
            user_id: session.user.id,
            hub_bg_type: bgType,
            hub_bg_color: bgColor,
            hub_bg_image_url: payloadJson
          }, { onConflict: 'user_id' });

          setLastKnownSettings(currentSerialized);
          setLastSyncTime(updatedTime);
        } catch (err) {
          console.error('Failed to sync local settings to Supabase:', err);
        }
      }
    }, 60_000); // 60 seconds — was 5s, reduced to avoid DB overload

    return () => clearInterval(interval);
  }, [session, isPrefsLoaded, lastKnownSettings, bgType, bgColor, lastSyncTime]);

  // Pull remote preferences on focus or hashchange
  useEffect(() => {
    if (!session || !isPrefsLoaded) return;

    // Throttle reduzido para 10 segundos: permite sincronização rápida e confiável
    // entre abas e computadores ao alternar telas sem sobrecarregar a rede.
    const PULL_THROTTLE_MS = 10 * 1000; // 10 segundos

    const pullAndMerge = async () => {
      const now = Date.now();
      if (now - lastPullAtRef.current < PULL_THROTTLE_MS) {
        return; // Throttled silently
      }
      lastPullAtRef.current = now;

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

          // Usa lastSyncTimeRef.current para não precisar de lastSyncTime como dep do efeito
          if (remotePayload && remotePayload.updatedAt > lastSyncTimeRef.current) {
            const localSettings = getSanitizedLocalSettings();

            const merged = mergeSettings(localSettings, remotePayload.settings, true);

            SYNC_KEYS.forEach(key => {
              const val = merged[key];
              if (val !== null && val !== undefined) {
                localStorage.setItem(key, val);

                if (key === 'cp_cronograma_prefs_map') {
                  try {
                    const map = JSON.parse(val);
                    if (map && typeof map === 'object') {
                      Object.entries(map).forEach(([concId, p]) => {
                        if (p) localStorage.setItem(`cp_cronograma_prefs_${concId}`, typeof p === 'string' ? p : JSON.stringify(p));
                      });
                    }
                  } catch (e) {}
                } else if (key === 'estudos_disabled_reviews_map') {
                  try {
                    const map = JSON.parse(val);
                    if (map && typeof map === 'object') {
                      Object.entries(map).forEach(([concId, isDisabled]) => {
                        if (isDisabled) {
                          localStorage.setItem(`estudos_disabled_reviews_${concId}`, 'true');
                        } else {
                          localStorage.removeItem(`estudos_disabled_reviews_${concId}`);
                        }
                      });
                    }
                  } catch (e) {}
                }
              } else {
                localStorage.removeItem(key);
              }
            });
            window.dispatchEvent(new Event('local-storage-sync'));

            const mergedTheme = merged['cn_theme'];
            if (mergedTheme && (mergedTheme === 'light' || mergedTheme === 'dark')) {
              setTheme(mergedTheme);
            }

            if (merged['cn_custom_bg_type']) setBgType(merged['cn_custom_bg_type'] as any);
            if (merged['cn_custom_bg_color']) setBgColor(merged['cn_custom_bg_color']);
            if (merged['cn_custom_bg_image']) setBgImage(merged['cn_custom_bg_image']);
            if (merged['cn_custom_bg_style']) setBgImageStyle(merged['cn_custom_bg_style']);

            const updatedTime = Date.now();
            setLastSyncTime(updatedTime);
            setLastKnownSettings(JSON.stringify(merged));

            const payload: SyncedPayload = {
              updatedAt: updatedTime,
              settings: merged
            };

            const payloadJson = JSON.stringify(payload);

            // Safety guard: skip write if payload exceeds 800 KB
            if (payloadJson.length > 800_000) {
              console.warn(`pullAndMerge: payload too large (${(payloadJson.length / 1024).toFixed(0)} KB), skipping write.`);
              return;
            }

            // Usa bgTypeRef.current e bgColorRef.current para não precisar de bgType/bgColor como deps
            supabase.from('user_preferences').upsert({
              user_id: session.user.id,
              hub_bg_type: (merged['cn_custom_bg_type'] as any) || bgTypeRef.current,
              hub_bg_color: merged['cn_custom_bg_color'] || bgColorRef.current,
              hub_bg_image_url: payloadJson
            }, { onConflict: 'user_id' }).then(({ error }) => {
              if (error) console.error('pullAndMerge upsert failed:', error);
            });
          }
        }
      } catch (err) {
        console.error('Error during automatic pull & merge:', err);
      }
    };

    window.addEventListener('focus', pullAndMerge);
    window.addEventListener('hashchange', pullAndMerge);

    // Cross-tab synchronization via BroadcastChannel
    let crossTabChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        crossTabChannel = new BroadcastChannel('conscientemente_cross_tab_sync');
        crossTabChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_REQUEST') {
            lastPullAtRef.current = 0;
            pullAndMerge();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    return () => {
      window.removeEventListener('focus', pullAndMerge);
      window.removeEventListener('hashchange', pullAndMerge);
      if (crossTabChannel) {
        crossTabChannel.close();
      }
    };
  }, [session, isPrefsLoaded]);

  // Listen for local settings changes to save to Supabase with debounce
  useEffect(() => {
    if (!session || !isPrefsLoaded) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const triggerImmediateSync = () => {
      const now = Date.now();
      lastSyncTimeRef.current = now;
      setLastSyncTime(now);

      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(async () => {
        const localSettings = getSanitizedLocalSettings();
        const dbSettings = getSupabaseSanitizedSettings(localSettings);

        const currentSerialized = JSON.stringify(localSettings);
        if (currentSerialized !== lastKnownSettings) {
          const updatedTime = Date.now();
          const payload: SyncedPayload = {
            updatedAt: updatedTime,
            settings: dbSettings
          };

          const payloadJson = JSON.stringify(payload);
          if (payloadJson.length > 800_000) return;

          try {
            await supabase.from('user_preferences').upsert({
              user_id: session.user.id,
              hub_bg_type: (localSettings['cn_custom_bg_type'] as any) || bgType,
              hub_bg_color: localSettings['cn_custom_bg_color'] || bgColor,
              hub_bg_image_url: payloadJson
            }, { onConflict: 'user_id' });

            setLastKnownSettings(currentSerialized);
            setLastSyncTime(updatedTime);
            lastSyncTimeRef.current = updatedTime;

            // Notify other tabs in real-time
            if (typeof BroadcastChannel !== 'undefined') {
              try {
                const bc = new BroadcastChannel('conscientemente_cross_tab_sync');
                bc.postMessage({ type: 'SYNC_REQUEST', timestamp: updatedTime });
                bc.close();
              } catch {}
            }
          } catch (err) {
            console.error('Failed to sync settings:', err);
          }
        }
      }, 1000); // 1 second debounce
    };

    window.addEventListener('local-settings-changed', triggerImmediateSync);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('local-settings-changed', triggerImmediateSync);
    };
  }, [session, isPrefsLoaded, lastKnownSettings, bgType, bgColor, lastSyncTime]);

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('cn_theme', theme);
  }, [theme]);

  // Automatically adapt theme when a new custom background color is selected
  useEffect(() => {
    if (bgType === 'color' && bgColor && bgColor !== lastAutoColor) {
      const isDark = isColorDark(bgColor);
      const targetTheme = isDark ? 'dark' : 'light';
      setTheme(targetTheme);
      setLastAutoColor(bgColor);
    }
  }, [bgType, bgColor, lastAutoColor]);

  // Auth state listener
  useEffect(() => {
    let subscription: any = null;

    // Safety timeout for loading state to prevent hanging on offline Supabase
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth listener timeout. Proceeding without session.');
      setLoading(false);
    }, 4000);

    // O onAuthStateChange do Supabase JS v2 emite automaticamente um evento INITIAL_SESSION
    // com a sessão atual imediatamente após o subscribe.
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        clearTimeout(safetyTimeout);
        setSession(session);
        setLoading(false);
      });
      subscription = data?.subscription;
    } catch (err) {
      console.error('Error setting up auth state listener:', err);
      clearTimeout(safetyTimeout);
      setLoading(false);
    }

    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.replace('#', '') || 'hub');
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearTimeout(safetyTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLoginSuccess = () => {
    setLoading(false);
  };

  const handleLogout = async () => {
    Object.keys(localStorage).forEach(key => {
      if (
        key.startsWith('cn_') ||
        key.startsWith('cp_') ||
        key.startsWith('gp_') ||
        key.startsWith('estudos_') ||
        key.startsWith('financas_') ||
        key.startsWith('saude_') ||
        key.startsWith('tarefas_') ||
        key.startsWith('anotacoes_') ||
        key.startsWith('global_') ||
        key.startsWith('isSidebarCollapsed_') ||
        key.endsWith('ActiveTab') ||
        key.includes('active_tab')
      ) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('cn_last_user_id');
    sessionStorage.clear();
    await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <FaviconIcon size={40} className="text-zinc-700 dark:text-zinc-300 animate-pulse" />
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

  const modulePins: Record<string, string> = (() => {
    try {
      return JSON.parse(localStorage.getItem('cn_module_pins') || '{}');
    } catch {
      return {};
    }
  })();
  const requiredPin = modulePins[currentRoute];

  let pageContent;
  if (requiredPin && requiredPin.length === 6 && !unlockedModules.has(currentRoute)) {
    const moduleNames: Record<string, string> = {
      estudos: 'Estudos',
      financas: 'Finanças',
      saude: 'Saúde',
      tarefas: 'Tarefas',
      anotacoes: 'Anotações',
      habitos: 'Hábitos'
    };
    pageContent = (
      <div className="min-h-screen w-full bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
            <Lock size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Módulo Protegido</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Insira a senha de 6 dígitos para desbloquear o módulo <strong className="uppercase text-zinc-800 dark:text-zinc-200">{moduleNames[currentRoute] || currentRoute}</strong> neste login.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pinInput === requiredPin) {
                setUnlockedModules(prev => new Set([...prev, currentRoute]));
                setPinInput('');
                setPinError('');
              } else {
                setPinError('PIN incorreto. Verifique a senha de 6 dígitos.');
                setPinInput('');
              }
            }}
            className="space-y-4"
          >
            <input
              type="password"
              maxLength={6}
              autoFocus
              placeholder="••••••"
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPinInput(val);
                setPinError('');
                if (val.length === 6 && val === requiredPin) {
                  setUnlockedModules(prev => new Set([...prev, currentRoute]));
                  setPinInput('');
                  setPinError('');
                }
              }}
              className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-2xl font-mono text-center tracking-[0.5em] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            />

            {pinError && (
              <p className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/30">
                {pinError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => { window.location.hash = 'hub'; setPinInput(''); setPinError(''); }}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={pinInput.length !== 6}
                className="flex-1 py-3 bg-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-amber-400 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                Desbloquear
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } else if (currentRoute === 'estudos') {
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
        isHomeEditMode={isHomeEditMode}
        setIsHomeEditMode={setIsHomeEditMode}
      />
    );
  }

  return (
    <div 
      className={`min-h-screen ${bgClass} flex relative transition-colors duration-300`}
      style={bgStyle}
      data-alignment={globalAlignment}
    >
      {currentRoute === 'hub' && (
        <GlobalSidebar
          currentRoute={currentRoute}
          userName={userName}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          isHomeEditMode={isHomeEditMode}
          setIsHomeEditMode={setIsHomeEditMode}
          bgType={bgType}
          setBgType={setBgType}
          bgColor={bgColor}
          setBgColor={setBgColor}
          bgImage={bgImage}
          setBgImage={setBgImage}
          bgImageStyle={bgImageStyle}
          setBgImageStyle={setBgImageStyle}
        />
      )}

      <div className="flex-1 min-h-screen overflow-x-hidden relative">
        {pageContent}
      </div>
    </div>
  );
};

export default App;
