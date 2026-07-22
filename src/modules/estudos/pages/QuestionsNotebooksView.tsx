import React, { useState, useMemo } from 'react';
import { Subject, StudySession, Concurso, Topic } from '../types';
import { api } from '../services/api';
import { getColorHex } from '../utils/colors';
import { 
  Link2, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Calendar, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  X
} from 'lucide-react';

interface QuestionsNotebooksViewProps {
  sessions: StudySession[];
  activeConcurso: Concurso | null;
  allSubjects: Subject[];
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

const formatCardDate = (dateStr: string) => {
  if (!dateStr) return 'Data não informada';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const monthName = months[monthIndex] || '';
    return `${day} de ${monthName} de ${year}`;
  }
  return dateStr;
};

export const QuestionsNotebooksView: React.FC<QuestionsNotebooksViewProps> = ({
  sessions,
  activeConcurso,
  allSubjects,
  setSessions,
  onSyncReviews
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estados locais para edição dos links de grupos de estudos (chave: dateStr_subjectId)
  const [editingGroupLinks, setEditingGroupLinks] = useState<Record<string, string[]>>({});
  const [savingGroupKey, setSavingGroupKey] = useState<string | null>(null);

  // Proteção absoluta contra arrays nulos ou indefinidos vindo das props
  const safeSessions = useMemo(() => sessions || [], [sessions]);
  const safeAllSubjects = useMemo(() => allSubjects || [], [allSubjects]);

  // Filtro de Disciplinas associadas ao Concurso focado no momento
  const activeSubjects = useMemo(() => {
    return activeConcurso ? activeConcurso.subjects || [] : [];
  }, [activeConcurso]);

  // Lista de sessões de estudo realizadas (estudos de origem, sem contar revisões e simulados)
  const originSessions = useMemo(() => {
    return safeSessions.filter(s => {
      const isSim = s.isSimulado || s.activityType === 'Simulado';
      const isRev = s.activityType && (
        s.activityType.toLowerCase().includes('revisão') || 
        s.activityType.toLowerCase().includes('revisao')
      );
      return !isSim && !isRev;
    }).sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [safeSessions]);

  // Mapeamento e filtragem das sessões de estudo realizadas
  const filteredSessions = useMemo(() => {
    return originSessions.filter(s => {
      // Garante que só mostramos sessões cujas disciplinas pertencem ao concurso focado no momento
      const hasSub = activeSubjects.some(sub => sub.id === s.subjectId);
      if (!hasSub) return false;

      // Filtro por Disciplina
      if (selectedSubjectId !== 'all' && s.subjectId !== selectedSubjectId) {
        return false;
      }

      // Filtro por busca de texto (tag, tópico, anotações)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const parsed = parseNotesGroup(s.notes || '');
        const subject = safeAllSubjects.find(sub => sub.id === s.subjectId);
        const topic = subject?.topics?.find(t => t.id === s.topicId);

        const matchTag = !!(parsed.tag && parsed.tag.toLowerCase().includes(query));
        const matchTopic = (topic?.title || 'geral').toLowerCase().includes(query);
        const matchSubject = (subject?.name || '').toLowerCase().includes(query);
        const matchNotes = parsed.cleanNotes.toLowerCase().includes(query);

        if (!matchTag && !matchTopic && !matchSubject && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [originSessions, selectedSubjectId, searchQuery, activeSubjects, safeAllSubjects]);

  // Agrupamento de sessões filtradas por DATA e DISCIPLINA (card/grupo único)
  const groupedCards = useMemo(() => {
    const cardsMap = new Map<string, {
      dateStr: string;
      subjectId: string;
      sessions: StudySession[];
    }>();

    filteredSessions.forEach(s => {
      const dateStr = getLocalDateString(s.date);
      const key = `${dateStr}_${s.subjectId}`;
      if (!cardsMap.has(key)) {
        cardsMap.set(key, {
          dateStr,
          subjectId: s.subjectId,
          sessions: []
        });
      }
      cardsMap.get(key)!.sessions.push(s);
    });

    return Array.from(cardsMap.values()).sort((a, b) => {
      // Mais recente primeiro (ordenando alfanumericamente por ISO string de data)
      const dateCompare = b.dateStr.localeCompare(a.dateStr);
      if (dateCompare !== 0) return dateCompare;
      // Desempate por nome de disciplina
      const subA = safeAllSubjects.find(s => s.id === a.subjectId);
      const subB = safeAllSubjects.find(s => s.id === b.subjectId);
      return (subA?.name || '').localeCompare(subB?.name || '', 'pt-BR');
    });
  }, [filteredSessions, safeAllSubjects]);

  // Inicializa ou obtém a lista de links para um grupo
  const getGroupLinks = (cardKey: string, cardSessions: StudySession[]) => {
    if (editingGroupLinks[cardKey] !== undefined) {
      return editingGroupLinks[cardKey];
    }
    // Busca a primeira sessão do grupo que possua links gravados
    const sessionWithLinks = cardSessions.find(s => s.questionsLink);
    if (sessionWithLinks && sessionWithLinks.questionsLink) {
      try {
        const parsed = JSON.parse(sessionWithLinks.questionsLink);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
      return [sessionWithLinks.questionsLink];
    }
    return [];
  };

  const handleAddGroupLinkField = (cardKey: string, currentLinks: string[]) => {
    setEditingGroupLinks(prev => ({
      ...prev,
      [cardKey]: [...currentLinks, '']
    }));
  };

  const handleUpdateGroupLinkValue = (cardKey: string, index: number, value: string, currentLinks: string[]) => {
    const next = [...currentLinks];
    next[index] = value;
    setEditingGroupLinks(prev => ({
      ...prev,
      [cardKey]: next
    }));
  };

  const handleRemoveGroupLinkField = (cardKey: string, index: number, currentLinks: string[]) => {
    const next = currentLinks.filter((_, i) => i !== index);
    setEditingGroupLinks(prev => ({
      ...prev,
      [cardKey]: next
    }));
  };

  // Salvar links do grupo consolidado (propaga para todas as sessões do grupo)
  const handleSaveGroupLinks = async (cardKey: string, cardSessions: StudySession[], links: string[]) => {
    setSavingGroupKey(cardKey);
    const filtered = links.filter(Boolean);
    const payload = filtered.length > 0 ? JSON.stringify(filtered) : null;

    try {
      // 1. Atualizar todas as sessões do grupo de forma paralela no banco
      await Promise.all(cardSessions.map(async session => {
        await api.sessions.update(session.id, { questionsLink: payload || undefined });
      }));

      // 2. Atualizar no estado local do React de uma vez só
      const sessionIds = new Set(cardSessions.map(s => s.id));
      setSessions(prev => prev.map(s => sessionIds.has(s.id) ? { ...s, questionsLink: payload || undefined } : s));

      // 3. Forçar sincronização automática para propagar para as revisões subsequentes geradas de todos os tópicos
      await onSyncReviews();

      // Limpar estado de edição
      setEditingGroupLinks(prev => {
        const copy = { ...prev };
        delete copy[cardKey];
        return copy;
      });
    } catch (e) {
      console.error('Error saving group links:', e);
      alert('Erro ao salvar os links do grupo. Tente novamente.');
    } finally {
      setSavingGroupKey(null);
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
            Gerencie os links de cadernos de questões consolidados por disciplina e data de primeiro estudo.
          </p>
        </div>
      </div>

      {/* Painel de Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-xs">
        
        {/* Filtro de Disciplina */}
        <div>
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-2 block">Disciplina</label>
          <select 
            value={selectedSubjectId} 
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="all">Todas as Disciplinas</option>
            {activeSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Campo de Busca por texto */}
        <div>
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-2 block">Buscar por Código ou Assunto</label>
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Ex: #OAB47DPC ou Inquérito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm text-zinc-700 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Listagem de Cadernos por Grupos Consolidados */}
      <div className="space-y-6">
        {groupedCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-350 dark:border-zinc-800 text-center animate-in fade-in">
            <AlertCircle className="text-zinc-400 dark:text-zinc-650 mb-3" size={32} />
            <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Nenhum estudo encontrado</h3>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 max-w-sm mt-1">
              Realize novos estudos no Planner ou revise seus filtros de busca para visualizar e gerenciar cadernos.
            </p>
          </div>
        ) : (
          groupedCards.map(card => {
            const subject = safeAllSubjects.find(sub => sub.id === card.subjectId);
            const hexColor = getColorHex(subject?.color || 'bg-indigo-500');

            // Reúne todos os tópicos e tags estudados no grupo
            const topicsList: string[] = [];
            const tagsList: string[] = [];
            let totalDuration = 0;
            const activityTypes = new Set<string>();

            card.sessions.forEach(s => {
              const topic = subject?.topics?.find(t => t.id === s.topicId);
              const title = topic?.title || 'Geral / Outros';
              if (!topicsList.includes(title)) {
                topicsList.push(title);
              }
              
              const parsed = parseNotesGroup(s.notes || '');
              if (parsed.tag && !tagsList.includes(parsed.tag)) {
                tagsList.push(parsed.tag);
              }
              
              totalDuration += (s.durationInMinutes || 0);
              if (s.activityType) activityTypes.add(s.activityType);
            });

            const cardKey = `${card.dateStr}_${card.subjectId}`;
            const links = getGroupLinks(cardKey, card.sessions);
            const isEditing = editingGroupLinks[cardKey] !== undefined;
            const linksToDisplay = isEditing ? editingGroupLinks[cardKey] : links;

            const formattedDate = formatCardDate(card.dateStr);

            return (
              <div 
                key={cardKey} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col lg:flex-row gap-6 relative overflow-hidden"
              >
                {/* Indicador lateral acompanhando a cor da disciplina */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5" 
                  style={{ backgroundColor: hexColor }} 
                />

                {/* Coluna 1: Informações do Grupo de Estudos */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span 
                      className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1"
                      style={{ 
                        backgroundColor: `${hexColor}15`, 
                        color: hexColor 
                      }}
                    >
                      <Calendar size={10} /> {formattedDate}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg flex items-center gap-1">
                      <Clock size={10} /> {totalDuration} min
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg">
                      {Array.from(activityTypes).join(', ')}
                    </span>
                  </div>

                  <div>
                    {/* Título da Disciplina com a cor correspondente */}
                    <h4 
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: hexColor }}
                    >
                      {subject?.name || 'Disciplina não encontrada'}
                    </h4>
                    
                    {/* Lista de Assuntos e Tags associadas */}
                    <div className="mt-2 space-y-1.5">
                      {topicsList.map((topicTitle, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <ChevronRight size={12} className="shrink-0" style={{ color: hexColor }} />
                          <span className="text-sm font-black text-zinc-800 dark:text-zinc-100">
                            {topicTitle}
                          </span>
                          {tagsList[idx] && (
                            <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
                              {tagsList[idx]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Gerenciamento de Links Unificado */}
                <div className="w-full lg:w-96 flex flex-col justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-250 dark:border-zinc-800 rounded-3xl gap-3 shadow-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Links Consolidados
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddGroupLinkField(cardKey, linksToDisplay)}
                        className="text-[9px] font-black uppercase px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-900 text-indigo-650 dark:text-indigo-400 rounded-xl flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer shadow-xs"
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
                              value={lnk || ''}
                              onChange={(e) => {
                                const current = isEditing ? linksToDisplay : [...links];
                                handleUpdateGroupLinkValue(cardKey, idx, e.target.value, current);
                              }}
                              className="flex-1 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                            {lnk && !isEditing && (
                              <a
                                href={lnk}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-indigo-600 hover:text-indigo-755 dark:text-indigo-400 transition-colors shadow-xs"
                                title="Abrir Link"
                              >
                                <Link2 size={12} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const current = isEditing ? linksToDisplay : [...links];
                                handleRemoveGroupLinkField(cardKey, idx, current);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Botão de Salvar Alterações */}
                  {isEditing && (
                    <button
                      type="button"
                      disabled={savingGroupKey === cardKey}
                      onClick={() => handleSaveGroupLinks(cardKey, card.sessions, linksToDisplay)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-md shadow-indigo-600/15 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                    >
                      <Save size={13} /> 
                      {savingGroupKey === cardKey ? 'Gravando...' : 'Salvar Alterações'}
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default QuestionsNotebooksView;
