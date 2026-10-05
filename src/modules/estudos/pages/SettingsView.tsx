
import React, { useRef, useState } from 'react';
import { Settings, Target, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import { backupService } from '../../../services/backupService';

interface SettingsViewProps {
  currentUserEmail: string;
  globalDailyGoal?: number;
  setGlobalDailyGoal?: (val: number) => void;
  resetAllData?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  currentUserEmail,
  globalDailyGoal = 0,
  setGlobalDailyGoal = () => {},
  resetAllData = () => {}
}) => {
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
      await backupService.exportBackup();
      alert('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Erro ao exportar dados. Verifique o console.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importar backup completo? Isso sincronizará seus dados de todos os módulos e configurações.')) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const result = await backupService.importBackup(file);
      alert(`Dados importados com sucesso (${result.itemCount} registros sincronizados)! A página será recarregada.`);
      window.location.reload();
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Erro ao importar dados: ' + (error?.message || 'Arquivo inválido.'));
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage('');

    if (!newPassword || !confirmPassword) {
      setPasswordMessage('Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMessage('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage(`Erro: ${error.message}`);
    }
  };

  const handleEmailChange = async () => {
    setEmailMessage('');

    if (!newEmail) {
      setEmailMessage('Digite o novo e-mail');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setEmailMessage('E-mail de confirmação enviado! Verifique sua caixa de entrada.');
      setNewEmail('');
    } catch (error: any) {
      setEmailMessage(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">




      {/* Preferências de Estudo */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2"><Target size={20} className="text-zinc-500" /> Preferências de Estudo</h3>
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

      {/* Configuração da IA no servidor */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Sparkles size={20} className="text-zinc-500 animate-pulse" /> Inteligência Artificial (Gemini)
        </h3>
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Os recursos inteligentes, como a importação automática de simulados por imagem,
            usam uma conexão protegida no servidor e a sua sessão autenticada.
          </p>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Credencial protegida
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Nenhuma chave é armazenada neste navegador. A configuração é feita pelo administrador
                nos segredos da função do Supabase. Se a IA estiver indisponível, entre em contato com
                o responsável pela instalação.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Opções de Conta */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-rose-500 flex items-center gap-2">Sair da Conta</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Desconectar-se deste dispositivo.</p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-rose-500/10"
        >
          Desconectar
        </button>
      </div>

    </div>
  );
};

export default SettingsView;
