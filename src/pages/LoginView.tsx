
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setSuccessMsg('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col md:flex-row z-[100] animate-in fade-in duration-700">
      {/* Left Side - Branding & Inspiration */}
      <div className="hidden md:flex md:w-1/2 bg-blue-700 dark:bg-blue-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 text-white max-w-md">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-700 font-black text-3xl mb-8 shadow-2xl">G</div>
          <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter mb-4 leading-tight">Gabaritando Questões</h1>
          <p className="text-blue-100 text-lg font-medium mb-8 leading-relaxed">
            A plataforma definitiva para quem busca a aprovação. Planeje, execute e analise sua evolução com inteligência.
          </p>
          <div className="flex gap-4 items-center">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-blue-700 bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold">U{i}</div>
              ))}
            </div>
            <p className="text-xs font-bold text-blue-200">+2.500 concurseiros ativos hoje</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm space-y-8">
          <div className="md:hidden flex flex-col items-center mb-10">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-xl shadow-blue-500/20">G</div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Gabaritando Questões</h2>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {isRegistering ? 'Crie sua conta gratuita' : 'Acesse seu painel'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isRegistering ? 'Comece sua jornada rumo à posse hoje mesmo.' : 'Bem-vindo de volta! Insira suas credenciais abaixo.'}
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">E-mail de Acesso</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="estudante@exemplo.com"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 dark:text-white font-medium transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Senha</label>
                  {!isRegistering && (
                    <button type="button" className="text-[9px] font-black text-blue-600 uppercase hover:underline">Esqueci a senha</button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 dark:text-white font-medium transition-all"
                  required
                />
              </div>
            </div>

            {error && <p className="text-[10px] font-bold text-rose-500 uppercase bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg text-center">{error}</p>}
            {successMsg && <p className="text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg text-center">{successMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-800 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : (isRegistering ? 'Criar minha conta' : 'Entrar no sistema')}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white dark:bg-slate-950 px-4 text-slate-400">Ou continue com</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"></path><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"></path><path fill="#FBBC05" d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.956H.957a8.991 8.991 0 0 0 0 8.088l3.007-2.332z"></path><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z"></path></svg>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Entrar com Google</span>
          </button>

          <p className="text-center text-xs font-medium text-slate-500">
            {isRegistering ? 'Já possui uma conta?' : 'Ainda não é membro?'}
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); }}
              className="ml-1 text-blue-600 font-bold hover:underline"
            >
              {isRegistering ? 'Faça login' : 'Cadastre-se grátis'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
