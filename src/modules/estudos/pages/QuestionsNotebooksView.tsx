import React, { useState, useMemo } from 'react';
import { Subject, StudySession, ScheduledStudy, Concurso, Topic, ActivityType } from '../types';
import { api } from '../services/api';
import { 
  Link2, 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  Search, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Activity, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface QuestionsNotebooksViewProps {
  sessions: StudySession[];
  scheduledStudies: ScheduledStudy[];
  concursos: Concurso[];
  allSubjects: Subject[];
  onUpdateScheduledStudy: (id: string, updates: Partial<ScheduledStudy>) => Promise<void>;
  onSaveActivity: (editingTaskId: string | null, formData: any, selectedDayKey: string) => Promise<void>;
  setSessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  onSyncReviews: () => Promise<void>;
}

const parseNotesGroup = (notes: string) => {
  let currentNotes = notes || '';
  let groupId = null;
  let tag = null;

  const groupMatch = currentNotes.match(/^\[groupId:([^\]]+)\](.*)/s);
  if (groupMatch) {
    groupId = groupMatch[1];
    currentNotes = groupMatch[2].trim();
  }

  const tagMatch = currentNotes.match(/^(#[A-Za-z0-9_]+)(?:\s*-\s*|\s+)(.*)/s) || currentNotes.match(/^(#[A-Za-z0-9_]+)$/s);
  if (tagMatch) {
    tag = tagMatch[1];
    currentNotes = tagMatch[2] ? tagMatch[2].trim() : '';
  }

  return { groupId, tag, cleanNotes: currentNotes };
};

const getLocalDateString = (isoString: string) => {
  if (!isoString) return '';
  return isoString.split('T')[0];
};

export const QuestionsNotebooksView: React.FC<QuestionsNotebooksViewProps> = ({
  sessions,
  scheduledStudies,
  concursos,
  allSubjects,
  onUpdateScheduledStudy,
  setSessions,
  onSyncReviews
}) => {
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estados locais para edição dos links de estudos (sessões) em tempo de execução
  const [editingSessionLinks, setEditingSessionLinks] = useState<Record<string, string[]>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

  // Estados locais para edição dos links de revisões em tempo de execução
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingReviewLinks, setEditingReviewLinks] = useState<string[]>([]);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);

  // Filtro de Concursos
  const filteredConcursos = concursos;

  // Filtro de Disciplinas associadas ao Concurso selecionado
  const activeSubjects = useMemo(() => {
    if (selectedConcursoId === 'all') {
      return allSubjects;
    }
    const conc = concursos.find(c => c.id === selectedConcursoId);
    return conc ? conc.subjects || [] : [];
  }, [selectedConcursoId, allSubjects, concursos]);

  // Lista de sessões de estudo realizadas (estudos de origem)
  const originSessions = useMemo(() => {
    // Filtramos sessões que não são simulados ou revisões para representar os estudos de origem
    return sessions.filter(s => {
      const isSim = s.isSimulado || s.activityType === 'Simulado';
      const isRev = s.activityType && (
        s.activityType.toLowerCase().includes('revisão') || 
        s.activityType.toLowerCase().includes('revisao')
      );
      return !isSim && !isRev;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions]);

  // Mapeamento e filtragem das sessões de estudo realizadas
  const filteredSessions = useMemo(() => {
    return originSessions.filter(s => {
      // Filtro por Concurso
      if (selectedConcursoId !== 'all') {
        const hasSub = activeSubjects.some(sub => sub.id === s.subjectId);
        if (!hasSub) return false;
      }

      // Filtro por Disciplina
      if (selectedSubjectId !== 'all' && s.subjectId !== selectedSubjectId) {
        return false;
      }

      // Filtro por busca de texto (tag, tópico, anotações)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const parsed = parseNotesGroup(s.notes || '');
        const subject = allSubjects.find(sub => sub.id === s.subjectId);
        const topic = subject?.topics?.find(t => t.id === s.topicId);

        const matchTag = parsed.tag && parsed.tag.toLowerCase().includes(query);
        const matchTopic = (topic?.title || 'geral').toLowerCase().includes(query);
        const matchSubject = (subject?.name || '').toLowerCase().includes(query);
        const matchNotes = parsed.cleanNotes.toLowerCase().includes(query);

        if (!matchTag && !matchTopic && !matchSubject && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [originSessions, selectedConcursoId, selectedSubjectId, searchQuery, activeSubjects, allSubjects]);

  // Agrupamento por data das sessões filtradas
  const groupedSessions = useMemo(() => {
    const groups: Record<string, StudySession[]> = {};
    filteredSessions.forEach(s => {
      const dateStr = getLocalDateString(s.date);
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(s);
    });
    return groups;
  }, [filteredSessions]);

  // Inicializa ou obtém a lista de links em edição para uma sessão
  const getSessionLinks = (session: StudySession) => {
    if (editingSessionLinks[session.id] !== undefined) {
      return editingSessionLinks[session.id];
    }
    if (session.questionsLink) {
      try {
        const parsed = JSON.parse(session.questionsLink);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
      return [session.questionsLink];
    }
    return [];
  };

  const handleAddSessionLinkField = (sessionId: string, currentLinks: string[]) => {
    setEditingSessionLinks(prev => ({
      ...prev,
      [sessionId]: [...currentLinks, '']
    }));
  };

  const handleUpdateSessionLinkValue = (sessionId: string, index: number, value: string, currentLinks: string[]) => {
    const next = [...currentLinks];
    next[index] = value;
    setEditingSessionLinks(prev => ({
      ...prev,
      [sessionId]: next
    }));
  };

  const handleRemoveSessionLinkField = (sessionId: string, index: number, currentLinks: string[]) => {
    const next = currentLinks.filter((_, i) => i !== index);
    setEditingSessionLinks(prev => ({
      ...prev,
      [sessionId]: next
    }));
  };

  // Salvar links de um estudo de origem
  const handleSaveSessionLinks = async (session: StudySession, links: string[]) => {
    setSavingSessionId(session.id);
    const filtered = links.filter(Boolean);
    const payload = filtered.length > 0 ? JSON.stringify(filtered) : null;

    try {
      // 1. Atualizar no banco Supabase
      await api.sessions.update(session.id, { questionsLink: payload });

      // 2. Atualizar no estado local do React
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, questionsLink: payload } : s));

      // 3. Forçar sincronização automática para propagar para as revisões subsequentes associadas
      await onSyncReviews();

      // Limpar estado de edição para este card
      setEditingSessionLinks(prev => {
        const copy = { ...prev };
        delete copy[session.id];
        return copy;
      });
    } catch (e) {
      console.error('Error saving session links:', e);
      alert('Erro ao salvar os links. Tente novamente.');
    } finally {
      setSavingSessionId(null);
    }
  };

  // Encontra as revisões planejadas subsequentes associadas à sessão de origem
  const getSubsequentReviews = (session: StudySession) => {
    const sessionDateStr = getLocalDateString(session.date);
    return scheduledStudies.filter(s => {
      const isRev = s.activityType === 'Revisão' || s.activityType === 'Aulão de Revisão';
      const isPlanejado = s.status === 'planejado';
      const sameSubject = s.subjectId === session.subjectId;
      const belongsToOrigin = s.notes && s.notes.includes(`_from_${sessionDateStr}`);
      return isRev && isPlanejado && sameSubject && belongsToOrigin;
    });
  };

  // Abre gerenciador de links para uma revisão subsequente
  const handleOpenReviewLinkEditor = (review: ScheduledStudy) => {
    let links: string[] = [];
    if (review.questionsLink) {
      try {
        const parsed = JSON.parse(review.questionsLink);
        if (Array.isArray(parsed)) {
          links = parsed;
        } else {
          links = [review.questionsLink];
        }
      } catch (e) {
        links = [review.questionsLink];
      }
    }
    setEditingReviewLinks(links.length > 0 ? links : ['']);
    setEditingReviewId(review.id);
  };

  // Salvar links de uma revisão subsequente de forma customizada e isolada
  const handleSaveReviewLinks = async () => {
    if (!editingReviewId) return;
    setSavingReviewId(editingReviewId);
    const filtered = editingReviewLinks.filter(Boolean);
    const payload = filtered.length > 0 ? JSON.stringify(filtered) : null;

    try {
      await onUpdateScheduledStudy(editingReviewId, { questionsLink: payload });
      setEditingReviewId(null);
      setEditingReviewLinks([]);
    } catch (e) {
      console.error('Error saving review links:', e);
      alert('Erro ao salvar os links da revisão.');
    } finally {
      setSavingReviewId(null);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-screen custom-scrollbar bg-zinc-50 dark:bg-zinc-950">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-650 bg-clip-text text-transparent">
            Cadernos de Questões
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
            Gerencie os links de cadernos de questões de seus estudos e propague-os de forma centralizada para as revisões subsequentes.
          </p>
        </div>
      </div>

      {/* Painel de Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        
        {/* Filtro de Concurso */}
        <div>
          <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Concurso</label>
          <select 
            value={selectedConcursoId} 
            onChange={(e) => {
              setSelectedConcursoId(e.target.value);
              setSelectedSubjectId('all'); // Reset disciplina
            }}
            className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
          >
            <option value="all">Todos os Cursos</option>
            {filteredConcursos.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Filtro de Disciplina */}
        <div>
          <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Disciplina</label>
          <select 
            value={selectedSubjectId} 
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
          >
            <option value="all">Todas as Disciplinas</option>
            {activeSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Campo de Busca por texto */}
        <div>
          <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Buscar por Código ou Tópico</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Ex: #OAB47DPC ou Inquérito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
            />
          </div>
        </div>

      </div>

      {/* Listagem de Cadernos por Estudos de Origem */}
      <div className="space-y-8">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/40 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center animate-in fade-in">
            <AlertCircle className="text-zinc-400 dark:text-zinc-650 mb-3" size={32} />
            <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Nenhum estudo encontrado</h3>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 max-w-sm mt-1">
              Realize novos estudos no Planner ou revise seus filtros de busca para visualizar e gerenciar cadernos.
            </p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([dateStr, sessionGroup]) => {
            const formattedDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div key={dateStr} className="space-y-4">
                {/* Divisor de Data */}
                <div className="flex items-center gap-2 px-1">
                  <Calendar size={14} className="text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Estudos realizados em {formattedDate}
                  </h3>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800 ml-2" />
                </div>

                {/* Grid de Cards da Data */}
                <div className="grid grid-cols-1 gap-6">
                  {sessionGroup.map(session => {
                    const subject = allSubjects.find(sub => sub.id === session.subjectId);
                    const topic = subject?.topics?.find(t => t.id === session.topicId);
                    const parsed = parseNotesGroup(session.notes || '');
                    
                    const links = getSessionLinks(session);
                    const isEditing = editingSessionLinks[session.id] !== undefined;
                    const linksToDisplay = isEditing ? editingSessionLinks[session.id] : links;

                    const subsequentReviews = getSubsequentReviews(session);

                    return (
                      <div 
                        key={session.id} 
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col lg:flex-row gap-6 relative overflow-hidden"
                      >
                        {/* Indicador lateral do tipo de atividade */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />

                        {/* Coluna 1: Informações do Estudo de Origem */}
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {parsed.tag && (
                              <span className="text-[10px] font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
                                {parsed.tag}
                              </span>
                            )}
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg flex items-center gap-1">
                              <Activity size={10} /> {session.activityType || 'Leitura'}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg flex items-center gap-1">
                              <Clock size={10} /> {session.durationInMinutes} min
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                              {subject?.name || 'Disciplina não encontrada'}
                            </h4>
                            <h2 className="text-base font-black text-zinc-800 dark:text-zinc-100 mt-0.5">
                              {topic?.title || 'Geral / Outros'}
                            </h2>
                            {parsed.cleanNotes && (
                              <p className="text-xs text-zinc-450 dark:text-zinc-550 italic font-medium mt-1">
                                &ldquo;{parsed.cleanNotes}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Seção das Revisões Subsequentes Geradas */}
                          {subsequentReviews.length > 0 && (
                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                              <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={11} className="text-amber-500" /> Revisões Planejadas Geradas
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {subsequentReviews.map(rev => {
                                  const revDayMatch = rev.notes?.match(/Revisão automática \((\d+d)\)/);
                                  const revLabel = revDayMatch ? revDayMatch[1] : 'Revisão';
                                  const revFormattedDate = new Date(rev.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit'
                                  });

                                  const hasOwnLink = rev.questionsLink && rev.questionsLink !== session.questionsLink;

                                  return (
                                    <button
                                      key={rev.id}
                                      onClick={() => handleOpenReviewLinkEditor(rev)}
                                      className={`text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center gap-1.5 transition-all hover:scale-102 ${
                                        hasOwnLink
                                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 shadow-xs'
                                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-300'
                                      }`}
                                      title={hasOwnLink ? "Esta revisão possui um link personalizado diferente da sessão de origem" : "Esta revisão herda o link da sessão de origem"}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                      {revLabel} ({revFormattedDate})
                                      <Link2 size={12} className="opacity-60" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Coluna 2: Gerenciamento de Links do Estudo de Origem */}
                        <div className="w-full lg:w-96 flex flex-col justify-between p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl gap-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                                Links Cadastrados
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddSessionLinkField(session.id, linksToDisplay)}
                                className="text-[9px] font-black uppercase px-2 py-1 bg-white dark:bg-zinc-800 border rounded-lg text-indigo-500 flex items-center gap-1 hover:bg-zinc-50 transition-all cursor-pointer shadow-xs"
                              >
                                <Plus size={10} /> Adicionar Link
                              </button>
                            </div>

                            {/* Inputs Dinâmicos de Link */}
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {linksToDisplay.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium italic mt-1 pl-1">
                                  Nenhum link adicionado ainda.
                                </p>
                              ) : (
                                linksToDisplay.map((lnk, idx) => (
                                  <div key={idx} className="flex gap-1.5 items-center">
                                    <input
                                      type="url"
                                      placeholder="https://..."
                                      value={lnk}
                                      onChange={(e) => {
                                        // Ativa o estado de edição para este card se ainda não ativo
                                        const current = isEditing ? linksToDisplay : [...links];
                                        handleUpdateSessionLinkValue(session.id, idx, e.target.value, current);
                                      }}
                                      className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs dark:text-white"
                                    />
                                    {lnk && !isEditing && (
                                      <a
                                        href={lnk}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                                        title="Abrir Link"
                                      >
                                        <Link2 size={12} />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = isEditing ? linksToDisplay : [...links];
                                        handleRemoveSessionLinkField(session.id, idx, current);
                                      }}
                                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Botão de Salvar Alterações da Sessão */}
                          {isEditing && (
                            <button
                              type="button"
                              disabled={savingSessionId === session.id}
                              onClick={() => handleSaveSessionLinks(session, linksToDisplay)}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                            >
                              <Save size={13} /> 
                              {savingSessionId === session.id ? 'Gravando...' : 'Salvar Alterações'}
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Compacto para Customizar Link de Revisão Subsequente */}
      {editingReviewId && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in duration-150">
            
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                <Link2 size={14} className="text-indigo-500" /> Customizar Links de Revisão
              </h3>
              <button 
                onClick={() => {
                  setEditingReviewId(null);
                  setEditingReviewLinks([]);
                }} 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
              Altere os links desta revisão se deseja desvinculá-la do caderno padrão do estudo de origem.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Links da Revisão</span>
                <button
                  type="button"
                  onClick={() => setEditingReviewLinks(prev => [...prev, ''])}
                  className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-indigo-500 flex items-center gap-0.5 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  <Plus size={9} /> Adicionar Link
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {editingReviewLinks.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 font-medium italic mt-1 pl-1">Nenhum link adicionado ainda.</p>
                ) : (
                  editingReviewLinks.map((lnk, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={lnk}
                        onChange={(e) => {
                          const next = [...editingReviewLinks];
                          next[idx] = e.target.value;
                          setEditingReviewLinks(next);
                        }}
                        className="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingReviewLinks(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={savingReviewId === editingReviewId}
              onClick={handleSaveReviewLinks}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all"
            >
              <Save size={13} /> {savingReviewId === editingReviewId ? 'Gravando...' : 'Salvar Customizações'}
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default QuestionsNotebooksView;
