import React, { useState } from 'react';
import { BookText, PenTool, LayoutTemplate } from 'lucide-react';

const DiarioApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all">
        <div className="p-6">
          <div className="flex items-center gap-3 text-amber-500 mb-8">
            <BookText size={28} className="drop-shadow-sm" />
            <span className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white">Diário</span>
          </div>

          <nav className="space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold ${activeTab === 'dashboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
              <BookText size={20} /> Minhas Notas
            </button>
            <button onClick={() => setActiveTab('nova')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold ${activeTab === 'nova' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
              <PenTool size={20} /> Nova Entrada
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6">
          <button onClick={() => window.location.hash = ''} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-bold text-sm uppercase tracking-wider">
            <LayoutTemplate size={18} /> Voltar ao Hub
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Diário Pessoal</h1>
            <p className="text-zinc-500 font-medium mt-1">Suas memórias e reflexões de vida.</p>
          </header>

          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800/50 p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <PenTool size={28} className="text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Como foi seu dia?</h3>
            <p className="text-zinc-500 max-w-sm mt-2">Comece a escrever e documentar seus pensamentos.</p>
            <button className="mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-transform active:scale-95 shadow-lg shadow-amber-500/20">
              Escrever Agora
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiarioApp;
