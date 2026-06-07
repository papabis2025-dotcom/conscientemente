import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Brain } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setSuccessMsg('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setSuccessMsg('Login bem-sucedido! Entrando...');
        onLogin();
      }
    } catch (err: any) {
      const msg = err.message || 'Ocorreu um erro.';
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar.');
      else if (msg.includes('User already registered')) setError('Este e-mail já está cadastrado.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Insira seu e-mail primeiro.'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSuccessMsg('Link de recuperação enviado! Verifique seu e-mail.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-sm">

        {/* Logo / Brand */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Brain size={48} className="text-zinc-700 dark:text-zinc-300 animate-pulse" />
          <h1 className="text-2xl font-black text-zinc-800 dark:text-white mt-3 leading-none tracking-tight">
            Conscientemente
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium uppercase tracking-widest">
            Sua vida organizada
          </p>
        </div>

        {/* Headings */}
        <div className="mb-6">
          <h2 className="text-lg font-black text-zinc-800 dark:text-white leading-tight">
            {isRegistering ? 'Criar conta' : 'Acessar'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            {isRegistering
              ? 'Comece a organizar sua vida agora.'
              : 'Bem-vindo de volta. Insira suas credenciais.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 dark:text-white font-medium transition-all text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                Senha
              </label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase hover:underline"
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
              className="w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 dark:text-white font-medium transition-all text-sm"
              required={!isRegistering || password.length > 0}
            />
          </div>

          {error && (
            <p className="text-[10px] font-bold text-rose-500 uppercase bg-rose-50 dark:bg-rose-900/10 p-2.5 rounded-xl text-center">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 dark:bg-emerald-900/10 p-2.5 rounded-xl text-center">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Aguarde...' : isRegistering ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        {/* Toggle register/login */}
        <p className="text-center text-xs font-medium text-zinc-500 mt-6">
          {isRegistering ? 'Já tem conta?' : 'Ainda não é membro?'}
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); }}
            className="ml-1 text-zinc-900 dark:text-zinc-100 font-bold hover:underline"
          >
            {isRegistering ? 'Faça login' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
