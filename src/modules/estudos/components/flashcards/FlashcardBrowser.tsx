import React, { useState, useMemo } from 'react';
import { CardWithState, FlashcardDeck, State } from '../../types/flashcards';
import { Subject } from '../../types';
import {
  Search,
  Filter,
  Trash2,
  PauseCircle,
  PlayCircle,
  Edit3,
  Layers,
  Sparkles,
  Calendar,
  Tag as TagIcon
} from 'lucide-react';

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
      if (selectedDeckId !== 'all' && item.card.deck_id !== selectedDeckId) return false;

      // 2. Disciplina
      if (selectedSubjectId !== 'all' && item.card.subject_id !== selectedSubjectId) return false;

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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por pergunta, resposta ou #tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* BARALHO */}
          <select
            value={selectedDeckId}
            onChange={e => setSelectedDeckId(e.target.value)}
            className="p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
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
            className="p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todas as Matérias</option>
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
            className="p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="due">Vencem Hoje / Atrasados</option>
            <option value="new">Novos</option>
            <option value="learning">Em Aprendizagem</option>
            <option value="review">Em Revisão (Maduros)</option>
            <option value="suspended">Suspensos</option>
          </select>

          {/* TAGS */}
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todas as Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
        <span>{filteredCards.length} {filteredCards.length === 1 ? 'cartão encontrado' : 'cartões encontrados'}</span>
      </div>

      {/* LISTA / TABELA DE CARTÕES */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        {filteredCards.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            Nenhum flashcard encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredCards.map(item => {
              const deckName = deckMap.get(item.card.deck_id) || 'Sem Baralho';
              const subjectName = item.card.subject_id ? subjectMap.get(item.card.subject_id) : null;
              const dueDate = new Date(item.scheduling.due_at).toLocaleDateString('pt-BR');

              return (
                <div
                  key={item.card.id}
                  className="p-4 sm:p-5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getStateBadge(item.scheduling.state, item.card.is_suspended)}
                      <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {deckName}
                      </span>
                      {subjectName && (
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {subjectName}
                        </span>
                      )}
                      {item.card.card_type === 'cloze' && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                          Cloze
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-2">
                      {item.card.front}
                    </div>

                    {item.card.card_type !== 'cloze' && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {item.card.back}
                      </div>
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

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                    <div className="text-right text-[11px] font-mono text-zinc-400 hidden md:block">
                      <div>Próx: <strong className="text-zinc-700 dark:text-zinc-200">{dueDate}</strong></div>
                      <div>Reps: {item.scheduling.reps} (Lapses: {item.scheduling.lapses})</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleSuspend(item.card.id, item.card.is_suspended)}
                        className={`p-2 rounded-xl border transition-all ${
                          item.card.is_suspended
                            ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                            : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent'
                        }`}
                        title={item.card.is_suspended ? 'Reativar Cartão' : 'Suspender Cartão'}
                      >
                        {item.card.is_suspended ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                      </button>

                      <button
                        onClick={() => onDeleteCard(item.card.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                        title="Excluir Cartão"
                      >
                        <Trash2 size={16} />
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
