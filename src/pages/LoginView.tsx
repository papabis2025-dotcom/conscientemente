
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

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      console.log('Password reset response:', { data, error });
      if (error) throw error;
      setSuccessMsg('Link de recuperação enviado! Verifique seu e-mail (inclusive spam).');
    } catch (err: any) {
      console.error('Password reset error:', err);

      // Handle network errors
      if (err.name === 'AuthRetryableFetchError' || err.message?.includes('Failed to fetch')) {
        setError('Erro de conexão. Verifique: internet, firewall, antivírus ou VPN/proxy.');
      } else {
        setError(err.message || 'Erro ao enviar e-mail de recuperação.');
      }
    } finally {
      setLoading(false);
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
                    <button type="button" onClick={handleForgotPassword} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Esqueci a senha</button>
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

          {/* Google login removed */}

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
