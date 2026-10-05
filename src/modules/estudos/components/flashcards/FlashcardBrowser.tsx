import React, { useState, useMemo } from 'react';
import { CardWithState, FlashcardDeck, State } from '../../types/flashcards';
import { Subject } from '../../types';
import { sanitizeHtml } from '../../../../utils/sanitizeHtml';

interface FlashcardBrowserProps {
  cardsWithState: CardWithState[];
  decks: FlashcardDeck[];
  subjects: Subject[];
  initialSubjectId?: string;
  onToggleSuspend: (id: string, currentSuspended: boolean) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
  onEditCard: (card: CardWithState) => void;
}

export const FlashcardBrowser: React.FC<FlashcardBrowserProps> = ({
  cardsWithState,
  decks,
  subjects,
  initialSubjectId,
  onToggleSuspend,
  onDeleteCard,
  onEditCard
}) => {
  const [search, setSearch] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Mapear todas as tags existentes
  const allTags = useMemo(() => {
    const set = new Set<string>();
    cardsWithState.forEach(c => c.card.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [cardsWithState]);

  // Filtragem dos cartões
  const filteredCards = useMemo(() => {
    const now = new Date();
    return cardsWithState.filter(item => {
      // 1. Deck
      if (selectedDeckId !== 'all') {
        const matchesDeck = item.card.deck_id === selectedDeckId ||
          (Array.isArray(item.card.deck_ids) && item.card.deck_ids.includes(selectedDeckId));
        if (!matchesDeck) return false;
      }

      // 2. Disciplina
      if (selectedSubjectId !== 'all') {
        const matchesSubject = item.card.subject_id === selectedSubjectId ||
          (Array.isArray(item.card.subject_ids) && item.card.subject_ids.includes(selectedSubjectId));
        if (!matchesSubject) return false;
      }

      // 3. Tag
      if (selectedTag !== 'all' && !item.card.tags.includes(selectedTag)) return false;

      // 4. Status
      if (selectedStatus === 'suspended') {
        if (!item.card.is_suspended) return false;
      } else if (selectedStatus === 'new') {
        if (item.scheduling.state !== State.New || item.card.is_suspended) return false;
      } else if (selectedStatus === 'learning') {
        if ((item.scheduling.state !== State.Learning && item.scheduling.state !== State.Relearning) || item.card.is_suspended) return false;
      } else if (selectedStatus === 'review') {
        if (item.scheduling.state !== State.Review || item.card.is_suspended) return false;
      } else if (selectedStatus === 'due') {
        if (new Date(item.scheduling.due_at) > now || item.card.is_suspended) return false;
      }

      // 5. Busca textual
      if (search.trim()) {
        const s = search.toLowerCase();
        const front = item.card.front.toLowerCase();
        const back = item.card.back.toLowerCase();
        const cloze = (item.card.cloze_text || '').toLowerCase();
        const tagsStr = item.card.tags.join(' ').toLowerCase();
        if (!front.includes(s) && !back.includes(s) && !cloze.includes(s) && !tagsStr.includes(s)) {
          return false;
        }
      }

      return true;
    });
  }, [cardsWithState, selectedDeckId, selectedSubjectId, selectedStatus, selectedTag, search]);

  const deckMap = useMemo(() => {
    const map = new Map<string, string>();
    decks.forEach(d => map.set(d.id, d.name));
    return map;
  }, [decks]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach(s => map.set(s.id, s.name));
    return map;
  }, [subjects]);

  const getStateBadge = (state: State, isSuspended: boolean) => {
    if (isSuspended) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
          Suspenso
        </span>
      );
    }
    switch (state) {
      case State.New:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50">
            Novo
          </span>
        );
      case State.Learning:
      case State.Relearning:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50">
            Aprendendo
          </span>
        );
      case State.Review:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
            Revisão
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE FILTROS E BUSCA */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div>
          <input
            type="text"
            placeholder="Pesquisar por pergunta, resposta ou #tag... (Clique em qualquer cartão para editar)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* BARALHO */}
          <select
            value={selectedDeckId}
            onChange={e => setSelectedDeckId(e.target.value)}
            className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todos os Baralhos</option>
            {decks.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* DISCIPLINA */}
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todas as Disciplinas</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* STATUS */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="new">Novos</option>
            <option value="learning">Aprender</option>
            <option value="review">Revisar</option>
            <option value="suspended">Suspensos</option>
          </select>

          {/* TAGS */}
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todas as Tags</option>
            {allTags.map(t => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
        <span>{filteredCards.length} {filteredCards.length === 1 ? 'cartão encontrado' : 'cartões encontrados'} (Clique no cartão para editar)</span>
      </div>

      {/* LISTA / TABELA DE CARTÕES */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredCards.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            Nenhum flashcard encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredCards.map(item => {
              const cardDecks = (item.card.deck_ids && item.card.deck_ids.length > 0)
                ? item.card.deck_ids
                : [item.card.deck_id];
              const deckNames = cardDecks.map(id => deckMap.get(id)).filter(Boolean);

              const cardSubjects = (item.card.subject_ids && item.card.subject_ids.length > 0)
                ? item.card.subject_ids
                : (item.card.subject_id ? [item.card.subject_id] : []);
              const subjectNames = cardSubjects.map(id => subjectMap.get(id)).filter(Boolean);
              const dueDate = new Date(item.scheduling.due_at).toLocaleDateString('pt-BR');

              return (
                <div
                  key={item.card.id}
                  onClick={() => onEditCard(item)}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getStateBadge(item.scheduling.state, item.card.is_suspended)}
                      {deckNames.map(name => (
                        <span key={name} className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                          {name}
                        </span>
                      ))}
                      {subjectNames.map(name => (
                        <span key={name} className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {name}
                        </span>
                      ))}
                      {item.card.card_type === 'cloze' && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                          Cloze
                        </span>
                      )}
                    </div>

                    <div
                      className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.card.front) }}
                    />

                    {item.card.card_type !== 'cloze' && (
                      <div
                        className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.card.back) }}
                      />
                    )}

                    {item.card.tags.length > 0 && (
                      <div className="flex items-center gap-1 pt-1 flex-wrap">
                        {item.card.tags.map(t => (
                          <span key={t} className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                    <div className="text-right text-[10px] font-mono text-zinc-400 hidden md:block">
                      <div>Próx: <strong className="text-zinc-700 dark:text-zinc-200">{dueDate}</strong></div>
                      <div>Reps: {item.scheduling.reps} (Lapses: {item.scheduling.lapses})</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditCard(item)}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar Cartão"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleSuspend(item.card.id, item.card.is_suspended)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          item.card.is_suspended
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                            : 'text-zinc-500 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                        }`}
                        title={item.card.is_suspended ? 'Reativar Cartão' : 'Suspender Cartão'}
                      >
                        {item.card.is_suspended ? 'Reativar' : 'Suspender'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteCard(item.card.id)}
                        className="px-2 py-1 text-xs font-bold text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Cartão"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
