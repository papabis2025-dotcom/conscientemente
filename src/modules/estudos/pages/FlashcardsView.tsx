import React, { useState, useEffect, useCallback } from 'react';
import { Subject, Concurso } from '../types';
import {
  FlashcardDeck,
  CardWithState,
  FlashcardType,
  FlashcardSettings,
  FlashcardSessionSummary
} from '../types/flashcards';
import { flashcardsApi } from '../services/flashcards/api';
import { FlashcardReviewSession } from '../components/flashcards/FlashcardReviewSession';
import { FlashcardEditor } from '../components/flashcards/FlashcardEditor';
import { FlashcardDeckManager } from '../components/flashcards/FlashcardDeckManager';
import { FlashcardBrowser } from '../components/flashcards/FlashcardBrowser';
import { FlashcardStats } from '../components/flashcards/FlashcardStats';
import { FlashcardSettingsModal } from '../components/flashcards/FlashcardSettingsModal';

interface FlashcardsViewProps {
  subjects: Subject[];
  allSubjects: Subject[];
  activeConcurso?: Concurso;
  selectedConcursoId?: string | 'all';
  theme?: 'light' | 'dark';
  initialSubjectId?: string;
}

type FlashcardSubTab = 'baralhos' | 'todos' | 'stats';

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  subjects,
  allSubjects,
  activeConcurso,
  selectedConcursoId,
  theme,
  initialSubjectId
}) => {
  const [subTab, setSubTab] = useState<FlashcardSubTab>(initialSubjectId ? 'todos' : 'baralhos');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [cardsWithState, setCardsWithState] = useState<CardWithState[]>([]);
  const [dueQueue, setDueQueue] = useState<CardWithState[]>([]);
  const [queueCounts, setQueueCounts] = useState({
    overdue: 0,
    learning: 0,
    review: 0,
    newCards: 0,
    total: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewDeckId, setReviewDeckId] = useState<string | undefined>(undefined);
  const [reviewDeckName, setReviewDeckName] = useState<string>('Revisão Geral');

  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithState | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<FlashcardSettings>({
    new_cards_per_day: 20,
    max_reviews_per_day: 200,
    request_retention: 0.9,
    show_next_review_time: true,
    enable_keyboard_shortcuts: true,
    again_spacing: { value: 10, unit: 'minutes' },
    hard_spacing: { value: 1, unit: 'days' },
    good_spacing: { value: 3, unit: 'days' },
    easy_spacing: { value: 7, unit: 'days' },
    maximum_interval_days: 36500
  });

  const [statsSummary, setStatsSummary] = useState({
    reviewedToday: 0,
    streak: 0,
    retentionRate: 100,
    totalCards: 0,
    newCount: 0,
    learningCount: 0,
    reviewCount: 0,
    suspendedCount: 0
  });
  const [forecast, setForecast] = useState<{ date: string; count: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  // Carregar dados de forma consolidada e eficiente (sem polling)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        loadedDecks,
        loadedCards,
        queueRes,
        loadedSettings,
        loadedStats,
        loadedForecast,
        loadedHeatmap
      ] = await Promise.all([
        flashcardsApi.decks.list(),
        flashcardsApi.cards.list(),
        flashcardsApi.queue.getStudyQueue(),
        flashcardsApi.settings.get(),
        flashcardsApi.stats.getSummary(),
        flashcardsApi.stats.getForecast(14),
        flashcardsApi.stats.getHeatmapData()
      ]);

      setDecks(loadedDecks);
      setCardsWithState(loadedCards);
      setDueQueue(queueRes.dueCards);
      setQueueCounts(queueRes.counts);
      if (loadedSettings) setSettings(loadedSettings);
      setStatsSummary(loadedStats);
      setForecast(loadedForecast);
      setHeatmapData(loadedHeatmap);
    } catch (err) {
      console.error('Erro ao carregar módulo de flashcards:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Iniciar revisão geral
  const handleStartGeneralReview = () => {
    if (dueQueue.length === 0) return;
    setReviewDeckId(undefined);
    setReviewDeckName('Revisão Geral (Todos os Baralhos)');
    setIsReviewing(true);
  };

  // Iniciar revisão de um baralho específico
  const handleStartDeckReview = async (deckId: string, deckName: string) => {
    setIsLoading(true);
    try {
      const res = await flashcardsApi.queue.getStudyQueue({ deckId });
      if (res.dueCards.length === 0) {
        alert('Não há cartões pendentes de revisão para este baralho no momento!');
        return;
      }
      setDueQueue(res.dueCards);
      setReviewDeckId(deckId);
      setReviewDeckName(deckName);
      setIsReviewing(true);
    } catch (e) {
      console.error('Erro ao carregar fila do baralho:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Callback de conclusão da sessão de estudo
  const handleFinishSession = (summary: FlashcardSessionSummary) => {
    setIsReviewing(false);
    loadData();
  };

  // Salvar ou atualizar cartão no Supabase (suporta múltiplos baralhos e múltiplas disciplinas)
  const handleSaveCard = async (
    cardData: {
      id?: string;
      deck_id: string;
      deck_ids?: string[];
      card_type: FlashcardType;
      front: string;
      back: string;
      cloze_text?: string;
      tags: string[];
      subject_id?: string;
      subject_ids?: string[];
      topic_id?: string;
      topic_ids?: string[];
    },
    createAnother: boolean
  ) => {
    try {
      const targetDeckIds = cardData.deck_ids && cardData.deck_ids.length > 0
        ? cardData.deck_ids
        : [cardData.deck_id];

      const targetSubjectIds = cardData.subject_ids && cardData.subject_ids.length > 0
        ? cardData.subject_ids
        : (cardData.subject_id ? [cardData.subject_id] : []);

      if (cardData.id) {
        await flashcardsApi.cards.update(cardData.id, {
          deck_id: targetDeckIds[0],
          deck_ids: targetDeckIds,
          card_type: cardData.card_type,
          front: cardData.front,
          back: cardData.back,
          cloze_text: cardData.cloze_text || null,
          tags: cardData.tags || [],
          subject_id: targetSubjectIds[0] || null,
          subject_ids: targetSubjectIds,
          topic_id: cardData.topic_id || null,
        });
      } else {
        await flashcardsApi.cards.create({
          deck_id: targetDeckIds[0],
          deck_ids: targetDeckIds,
          card_type: cardData.card_type,
          front: cardData.front,
          back: cardData.back,
          cloze_text: cardData.cloze_text || null,
          tags: cardData.tags || [],
          subject_id: targetSubjectIds[0] || null,
          subject_ids: targetSubjectIds,
          topic_id: cardData.topic_id || null,
        });
      }

      if (!createAnother) {
        setShowEditorModal(false);
        setEditingCard(null);
      }
      await loadData();
    } catch (err: any) {
      console.error('Falha ao salvar/atualizar cartão:', err);
      throw err;
    }
  };

  // Abrir editor para editar cartão existente
  const handleEditCard = (card: CardWithState) => {
    setEditingCard(card);
    setShowEditorModal(true);
  };

  // Criar baralho
  const handleCreateDeck = async (deckData: Partial<FlashcardDeck>) => {
    await flashcardsApi.decks.create(deckData);
    loadData();
  };

  // Atualizar baralho
  const handleUpdateDeck = async (id: string, deckData: Partial<FlashcardDeck>) => {
    await flashcardsApi.decks.update(id, deckData);
    loadData();
  };

  // Deletar baralho
  const handleDeleteDeck = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este baralho e todos os seus cartões?')) {
      await flashcardsApi.decks.delete(id);
      loadData();
    }
  };

  // Suspender / Reativar cartão
  const handleToggleSuspend = async (cardId: string, currentSuspended: boolean) => {
    await flashcardsApi.cards.toggleSuspend(cardId, !currentSuspended);
    loadData();
  };

  // Excluir cartão
  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm('Excluir este flashcard?')) {
      await flashcardsApi.cards.delete(cardId, true);
      loadData();
    }
  };

  // Salvar configurações
  const handleSaveSettings = async (newSettings: Partial<FlashcardSettings>) => {
    const updated = await flashcardsApi.settings.update(newSettings);
    if (updated) setSettings(updated);
    loadData();
  };

  // TELA DE REVISÃO ATIVA
  if (isReviewing && dueQueue.length > 0) {
    return (
      <FlashcardReviewSession
        cardsQueue={dueQueue}
        deckName={reviewDeckName}
        onFinishSession={handleFinishSession}
        onExit={() => {
          setIsReviewing(false);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* HEADER SUPERIOR NO ESTILO MENU DO ANKI (SEM ÍCONES) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Flashcards
            </h1>
            <span className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/50">
              FSRS 4.5
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Repetição espaçada moderna com retenção otimizada
          </p>
        </div>

        {/* MENU SUPERIOR ANKI: Baralhos | Adicionar | Painel | Estatísticas | Sincronizar | Opções */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('baralhos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'baralhos'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Baralhos
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCard(null);
              setShowEditorModal(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all cursor-pointer"
          >
            Adicionar
          </button>

          <button
            type="button"
            onClick={() => setSubTab('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'todos'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Painel ({cardsWithState.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'stats'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Estatísticas
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all cursor-pointer"
            title="Sincronizar dados"
          >
            Sincronizar
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all cursor-pointer"
            title="Opções de Espaçamento e FSRS"
          >
            Opções
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA SUB-ABA */}
      {subTab === 'baralhos' && (
        <FlashcardDeckManager
          decks={decks}
          subjects={subjects}
          reviewedToday={statsSummary.reviewedToday}
          studyTimeSecondsToday={statsSummary.reviewedToday * 12}
          onCreateDeck={handleCreateDeck}
          onUpdateDeck={handleUpdateDeck}
          onDeleteDeck={handleDeleteDeck}
          onStudyDeck={handleStartDeckReview}
          onOpenSettings={() => setShowSettingsModal(true)}
          onStartGeneralReview={handleStartGeneralReview}
          totalDueCount={queueCounts.total}
        />
      )}

      {subTab === 'todos' && (
        <FlashcardBrowser
          cardsWithState={cardsWithState}
          decks={decks}
          subjects={subjects}
          initialSubjectId={initialSubjectId}
          onToggleSuspend={handleToggleSuspend}
          onDeleteCard={handleDeleteCard}
          onEditCard={handleEditCard}
        />
      )}

      {subTab === 'stats' && (
        <FlashcardStats
          statsSummary={statsSummary}
          forecast={forecast}
          heatmapData={heatmapData}
        />
      )}

      {/* MODAL DO EDITOR DE FLASHCARDS (CRIAR E EDITAR) */}
      {showEditorModal && (
        <FlashcardEditor
          key={editingCard ? editingCard.card.id : 'new-card'}
          decks={decks}
          subjects={subjects}
          editingCard={editingCard}
          onSave={handleSaveCard}
          onClose={() => {
            setShowEditorModal(false);
            setEditingCard(null);
          }}
        />
      )}

      {/* MODAL DE CONFIGURAÇÕES E ESPAÇAMENTOS */}
      {showSettingsModal && (
        <FlashcardSettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
