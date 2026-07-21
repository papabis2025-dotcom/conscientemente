import React, { useState, useMemo } from 'react';
import { Subject, Simulado, SimuladoSubjectResult, StudySession } from '../types';
import { Edit2, Trash2, Clock, TrendingDown, Trophy, Award, Activity, HelpCircle } from 'lucide-react';

interface SimuladosViewProps {
  subjects: Subject[];
  simulados: Simulado[];
  sessions?: StudySession[];
  onAddSimulado: (sim: Simulado) => void;
  onDeleteSimulado: (id: string) => void;
  onUpdateSimulado: (id: string, sim: Simulado) => void;
}

const SimuladosView: React.FC<SimuladosViewProps> = ({ subjects, simulados, sessions, onAddSimulado, onDeleteSimulado, onUpdateSimulado }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [results, setResults] = useState<SimuladoSubjectResult[]>([]);

  // Calculate general stats for simulados
  const stats = useMemo(() => {
    if (!simulados || simulados.length === 0) return null;
    
    let totalQuestionsDone = 0;
    let totalQuestionsCorrect = 0;
    let totalTime = 0;
    let bestAccuracy = -1;
    let bestName = '';

    simulados.forEach(sim => {
      const done = (sim.results || []).reduce((acc, r) => acc + (r.done || 0), 0);
      const correct = (sim.results || []).reduce((acc, r) => acc + (r.correct || 0), 0);
      const acc = done > 0 ? (correct / done) * 100 : 0;
      totalQuestionsDone += done;
      totalQuestionsCorrect += correct;
      totalTime += sim.durationInMinutes || 0;
      if (acc > bestAccuracy) {
        bestAccuracy = acc;
        bestName = sim.name;
      }
    });

    const averageAccuracy = totalQuestionsDone > 0 ? Math.round((totalQuestionsCorrect / totalQuestionsDone) * 100) : 0;

    return {
      totalSimulados: simulados.length,
      averageAccuracy,
      totalQuestionsDone,
      totalQuestionsCorrect,
      totalTime,
      bestName,
      bestAccuracy: Math.round(bestAccuracy)
    };
  }, [simulados]);

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

  const handlePrepopulateWithMySubjects = () => {
    if (subjects.length === 0) {
      alert("Nenhuma disciplina cadastrada na guia de disciplinas.");
      return;
    }
    const newResults: SimuladoSubjectResult[] = subjects.map(s => ({
      subjectId: s.id,
      done: 0,
      correct: 0
    }));
    setResults(newResults);
  };

  const handlePrepopulateWithWeeklySubjects = () => {
    if (subjects.length === 0) {
      alert("Nenhuma disciplina cadastrada na guia de disciplinas.");
      return;
    }
    if (!sessions || sessions.length === 0) {
      alert("Nenhuma atividade de estudo registrada no histórico.");
      return;
    }

    // Filter sessions in the last 7 days (or current week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const studiedSubjectIds = new Set(
      sessions
        .filter(s => new Date(s.date) >= sevenDaysAgo)
        .map(s => s.subjectId)
    );

    if (studiedSubjectIds.size === 0) {
      alert("Nenhum assunto estudado nos últimos 7 dias.");
      return;
    }

    const newResults: SimuladoSubjectResult[] = subjects
      .filter(s => studiedSubjectIds.has(s.id))
      .map(s => ({
        subjectId: s.id,
        done: 0,
        correct: 0
      }));

    setResults(newResults);
  };

  const handleSave = () => {
    if (!name || results.length === 0) {
      alert("Dê um nome ao simulado e adicione pelo menos um resultado de matéria.");
      return;
    }

    const sanitizedResults = results.map(r => ({
      ...r,
      correct: Math.min(r.correct, r.done)
    }));

    const totalQuestions = sanitizedResults.reduce((acc, r) => acc + r.done, 0);
    const durationVal = parseInt(duration) || 0;

    if (editingId) {
      const updatedSim: Simulado = {
        id: editingId,
        name,
        date,
        totalQuestions,
        results: sanitizedResults,
        durationInMinutes: durationVal
      };
      onUpdateSimulado(editingId, updatedSim);
    } else {
      const newSim: Simulado = {
        id: crypto.randomUUID(),
        name,
        date,
        totalQuestions,
        results: sanitizedResults,
        durationInMinutes: durationVal
      };
      onAddSimulado(newSim);
    }

    handleCancel();
  };

  const handleEditClick = (sim: Simulado) => {
    setEditingId(sim.id);
    setName(sim.name);
    setDate(sim.date);
    setResults(sim.results || []);
    setDuration(sim.durationInMinutes?.toString() || '');
    setIsAdding(true);
  };

  const handleCancel = () => {
    setName('');
    setResults([]);
    setDuration('');
    setEditingId(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { handleCancel(); setIsAdding(true); }}
            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            + Novo Simulado
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-zinc-800 dark:text-white mb-6 uppercase tracking-tight">
            {editingId ? 'Editar Simulado' : 'Registro de Simulado'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Nome do Simulado</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Simulado Ciclo 1" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Tempo de Realização (minutos)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 180" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-800 dark:text-white" />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 mb-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Detalhamento por Disciplina</h4>
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button"
                  onClick={handlePrepopulateWithMySubjects}
                  className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 hover:bg-indigo-600 hover:text-white transition-all rounded-xl shadow-sm"
                >
                  Preencher com todas as matérias
                </button>
                <button 
                  type="button"
                  onClick={handlePrepopulateWithWeeklySubjects}
                  className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 hover:bg-emerald-600 hover:text-white transition-all rounded-xl shadow-sm"
                >
                  Preencher com as estudadas na semana
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={currentSubjectId}
                onChange={(e) => setCurrentSubjectId(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm text-zinc-800 dark:text-white"
              >
                <option value="">Matéria...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" value={currentDone} onChange={(e) => setCurrentDone(e.target.value)} placeholder="Total" className="w-24 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm text-zinc-800 dark:text-white" />
              <input type="number" value={currentCorrect} onChange={(e) => setCurrentCorrect(e.target.value)} placeholder="Acertos" className="w-24 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm text-zinc-800 dark:text-white" />
              <button type="button" onClick={addResultRow} className="bg-zinc-900 dark:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase hover:bg-zinc-800 dark:hover:bg-zinc-600">Add</button>
            </div>

            <div className="space-y-2">
              {results.map((res, i) => {
                const sub = subjects.find(s => s.id === res.subjectId);
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-8 rounded-full shrink-0 ${sub?.color || 'bg-zinc-500'}`} />
                      <span className="text-xs font-black dark:text-white truncate">{sub?.name || 'Matéria desconhecida'}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-450 uppercase font-mono">Questões</span>
                        <input
                          type="number"
                          value={res.done === 0 ? '' : res.done}
                          onChange={(e) => {
                            const newResults = [...results];
                            newResults[i].done = parseInt(e.target.value) || 0;
                            setResults(newResults);
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-xs text-center text-zinc-800 dark:text-white font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-450 uppercase font-mono">Acertos</span>
                        <input
                          type="number"
                          value={res.correct === 0 ? '' : res.correct}
                          onChange={(e) => {
                            const newResults = [...results];
                            newResults[i].correct = parseInt(e.target.value) || 0;
                            setResults(newResults);
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-xs text-center text-zinc-800 dark:text-white font-mono"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeResultRow(i)} 
                        className="text-rose-500 hover:text-rose-600 p-1 font-bold text-xs"
                        title="Remover matéria"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleCancel} className="px-6 py-3 text-zinc-400 font-bold uppercase text-xs">Cancelar</button>
            <button type="button" onClick={handleSave} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all">
              {editingId ? 'Salvar Alterações' : 'Salvar Simulado'}
            </button>
          </div>
        </div>
      )}

      {stats && !isAdding && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-550 dark:text-zinc-400">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Total Realizados</p>
              <p className="text-xl font-black text-zinc-800 dark:text-white mt-1">{stats.totalSimulados}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Média Aproveitamento</p>
              <p className="text-xl font-black text-emerald-500 mt-1">{stats.averageAccuracy}%</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500">
              <HelpCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Questões Respondidas</p>
              <p className="text-xl font-black text-zinc-800 dark:text-white mt-1">{stats.totalQuestionsCorrect}/{stats.totalQuestionsDone}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-purple-500">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Tempo Dedicado</p>
              <p className="text-xl font-black text-zinc-800 dark:text-white mt-1">
                {stats.totalTime >= 60 
                  ? `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m` 
                  : `${stats.totalTime}m`}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
              <Trophy size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Melhor Simulado</p>
              <p className="text-sm font-black text-zinc-800 dark:text-white mt-1 truncate" title={`${stats.bestName} (${stats.bestAccuracy}%)`}>
                {stats.bestName ? `${stats.bestName} (${stats.bestAccuracy}%)` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(simulados || []).map(sim => {
          const totalDone = (sim.results || []).reduce((acc, r) => acc + (r.done || 0), 0);
          const totalCorrect = (sim.results || []).reduce((acc, r) => acc + (r.correct || 0), 0);
          const accuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;

          return (
            <div key={sim.id} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-black text-zinc-800 dark:text-white leading-tight">{sim.name}</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{new Date(sim.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleEditClick(sim)} className="text-zinc-450 hover:text-blue-500 transition-colors p-1" title="Editar Simulado">
                    <Edit2 size={14} />
                  </button>
                  <button type="button" onClick={() => confirm('Excluir simulado?') && onDeleteSimulado(sim.id)} className="text-zinc-350 hover:text-rose-500 transition-colors p-1" title="Excluir Simulado">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-emerald-500">{accuracy}%</p>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Aproveitamento Total</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{totalCorrect}/{totalDone}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1 flex items-center justify-end gap-1 font-mono">
                    <Clock size={10} /> {sim.durationInMinutes ? `${sim.durationInMinutes} min` : '—'}
                  </p>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Acertos/Questões</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-b border-zinc-100 dark:border-zinc-800 py-3 my-4 text-center">
                <div>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Acertos</p>
                  <p className="text-sm font-black text-emerald-500">{totalCorrect}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Erros</p>
                  <p className="text-sm font-black text-rose-500">{totalDone - totalCorrect}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Tempo/Q</p>
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                    {sim.durationInMinutes && totalDone > 0 
                      ? `${Math.round((sim.durationInMinutes * 60) / totalDone)}s` 
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 mt-4 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {(sim.results || []).map((res, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{subjects.find(s => s.id === res.subjectId)?.name}</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      {res.correct}/{res.done} ({res.done > 0 ? Math.round((res.correct / res.done) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {(simulados || []).length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center justify-center gap-3">
            <TrendingDown size={36} className="text-zinc-400" />
            <p className="font-black uppercase tracking-widest text-xs">Ainda não há simulados registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimuladosView;
