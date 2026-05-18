
import React, { useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { supabase } from '../services/supabase';
import { api } from '../services/api';
import { useAppData } from '../hooks/useAppData';

interface SettingsViewProps {
  currentUserEmail: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUserEmail }) => {
  const { resetAllData, globalDailyGoal, setGlobalDailyGoal } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [localDailyGoal, setLocalDailyGoal] = useState(globalDailyGoal);

  // Update local state when global state changes (e.g. initial load)
  React.useEffect(() => {
    setLocalDailyGoal(globalDailyGoal);
  }, [globalDailyGoal]);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch all user data from Supabase
      const [concursos, sessions, simulados, schedule, goals] = await Promise.all([
        api.concursos.list(),
        api.sessions.list(),
        api.simulados.list(),
        api.schedule.list(),
        api.dailyGoals.list()
      ]);

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          concursos,
          sessions,
          simulados,
          scheduledStudies: schedule,
          dailyGoals: goals
        }
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gabaritando-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Dados exportados com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Erro ao exportar dados. Verifique o console.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.data) {
        throw new Error('Formato de arquivo inválido');
      }

      const { concursos, sessions, simulados, scheduledStudies, dailyGoals } = importData.data;

      // Confirm before importing
      const itemCount = (concursos?.length || 0) + (sessions?.length || 0) + (simulados?.length || 0);
      if (!confirm(`Importar ${itemCount} itens? Isso pode sobrescrever dados existentes.`)) {
        setIsImporting(false);
        return;
      }

      // Import data using API
      if (concursos) {
        for (const conc of concursos) {
          await api.concursos.upsert(conc);
        }
      }
      if (sessions) {
        for (const session of sessions) {
          await api.sessions.create(session);
        }
      }
      if (simulados) {
        for (const sim of simulados) {
          await api.simulados.create(sim);
        }
      }
      if (scheduledStudies) {
        for (const item of scheduledStudies) {
          await api.schedule.create(item);
        }
      }
      if (dailyGoals) {
        for (const goal of dailyGoals) {
          await api.dailyGoals.upsert(goal);
        }
      }

      alert('✅ Dados importados com sucesso! Recarregue a página.');
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Erro ao importar dados. Verifique o formato do arquivo.');
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage('');

    if (!newPassword || !confirmPassword) {
      setPasswordMessage('❌ Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('❌ As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('❌ A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMessage('✅ Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage(`❌ Erro: ${error.message}`);
    }
  };

  const handleEmailChange = async () => {
    setEmailMessage('');

    if (!newEmail) {
      setEmailMessage('❌ Digite o novo e-mail');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setEmailMessage('✅ E-mail de confirmação enviado! Verifique sua caixa de entrada.');
      setNewEmail('');
    } catch (error: any) {
      setEmailMessage(`❌ Erro: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase flex items-center gap-2">
            Configurações <Settings size={20} className="text-zinc-500" />
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Gerencie sua conta e dados.</p>
        </div>
      </header>

      {/* Profile Management */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2">👤 Minha Conta</h3>

        <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-300">E-mail atual: {currentUserEmail}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Password Change */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alterar Senha</p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Nova Senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
              />
              <input
                type="password"
                placeholder="Confirmar Nova Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
              />
              <button
                onClick={handlePasswordChange}
                className="w-full bg-zinc-900 dark:bg-zinc-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-600"
              >
                Alterar Senha
              </button>
              {passwordMessage && <p className="text-xs font-bold">{passwordMessage}</p>}
            </div>
          </div>

          {/* Email Change */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alterar E-mail</p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Novo E-mail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white"
              />
              <button
                onClick={handleEmailChange}
                className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700"
              >
                Alterar E-mail
              </button>
              {emailMessage && <p className="text-xs font-bold">{emailMessage}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Preferências de Estudo */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2">🎯 Preferências de Estudo</h3>
        <div className="space-y-4">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Meta Diária de Questões</p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              value={globalDailyGoal}
              onChange={(e) => setGlobalDailyGoal(parseInt(e.target.value) || 0)}
              className="w-32 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white font-bold text-lg"
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">questões por dia em todas as datas.</p>
          </div>
        </div>
      </div>

      {/* Backup & Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">📦 Backup de Dados</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">Exporte ou importe seus dados do Supabase.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-900 dark:hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
            >
              {isExporting ? '⏳ Exportando...' : '📤 Exportar JSON'}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isImporting}
              className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
            >
              {isImporting ? '⏳ Importando...' : '📥 Importar JSON'}
            </button>
            <input type="file" ref={fileRef} onChange={handleImport} className="hidden" accept=".json" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">☁️ Sincronização</h3>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex justify-between items-center border border-emerald-100 dark:border-emerald-800">
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Status</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">Conectado ao Supabase</p>
            </div>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-xs text-zinc-500">Seus dados estão sendo salvos automaticamente na nuvem.</p>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2 text-rose-600 dark:text-rose-400">🚨 Zona de Perigo</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ações irreversíveis.</p>
          <button
            onClick={async () => {
              if (confirm('⚠️ TEM CERTEZA? Isso apagará TODOS os seus dados (concursos, sessões, simulados) permanentemente.') &&
                confirm('⛔ Último aviso: Essa ação não pode ser desfeita. Confirmar reset total?')) {
                const success = await resetAllData();
                if (success) {
                  alert('✅ Todos os dados foram apagados. O sistema foi resetado.');
                  window.location.reload();
                } else {
                  alert('Erro ao resetar dados.');
                }
              }
            }}
            className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
          >
            🔥 FÁBRICA: Resetar Tudo
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
