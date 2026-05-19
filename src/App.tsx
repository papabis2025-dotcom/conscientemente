import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Login from './pages/Login';
import HubHome from './pages/HubHome';
import EstudosApp from './modules/estudos/App';
import FinancasApp from './modules/financas/App';
import SaudeApp from './modules/saude/App';
import TarefasApp from './modules/tarefas/App';
import type { Session } from '@supabase/supabase-js';

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

  useEffect(() => {
    if (!session) {
      setIsPrefsLoaded(false);
      return;
    }
    const loadPreferences = async () => {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('hub_bg_type, hub_bg_color')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (prefs) {
        if (prefs.hub_bg_type) setBgType(prefs.hub_bg_type as any);
        if (prefs.hub_bg_color) setBgColor(prefs.hub_bg_color);
      }
      setIsPrefsLoaded(true);
    };
    loadPreferences();
  }, [session]);

  useEffect(() => {
    if (isPrefsLoaded && session) {
      const savePrefs = async () => {
        await supabase.from('user_preferences').upsert({
          user_id: session.user.id,
          hub_bg_type: bgType,
          hub_bg_color: bgColor
        }, { onConflict: 'user_id' });
      };
      savePrefs().catch(err => console.error('Error saving user preferences:', err));
    }
  }, [bgType, bgColor, isPrefsLoaded, session]);

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
