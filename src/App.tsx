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

  if (currentRoute === 'estudos') {
    return <EstudosApp />;
  }

  if (currentRoute === 'financas') {
    return <FinancasApp />;
  }

  if (currentRoute === 'saude') {
    return <SaudeApp />;
  }

  if (currentRoute === 'tarefas') {
    return <TarefasApp />;
  }

  return (
    <HubHome
      userName={userName}
      theme={theme}
      toggleTheme={toggleTheme}
      onLogout={handleLogout}
    />
  );
};

export default App;
