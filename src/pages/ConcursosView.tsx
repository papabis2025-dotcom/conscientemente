
import React, { useState } from 'react';
import { Concurso } from '../types';

interface ConcursosViewProps {
  concursos: Concurso[];
  onUpdateConcursos: (concursos: Concurso[]) => void;
  onSelectConcurso: (concurso: Concurso) => void;
}

const ConcursosView: React.FC<ConcursosViewProps> = ({ concursos, onUpdateConcursos, onSelectConcurso }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newConcName, setNewConcName] = useState('');
  const [banca, setBanca] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Concurso>>({});

  const addConcurso = () => {
    if (!newConcName.trim() || !banca.trim()) {
      alert("Preencha o nome e a banca do concurso.");
      return;
    }
    const newConc: Concurso = {
      id: crypto.randomUUID(),
      name: newConcName,
      banca: banca,
      startDate: new Date(startDate).toISOString(),
      subjects: [],
      targetDate: targetDate || undefined
    };
    onUpdateConcursos([...concursos, newConc]);
    setNewConcName(''); setBanca(''); setStartDate(new Date().toISOString().split('T')[0]); setTargetDate(''); setIsAdding(false);
  };

  const startEditing = (conc: Concurso) => {
    setEditingId(conc.id);
    setEditFormData({
      name: conc.name,
      banca: conc.banca,
      startDate: conc.startDate.split('T')[0], // Extract YYYY-MM-DD
      targetDate: conc.targetDate ? conc.targetDate.split('T')[0] : ''
    });
  };

  const saveEdit = () => {
    if (!editingId) return;

    onUpdateConcursos(concursos.map(c => {
      if (c.id === editingId) {
        return {
          ...c,
          name: editFormData.name || c.name,
          banca: editFormData.banca || c.banca,
          startDate: editFormData.startDate ? new Date(editFormData.startDate).toISOString() : c.startDate,
          targetDate: editFormData.targetDate ? new Date(editFormData.targetDate).toISOString() : undefined
        };
      }
      return c;
    }));
    setEditingId(null);
    setEditFormData({});
  };

  const calculateDaysSince = (dateStr: string) => {
    const start = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Meus Editais 🏆</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie suas metas e prazos estratégicos.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          + Novo Concurso
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-blue-500 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tight">Novo Projeto de Aprovação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nome do Concurso</label>
              <input type="text" placeholder="Ex: Receita Federal" value={newConcName} onChange={(e) => setNewConcName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Banca Organizadora</label>
              <input type="text" placeholder="Ex: FGV, CESPE..." value={banca} onChange={(e) => setBanca(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data de Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data da Prova (Alvo)</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-rose-500 transition-colors">Cancelar</button>
            <button onClick={addConcurso} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Criar Edital</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {concursos.map(conc => {
          const completedCount = conc.subjects.reduce((acc, s) => acc + s.topics.filter(t => t.isCompleted).length, 0);
          const totalCount = conc.subjects.reduce((acc, s) => acc + s.topics.length, 0);
          const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const daysActive = calculateDaysSince(conc.startDate);

          const isEditing = editingId === conc.id;

          return (
            <div key={conc.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-16 -mt-16 rounded-full group-hover:bg-blue-500/10 transition-colors"></div>

              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 mr-4">
                  {isEditing ? (
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full p-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700" placeholder="Nome" />
                      <input type="text" value={editFormData.banca} onChange={(e) => setEditFormData({ ...editFormData, banca: e.target.value })} className="w-full p-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700" placeholder="Banca" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={editFormData.startDate} onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} className="w-full p-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700" />
                        <input type="date" value={editFormData.targetDate} onChange={(e) => setEditFormData({ ...editFormData, targetDate: e.target.value })} className="w-full p-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
                        <button onClick={saveEdit} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg font-bold">Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-3">
                        <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-blue-600 text-white tracking-widest">
                          Banca: {conc.banca}
                        </span>
                        <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 tracking-widest">
                          Em estudo: {daysActive} dias
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{conc.name}</h3>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => startEditing(conc)}
                    className="text-slate-300 hover:text-blue-500 transition-colors p-2"
                    title="Editar Concurso"
                  >✎</button>
                  <button
                    onClick={() => confirm("Excluir este concurso?") && onUpdateConcursos(concursos.filter(c => c.id !== conc.id))}
                    className="text-slate-200 hover:text-rose-500 transition-colors p-2"
                    title="Excluir Concurso"
                  >🗑️</button>
                </div>
              </div>

              {!isEditing && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                      <span>Progresso do Edital</span>
                      <span className="text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Disciplinas</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">{conc.subjects.length}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Início em</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white">
                        {new Date(conc.startDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectConcurso(conc)}
                    className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all border border-blue-100 dark:border-blue-900/30 active:scale-95"
                  >
                    Focar neste concurso →
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {concursos.length === 0 && !isAdding && (
          <div className="col-span-full py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-6xl mb-6 block">📝</span>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Nenhum edital cadastrado</h3>
            <p className="text-slate-400 text-sm mt-2 mb-8">Comece adicionando o edital que você está estudando.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700"
            >
              + Adicionar Meu Primeiro Edital
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConcursosView;
