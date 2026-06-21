import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import logoImg from '../assets/logo.png';
import {
  Sparkles,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
  BarChart3,
  GripVertical,
  ChevronRight,
  X,
  ArrowRight,
  ShieldCheck,
  Check,
  Award,
  Layers,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

interface LoginViewProps {
  users: User[]; // Kept for interface compatibility but ignored
  onLogin: (user: User) => void; // Triggered via auth state change
  onCreateFirstUser: (name: string, pass: string) => void; // Deprecated
}

const LoginView: React.FC<LoginViewProps> = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Landing page states
  const [showAuth, setShowAuth] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'planner' | 'stats' | 'concursos'>('planner');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    console.log('Login attempt:', { email, isRegistering });

    try {
      if (isRegistering) {
        console.log('Attempting sign up...');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        console.log('Sign up response:', { data, error: signUpError });
        if (signUpError) throw signUpError;
        setSuccessMsg('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        console.log('Attempting sign in...');
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log('Sign in response:', { data, error: signInError });
        if (signInError) throw signInError;

        // If successful, show success message briefly
        if (data.session) {
          setSuccessMsg('Login bem-sucedido! Redirecionando...');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorMessage = err.message || 'Ocorreu um erro. Tente novamente.';

      // Handle network/CORS errors specifically
      if (err.name === 'AuthRetryableFetchError' || errorMessage.includes('Failed to fetch')) {
        setError('Erro de conexão com servidor. Verifique: internet, firewall, antivírus ou VPN/proxy.');
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('Por favor, confirme seu e-mail antes de fazer login.');
      } else if (errorMessage.includes('User already registered')) {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, insira seu e-mail primeiro.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    console.log('Password reset attempt for:', email);
    const redirectUrl = `${window.location.origin}/reset-password`;
    console.log('Redirect URL:', redirectUrl);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      console.log('Password reset response:', { data, error });

      if (error) throw error;

      setSuccessMsg('Link de recuperação enviado! Verifique seu e-mail (inclusive spam).');
    } catch (err: any) {
      console.error('Password reset error - Full details:', err);

      // Handle network errors
      if (err.name === 'AuthRetryableFetchError' || err.message?.includes('Failed to fetch')) {
        setError('Erro de conexão. Verifique se o projeto Supabase está ativo e se há internet.');
      } else if (err.status === 429) {
        setError('Muitas tentativas. Aguarde um momento.');
      } else {
        setError(err.message || 'Erro ao enviar e-mail de recuperação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-150 font-sans selection:bg-blue-500/20 overflow-x-hidden relative transition-colors duration-300">
      
      {/* 1. Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-white/70 dark:bg-zinc-950/70 border-b border-zinc-200/50 dark:border-zinc-800/50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Conscientemente Logo" className="w-8 h-8 object-contain" />
            <span className="font-sans font-black text-xl uppercase tracking-tighter text-zinc-900 dark:text-white">Conscientemente</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Funcionalidades</a>
            <a href="#demonstracao" className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Demonstração</a>
            <a href="#metodo" className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Metodologia</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsRegistering(false); setShowAuth(true); setError(''); setSuccessMsg(''); }}
              className="text-xs font-black uppercase tracking-wider text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white px-3 py-1.5 transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => { setIsRegistering(true); setShowAuth(true); setError(''); setSuccessMsg(''); }}
              className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 dark:hover:bg-blue-50 transition-all shadow-lg active:scale-95"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-28 pb-16 md:pt-36 md:pb-24 flex flex-col lg:flex-row items-center gap-12 relative">
        <div className="absolute top-24 left-1/4 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex-1 space-y-6 text-left relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-200/30 dark:border-blue-800/30">
            <Sparkles size={10} className="animate-spin duration-10000" />
            O Planejador Inteligente para Concursos
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-900 dark:text-white leading-tight uppercase tracking-tighter">
            Estude de forma <span className="text-blue-600 dark:text-blue-400">estratégica</span> e consciente.
          </h1>
          
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-medium max-w-lg leading-relaxed">
            Organize seu cronograma diário, automatize suas revisões espaçadas, acompanhe seu aproveitamento de questões e gerencie o progresso dos seus editais em um ecossistema minimalista e focado.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => { setIsRegistering(true); setShowAuth(true); setError(''); setSuccessMsg(''); }}
              className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-55 transition-all shadow-xl shadow-zinc-900/10 dark:shadow-none active:scale-95"
            >
              Iniciar Minha Jornada
            </button>
            <a
              href="#demonstracao"
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all flex items-center gap-1.5"
            >
              Ver Demonstração
            </a>
          </div>

          <div className="flex items-center gap-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-850/50 max-w-md">
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">100%</div>
              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Foco no Edital</div>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">Aulões</div>
              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Multi-Disciplinas</div>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">Spaced</div>
              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Revisão Padrão</div>
            </div>
          </div>
        </div>

        {/* Hero App Mockup */}
        <div className="flex-1 w-full flex justify-center lg:justify-end relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-fuchsia-400/10 dark:bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-[460px] bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            {/* Design accents */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            
            {/* Header info */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h4 className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Painel de Controle</h4>
                <h3 className="text-sm font-black text-zinc-850 dark:text-white uppercase tracking-tight">Estudos de Hoje</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Em Foco</span>
              </div>
            </div>

            {/* Widgets row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Cronômetro</span>
                  <Clock size={12} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-xl font-black text-zinc-800 dark:text-white tracking-tight tabular-nums">01:45:00</div>
                  <div className="text-[9px] font-bold text-zinc-400">Matéria: Direito Administrativo</div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Meta Diária</span>
                  <Target size={12} className="text-emerald-500" />
                </div>
                <div>
                  <div className="text-xl font-black text-zinc-800 dark:text-white tracking-tight">75%</div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated schedule items */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Atividades Planejadas</h4>
              
              {/* Overdue highlight */}
              <div className="flex items-start gap-3 p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/30 dark:border-rose-900/20 rounded-2xl">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Clock size={10} className="stroke-[3px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[11px] font-black text-rose-600 dark:text-rose-450 uppercase tracking-tight truncate">Revisão de Atos Administrativos</h5>
                    <span className="text-[8px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded uppercase">Atrasado</span>
                  </div>
                  <p className="text-[9px] font-bold text-rose-500/80 mt-0.5">Venceu ontem • Direito Administrativo</p>
                </div>
              </div>

              {/* Special Activity: Aulão */}
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border border-fuchsia-200/40 dark:border-fuchsia-900/25 rounded-2xl">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 shrink-0">
                  <Sparkles size={10} className="stroke-[3px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-tight truncate">Aulão: Língua Portuguesa + RLM</h5>
                    <span className="text-[8px] font-black text-fuchsia-600 bg-fuchsia-100 dark:bg-fuchsia-900/40 px-1.5 py-0.5 rounded uppercase font-sans">Especial</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-[8px] font-black text-zinc-400 uppercase">Português</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span className="text-[8px] font-black text-zinc-400 uppercase">RLM</span>
                  </div>
                </div>
              </div>

              {/* Normal completed activity */}
              <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-250/20 dark:border-zinc-800/40 rounded-2xl opacity-60">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                  <Check size={10} className="stroke-[3px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[11px] font-black text-zinc-550 dark:text-zinc-400 uppercase tracking-tight truncate line-through">Teoria de Direitos Fundamentais</h5>
                  <p className="text-[9px] font-medium text-zinc-500 mt-0.5">Concluído às 10:15</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Recursos Section */}
      <section id="recursos" className="py-20 border-t border-zinc-200/50 dark:border-zinc-855/50 max-w-7xl mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Funcionalidades e Recursos</h4>
          <h2 className="text-3xl md:text-4xl font-black text-zinc-800 dark:text-white uppercase tracking-tighter">O que torna o sistema ideal?</h2>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Tudo o que você precisa para uma organização impecável, desenhado sob uma interface limpa e intuitiva.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: Planner */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl dark:hover:border-zinc-700/80 transition-all group flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-white mb-2">Planner Semanal</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Organize seus ciclos de teoria, sessões de questões, simulados e atividades especiais. Tudo integrado em um calendário dinâmico e flexível.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Spaced Repetition */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl dark:hover:border-zinc-700/80 transition-all group flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-855 dark:text-white mb-2">Revisão Espaçada Automática</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  O sistema agenda automaticamente sessões de revisão no seu Planner baseando-se no histórico das sessões de estudo realizadas, mitigando a curva do esquecimento.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Editais Progress */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl dark:hover:border-zinc-700/80 transition-all group flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Award size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-white mb-2">Controle de Editais</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Cadastre seus concursos e defina imagens de perfil exclusivas por upload local. Monitore o percentual de cobertura do edital em tempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Drag & Drop order */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl dark:hover:border-zinc-700/80 transition-all group flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <GripVertical size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-805 dark:text-white mb-2">Arrastar e Reordenar Matérias</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Ordene suas disciplinas verticalmente com facilidade. Use o ícone de Grip na lista de matérias para definir a prioridade sequencial por Drag & Drop.
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Simulados */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl dark:hover:border-zinc-700/80 transition-all group flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 flex items-center justify-center">
                <Target size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-white mb-2">Histórico de Simulados</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Registre as notas de suas provas simuladas de forma estruturada. Monitore a sua curva de evolução e identifique as disciplinas limitantes.
                </p>
              </div>
            </div>
          </div>

          {/* Card 6: Statistics breakdown */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl dark:hover:border-zinc-700/80 transition-all group flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-white mb-2">Estatísticas e Priorização</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Analise métricas avançadas com detalhamento opcional de tópicos (assuntos). Identifique prioridades de estudo recomendadas de acordo com seus erros.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Demonstração Interativa Preview */}
      <section id="demonstracao" className="py-20 bg-zinc-100/50 dark:bg-zinc-900/20 border-y border-zinc-200/50 dark:border-zinc-800/50 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500">Demonstração Interativa</h4>
            <h2 className="text-3xl font-black text-zinc-850 dark:text-white uppercase tracking-tighter">Conheça por dentro</h2>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Alterne entre as abas para experimentar as telas de gerenciamento do sistema.</p>
          </div>

          {/* Abas */}
          <div className="flex justify-center gap-2 mb-8 bg-zinc-200/40 dark:bg-zinc-900 p-1.5 rounded-2xl w-fit mx-auto border border-zinc-200/30 dark:border-zinc-800/40">
            <button
              onClick={() => setActivePreviewTab('planner')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activePreviewTab === 'planner' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'}`}
            >
              📅 Cronograma
            </button>
            <button
              onClick={() => setActivePreviewTab('stats')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activePreviewTab === 'stats' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'}`}
            >
              📊 Assuntos e Prioridades
            </button>
            <button
              onClick={() => setActivePreviewTab('concursos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activePreviewTab === 'concursos' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'}`}
            >
              🏆 Editais cadastrados
            </button>
          </div>

          {/* Conteúdo da aba ativa */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-250/70 dark:border-zinc-800/60 rounded-3xl p-6 md:p-8 shadow-xl max-w-4xl mx-auto min-h-[380px] flex flex-col justify-between transition-all">
            
            {/* Aba 1: Planner */}
            {activePreviewTab === 'planner' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-850 dark:text-white">Cronograma Inteligente</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Visualização de planejamento semanal</p>
                  </div>
                  <button className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/85 transition-all">Sincronizar Revisões</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4 space-y-3">
                    <h4 className="text-[10px] font-black text-zinc-455 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200/55 dark:border-zinc-800/60 pb-2">Segunda-feira</h4>
                    
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/25 dark:border-blue-900/20 rounded-xl space-y-1.5">
                      <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded uppercase">Teoria</span>
                      <h5 className="text-[11px] font-black text-zinc-800 dark:text-white">Direito Constitucional</h5>
                      <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500">1h30 • Direitos Fundamentais</p>
                    </div>

                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/25 dark:border-emerald-900/20 rounded-xl space-y-1.5">
                      <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded uppercase">Revisão</span>
                      <h5 className="text-[11px] font-black text-zinc-800 dark:text-white">Direito Administrativo</h5>
                      <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500">45m • Atos Administrativos</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4 space-y-3">
                    <h4 className="text-[10px] font-black text-zinc-455 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200/55 dark:border-zinc-800/60 pb-2">Terça-feira</h4>
                    
                    <div className="p-3 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border border-fuchsia-200/35 dark:border-fuchsia-900/20 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/40 px-1.5 py-0.5 rounded uppercase">Aulão de Revisão</span>
                        <Sparkles size={10} className="text-fuchsia-500" />
                      </div>
                      <h5 className="text-[11px] font-black text-zinc-800 dark:text-white">RLM + Língua Portuguesa</h5>
                      <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500">2h00 • Divisão Proporcional</p>
                    </div>

                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/25 dark:border-indigo-900/20 rounded-xl space-y-1.5">
                      <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded uppercase">Exercícios</span>
                      <h5 className="text-[11px] font-black text-zinc-800 dark:text-white">Direito Tributário</h5>
                      <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500">1h00 • Competência</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4 space-y-3">
                    <h4 className="text-[10px] font-black text-zinc-455 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200/55 dark:border-zinc-800/60 pb-2">Quarta-feira</h4>
                    
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/25 dark:border-rose-900/20 rounded-xl space-y-1.5">
                      <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded uppercase">Simulado</span>
                      <h5 className="text-[11px] font-black text-zinc-800 dark:text-white">Simulado Nacional RFB</h5>
                      <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500">4h00 • 80 Questões</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba 2: Estatísticas */}
            {activePreviewTab === 'stats' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-2">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-850 dark:text-white">Desempenho por Assunto</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Identificação e priorização recomendada de tópicos</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Mostrar Assuntos</span>
                    <div className="w-8 h-4 bg-blue-500 rounded-full p-0.5 cursor-pointer flex items-center justify-end">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="border border-zinc-200/50 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200/40 dark:border-zinc-850/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-black text-zinc-805 dark:text-white uppercase tracking-tight">Direito Administrativo</span>
                      </div>
                      <div className="flex items-center gap-6 text-[10px]">
                        <div>
                          <span className="text-zinc-400 font-bold uppercase block text-[8px] text-right">Média</span>
                          <span className="font-black text-zinc-700 dark:text-zinc-300">76% (120/158)</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-bold uppercase block text-[8px] text-right">Peso</span>
                          <span className="font-black text-zinc-700 dark:text-zinc-300">x 3.0</span>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
                      <div className="flex items-center justify-between p-3.5 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">1. Atos Administrativos</span>
                          <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/30 dark:border-rose-900/20 px-1.5 py-0.5 rounded uppercase">Prioridade Alta</span>
                        </div>
                        <span className="text-xs font-black text-rose-500">54% de acerto</span>
                      </div>
                      <div className="flex items-center justify-between p-3.5 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">2. Licitações (Lei 14.133/21)</span>
                          <span className="text-[8px] font-black text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/30 dark:border-amber-900/20 px-1.5 py-0.5 rounded uppercase">Prioridade Média</span>
                        </div>
                        <span className="text-xs font-black text-amber-550 dark:text-amber-400">67% de acerto</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba 3: Concursos */}
            {activePreviewTab === 'concursos' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-855 dark:text-white">Editais e Metas</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Progresso total dos estudos por concurso</p>
                  </div>
                  <button className="bg-zinc-900 text-white dark:bg-zinc-850 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-850 dark:hover:bg-zinc-700/80 transition-all">Novo Concurso</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4.5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-200/30 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shrink-0">
                        RFB
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-white">Receita Federal</h4>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Auditor Fiscal</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                        <span>Cobertura do Edital</span>
                        <span className="text-zinc-700 dark:text-zinc-300">72%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '72%' }}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-zinc-200/30 dark:border-zinc-800/40 font-bold text-zinc-400">
                      <span>12 Matérias</span>
                      <span>Peso Geral: 3.0</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl p-4.5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-200/30 dark:border-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-xs shrink-0">
                        TRT
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-white">TRT 2ª Região</h4>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Analista Judiciário</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                        <span>Cobertura do Edital</span>
                        <span className="text-zinc-700 dark:text-zinc-300">45%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-zinc-200/30 dark:border-zinc-800/40 font-bold text-zinc-400">
                      <span>8 Matérias</span>
                      <span>Peso Geral: 2.0</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé da demo */}
            <div className="mt-8 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold text-zinc-450 dark:text-zinc-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" />
                Seu cronograma se adapta dinamicamente à sua produtividade diária.
              </span>
              <button
                onClick={() => { setIsRegistering(true); setShowAuth(true); setError(''); setSuccessMsg(''); }}
                className="text-zinc-900 dark:text-white hover:underline uppercase tracking-wider flex items-center gap-1 shrink-0 font-black"
              >
                Cadastre-se para ver na prática <ArrowRight size={10} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Metodologia Section */}
      <section id="metodo" className="py-20 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-455 dark:text-zinc-500">Como funciona o método</h4>
            <h2 className="text-3xl font-black text-zinc-800 dark:text-white uppercase tracking-tighter">Estudo Consciente e de Alta Performance</h2>
            <p className="text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
              O aplicativo foi construído sob pilares científicos de aprendizagem acelerada. O cronograma gerencia automaticamente o seu fluxo de estudos com base em três premissas fundamentais:
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-150 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 text-xs font-black">1</div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-white">Estudo Ativo & Prática</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Contabilize suas questões realizadas por assunto e identifique lacunas no seu entendimento.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-150 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 text-xs font-black">2</div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-white">Spaced Repetition Determinístico</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Cronograma de revisões automáticas no Planner nos marcos de 24h, 7 dias, 15 dias e 30 dias das matérias estudadas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-150 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 text-xs font-black">3</div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-805 dark:text-white">Priorização Inteligente de Fraquezas</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Direcionamento analítico que aponta quais matérias requerem maior esforço baseado na taxa de acertos e no peso do edital.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center">
            <div className="border border-zinc-205 dark:border-zinc-800 rounded-3xl p-8 bg-zinc-50/40 dark:bg-zinc-900/10 max-w-md space-y-6 w-full">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-blue-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-white">Garantia de Organização</h4>
              </div>
              
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 italic">
                "O Conscientemente removeu toda a complexidade do meu planejamento de estudo. Não preciso me preocupar em criar planilhas de revisões complexas; o sistema faz tudo por mim e aponta exatamente o que priorizar."
              </p>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-850 dark:text-white font-black">MF</div>
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-wide text-zinc-800 dark:text-white">Mateus Faria</h5>
                  <p className="text-[8px] text-zinc-400 font-bold uppercase">Aprovado no TRT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Final Banner */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="bg-zinc-900 dark:bg-zinc-900/60 border border-zinc-850 dark:border-zinc-800 rounded-3xl p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Pronto para conquistar sua posse?</h2>
            <p className="text-sm font-medium text-zinc-450 max-w-lg mx-auto">
              Junte-se a concurseiros focados e otimize sua rotina de estudos com o planejador estratégico minimalista definitivo.
            </p>
            
            <div className="pt-4">
              <button
                onClick={() => { setIsRegistering(true); setShowAuth(true); setError(''); setSuccessMsg(''); }}
                className="bg-white text-zinc-950 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-xl active:scale-95"
              >
                Cadastrar Gratuitamente
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-12 border-t border-zinc-200/50 dark:border-zinc-850/50 max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Conscientemente Logo" className="w-5 h-5 object-contain" />
          <span>© {new Date().getFullYear()} Conscientemente. Todos os direitos reservados.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#recursos" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Recursos</a>
          <a href="#demonstracao" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Demonstração</a>
          <a href="#metodo" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Metodologia</a>
        </div>
      </footer>

      {/* 8. Modal de Autenticação (Overlay com Glassmorphism) */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-lg animate-in fade-in duration-300">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-850 rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-755 dark:hover:text-zinc-205 transition-colors p-1"
            >
              <X size={18} />
            </button>

            {/* Header do Form */}
            <div className="flex flex-col items-center mb-8 mt-2">
              <img src={logoImg} alt="Conscientemente Logo" className="w-14 h-14 object-contain mb-3 drop-shadow-xl" />
              <h2 className="text-xl font-sans font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Conscientemente</h2>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-505 font-black uppercase tracking-wider mt-1 text-center">
                {isRegistering ? 'Crie sua conta gratuita e comece já' : 'Acesse seu painel estratégico'}
              </p>
            </div>

            {/* Formulário de Acesso */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">E-mail de Acesso</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudante@exemplo.com"
                    className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/75 dark:border-zinc-800/85 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 dark:text-white font-medium text-xs transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Senha</label>
                    {!isRegistering && (
                      <button 
                        type="button" 
                        onClick={handleForgotPassword} 
                        className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/75 dark:border-zinc-800/85 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 dark:text-white font-medium text-xs transition-all"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-[9px] font-black text-rose-500 uppercase bg-rose-50 dark:bg-rose-900/10 p-2.5 rounded-xl text-center leading-normal border border-rose-200/10">
                  {error}
                </p>
              )}
              {successMsg && (
                <p className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/10 p-2.5 rounded-xl text-center leading-normal border border-emerald-255/10">
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-650 dark:hover:bg-blue-50 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : (isRegistering ? 'Criar minha conta' : 'Entrar no sistema')}
              </button>
            </form>

            <p className="text-center text-xs font-medium text-zinc-500 mt-6">
              {isRegistering ? 'Já possui uma conta?' : 'Ainda não é membro?'}
              <button
                onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); }}
                className="ml-1.5 text-zinc-900 dark:text-zinc-150 font-black hover:underline"
              >
                {isRegistering ? 'Faça login' : 'Cadastre-se grátis'}
              </button>
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginView;
