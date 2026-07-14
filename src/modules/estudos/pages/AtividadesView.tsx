import React, { useState, useMemo } from 'react';
import { Subject, StudySession, ScheduledStudy } from '../types';
import { Calendar, Clock, FileText, CheckCircle2, Circle, Search, ArrowUpDown, Filter, History } from 'lucide-react';

interface AtividadesViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  scheduledStudies: ScheduledStudy[];
}

const AtividadesView: React.FC<AtividadesViewProps> = ({ subjects, sessions, scheduledStudies }) => {
  const [activeSubTab, setActiveSubTab] = useState<'realizados' | 'planejados'>('realizados');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Stats
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationInMinutes, 0);
    const totalQuestions = sessions.reduce((acc, s) => acc + (s.questionsDone || 0), 0);
    const totalCorrect = sessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return {
      totalSessions,
      hours: (totalMinutes / 60).toFixed(1),
      totalQuestions,
      accuracy
    };
  }, [sessions]);

  // Filtered Study Sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        const matchesSubject = selectedSubjectId === 'all' || s.subjectId === selectedSubjectId;
        const sub = subjects.find(subObj => subObj.id === s.subjectId);
        const topic = sub?.topics?.find(t => t.id === s.topicId);
        const text = `${sub?.name || ''} ${topic?.title || ''} ${s.activityType || ''} ${s.notes || ''}`.toLowerCase();
        const matchesSearch = text.includes(searchTerm.toLowerCase());
        return matchesSubject && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [sessions, selectedSubjectId, searchTerm, sortOrder, subjects]);

  // Filtered Scheduled Studies (Agenda)
  const filteredPlanner = useMemo(() => {
    return scheduledStudies
      .filter(s => {
        const matchesSubject = selectedSubjectId === 'all' || s.subjectId === selectedSubjectId;
        const sub = subjects.find(subObj => subObj.id === s.subjectId);
        const topic = sub?.topics?.find(t => t.id === s.topicId);
        const text = `${sub?.name || ''} ${topic?.title || ''} ${s.activityType || ''} ${s.notes || ''}`.toLowerCase();
        const matchesSearch = text.includes(searchTerm.toLowerCase());
        return matchesSubject && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [scheduledStudies, selectedSubjectId, searchTerm, sortOrder, subjects]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-800 dark:text-white">Registro de Atividades</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
            Histórico completo de registros de estudo e logs da agenda.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-initial min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Buscar atividade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold text-zinc-700 dark:text-white outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-700 shadow-sm"
            />
          </div>

          {/* Subject Filter */}
          <div className="relative">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="pl-8 pr-8 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold text-zinc-700 dark:text-white outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-700 shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">Todas as Matérias</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={12} />
          </div>

          {/* Sort Order */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all shadow-sm"
            title={sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
          >
            <ArrowUpDown size={14} />
          </button>
        </div>
      </header>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-150 dark:border-zinc-800/80 shadow-sm">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Sessões Concluídas</span>
          <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.totalSessions}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-150 dark:border-zinc-800/80 shadow-sm">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Tempo Total</span>
          <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.hours}h</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-150 dark:border-zinc-800/80 shadow-sm">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Questões Feitas</span>
          <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.totalQuestions}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-150 dark:border-zinc-800/80 shadow-sm">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Aproveitamento</span>
          <span className="text-2xl font-black text-emerald-500 mt-1 block">{stats.accuracy}%</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-2xl shadow-sm flex w-max">
        <button
          onClick={() => setActiveSubTab('realizados')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeSubTab === 'realizados'
              ? 'bg-zinc-950 dark:bg-zinc-700 text-white shadow-md'
              : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          Histórico de Estudos
        </button>
        <button
          onClick={() => setActiveSubTab('planejados')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeSubTab === 'planejados'
              ? 'bg-zinc-950 dark:bg-zinc-700 text-white shadow-md'
              : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          Planejamento / Agenda
        </button>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        {activeSubTab === 'realizados' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-850">
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Data</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Matéria / Assunto</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Tipo</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Tempo</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Questões</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {filteredSessions.map((s) => {
                  const sub = subjects.find(subObj => subObj.id === s.subjectId);
                  const topic = sub?.topics?.find(t => t.id === s.topicId);
                  const formattedDate = new Date(s.date).toLocaleDateString('pt-BR');

                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-6 text-xs font-bold text-zinc-500 whitespace-nowrap">{formattedDate}</td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-black text-zinc-800 dark:text-white block">{sub?.name || 'Matéria excluída'}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 font-medium italic">{topic?.title || 'Geral / Outros'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black text-zinc-650 dark:text-zinc-350 uppercase tracking-wider">
                          {s.activityType || 'Estudo'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-black text-zinc-700 dark:text-zinc-300 text-center whitespace-nowrap">
                        {s.durationInMinutes} min
                      </td>
                      <td className="py-4 px-6 text-xs text-center whitespace-nowrap">
                        {s.questionsDone !== undefined && s.questionsDone > 0 ? (
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {s.questionsCorrect}/{s.questionsDone} acertos
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-500 dark:text-zinc-450 max-w-xs truncate" title={s.notes}>
                        {s.notes || <span className="italic text-zinc-300 dark:text-zinc-600 font-medium">Sem notas</span>}
                      </td>
                    </tr>
                  );
                })}

                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-zinc-400 italic text-sm">
                      Nenhum registro de estudo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-850">
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Data</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Matéria / Assunto</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Tipo</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Previsto</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {filteredPlanner.map((s) => {
                  const sub = subjects.find(subObj => subObj.id === s.subjectId);
                  const topic = sub?.topics?.find(t => t.id === s.topicId);
                  const formattedDate = new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR');
                  const isDone = s.status === 'realizado';

                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isDone 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {isDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                          {isDone ? 'Realizado' : 'Planejado'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-zinc-500 whitespace-nowrap">{formattedDate}</td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-black text-zinc-800 dark:text-white block">{sub?.name || 'Matéria excluída'}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 font-medium italic">{topic?.title || 'Geral / Outros'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black text-zinc-650 dark:text-zinc-350 uppercase tracking-wider">
                          {s.activityType}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-black text-zinc-700 dark:text-zinc-300 text-center whitespace-nowrap">
                        {s.durationInMinutes ? `${s.durationInMinutes} min` : '—'}
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-500 dark:text-zinc-450 max-w-xs truncate" title={s.notes}>
                        {s.notes || <span className="italic text-zinc-300 dark:text-zinc-600 font-medium">Sem notas</span>}
                      </td>
                    </tr>
                  );
                })}

                {filteredPlanner.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-zinc-400 italic text-sm">
                      Nenhuma tarefa encontrada no planejador.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AtividadesView;
