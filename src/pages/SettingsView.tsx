
import React, { useRef, useState } from 'react';
import { User } from '../types';

interface SettingsViewProps {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearData: () => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  currentUser: User;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onExport, onImport, onClearData, users, onUpdateUsers, currentUser }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');

  const stats = {
    localStorageUsage: (JSON.stringify(localStorage).length / 1024).toFixed(2), // KB
  };

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserPass.trim()) return;
    const newUser: User = { id: Date.now().toString(), name: newUserName, password: newUserPass, avatar: ['🎓', '🧠', '💼', '📊', '☕'][users.length % 5] };
    onUpdateUsers([...users, newUser]);
    setNewUserName('');
    setNewUserPass('');
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert("Você não pode excluir o perfil que está usando agora.");
      return;
    }
    if (confirm("Deseja apagar este perfil? Os dados associados a ele no navegador também serão perdidos.")) {
      onUpdateUsers(users.filter(u => u.id !== id));
      // Optionally clean up local storage for that user
      localStorage.removeItem(`cp_concursos_${id}`);
      localStorage.removeItem(`cp_sessions_${id}`);
      localStorage.removeItem(`cp_schedule_${id}`);
      localStorage.removeItem(`cp_daily_goals_${id}`);
      localStorage.removeItem(`cp_logs_${id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Gerenciamento Pro ⚙️</h2>
        <p className="text-slate-500 dark:text-slate-400">Controle de usuários, segurança e dados.</p>
      </div>

      {/* User Manager */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2">👥 Perfis de Usuários</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criar Novo Perfil</p>
            <div className="space-y-3">
              <input type="text" placeholder="Nome do Estudante" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
              <input type="password" placeholder="Senha (PIN)" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
              <button onClick={handleAddUser} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700">Adicionar Perfil</button>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfis Existentes</p>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{u.avatar}</span>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white">{u.name} {u.id === currentUser.id && '(Você)'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">PIN: ****</p>
                  </div>
                </div>
                {u.id !== currentUser.id && (
                  <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">📦 Backup & Segurança</h3>
          <p className="text-sm text-slate-500 leading-relaxed">Exporte seus dados locais para segurança extra.</p>
          <div className="flex flex-col gap-3">
            <button onClick={onExport} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">📤 Exportar JSON</button>
            <button onClick={() => fileRef.current?.click()} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all">📥 Importar JSON</button>
            <input type="file" ref={fileRef} onChange={onImport} className="hidden" accept=".json" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">🛠️ Status do Banco</h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Ocupação Local (Navegador)</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{stats.localStorageUsage} KB</p>
            </div>
            <span className="text-2xl">💾</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
