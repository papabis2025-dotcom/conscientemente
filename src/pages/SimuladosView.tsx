
import React, { useState } from 'react';
import { Subject, Simulado, SimuladoSubjectResult } from '../types';
import { GraduationCap, Trash2, Plus, CheckCircle } from 'lucide-react';

interface SimuladosViewProps {
  subjects: Subject[];
  simulados: Simulado[];
  onAddSimulado: (sim: Simulado) => void;
  onDeleteSimulado: (id: string) => void;
}

const SimuladosView: React.FC<SimuladosViewProps> = ({ subjects, simulados, onAddSimulado, onDeleteSimulado }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<SimuladoSubjectResult[]>([]);

  // Current subject being added to the list
  const [currentSubjectId, setCurrentSubjectId] = useState('');
  const [currentDone, setCurrentDone] = useState('');
  const [currentCorrect, setCurrentCorrect] = useState('');

  const addResultRow = () => {
    if (!currentSubjectId || !currentDone || !currentCorrect) return;
    const newRes: SimuladoSubjectResult = {
      subjectId: currentSubjectId,
      done: parseInt(currentDone),
      correct: parseInt(currentCorrect)
    };
    setResults([...results, newRes]);
    setCurrentSubjectId(''); setCurrentDone(''); setCurrentCorrect('');
  };

  const removeResultRow = (idx: number) => {
    setResults(results.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name || results.length === 0) {
      alert("Dê um nome ao simulado e adicione pelo menos um resultado de matéria.");
      return;
    }

    const totalQuestions = results.reduce((acc, r) => acc + r.done, 0);
    const newSim: Simulado = {
      id: crypto.randomUUID(),
      name,
      date,
      totalQuestions,
      results
    };

    onAddSimulado(newSim);
    setName(''); setResults([]); setIsAdding(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight uppercase flex items-center gap-2">
            Simulados Completos <GraduationCap size={20} className="text-emerald-500" />
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Avalie seu desempenho global em condições de prova.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          + Novo Simulado
        </button>
      </header>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-zinc-800 dark:text-white mb-6 uppercase tracking-tight">Registro de Simulado</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Nome do Simulado</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Simulado Ciclo 1" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 mb-8">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Detalhamento por Disciplina</h4>
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={currentSubjectId}
                onChange={(e) => setCurrentSubjectId(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
              >
                <option value="">Matéria...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" value={currentDone} onChange={(e) => setCurrentDone(e.target.value)} placeholder="Total" className="w-24 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white" />
              <input type="number" value={currentCorrect} onChange={(e) => setCurrentCorrect(e.target.value)} placeholder="Acertos" className="w-24 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white" />
              <button onClick={addResultRow} className="bg-zinc-900 dark:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase hover:bg-zinc-800 dark:hover:bg-zinc-600">Add</button>
            </div>

            <div className="space-y-2">
              {results.map((res, i) => {
                const sub = subjects.find(s => s.id === res.subjectId);
                const acc = Math.round((res.correct / res.done) * 100);
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${sub?.color || 'bg-zinc-500'}`} />
                      <div>
                        <p className="text-xs font-black dark:text-white leading-none">{sub?.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">{res.correct} acertos de {res.done} questões ({acc}%)</p>
                      </div>
                    </div>
                    <button onClick={() => removeResultRow(i)} className="text-rose-500 hover:text-rose-600">✕</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-zinc-400 font-bold uppercase text-xs">Cancelar</button>
            <button onClick={handleSave} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all">Salvar Simulado</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {simulados.map(sim => {
          const totalDone = sim.results.reduce((acc, r) => acc + r.done, 0);
          const totalCorrect = sim.results.reduce((acc, r) => acc + r.correct, 0);
          const accuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;

          return (
            <div key={sim.id} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-black text-zinc-800 dark:text-white leading-tight">{sim.name}</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{new Date(sim.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => confirm('Excluir simulado?') && onDeleteSimulado(sim.id)} className="text-zinc-200 group-hover:text-rose-500 transition-colors">🗑️</button>
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-emerald-500">{accuracy}%</p>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Aproveitamento Total</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{totalCorrect}/{totalDone}</p>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Acertos/Questões</p>
                </div>
              </div>

              <div className="space-y-1 mt-4 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {sim.results.map((res, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{subjects.find(s => s.id === res.subjectId)?.name}</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{Math.round((res.correct / res.done) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {simulados.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center opacity-30">
            <span className="text-5xl mb-4 block">📉</span>
            <p className="font-black uppercase tracking-widest text-xs">Ainda não há simulados registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimuladosView;
