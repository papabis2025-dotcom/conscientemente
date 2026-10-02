import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Layers,
  Play,
  Plus,
  Sliders,
  Calendar,
  Sparkles,
  Flame,
  Clock,
  CheckCircle2,
  Folder,
  ArrowRight,
  RefreshCw,
  Trophy
} from 'lucide-react';

interface FlashcardsViewProps {
  subjects: Subject[];
  allSubjects: Subject[];
  activeConcurso?: Concurso;
  selectedConcursoId?: string | 'all';
  theme?: 'light' | 'dark';
  initialSubjectId?: string;
}

type FlashcardSubTab = 'hoje' | 'baralhos' | 'todos' | 'stats';

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  subjects,
  allSubjects,
  activeConcurso,
  selectedConcursoId,
  theme,
  initialSubjectId
}) => {
  const [subTab, setSubTab] = useState<FlashcardSubTab>(initialSubjectId ? 'todos' : 'hoje');
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<FlashcardSettings>({
    new_cards_per_day: 20,
    max_reviews_per_day: 200,
    request_retention: 0.9,
    show_next_review_time: true,
    enable_keyboard_shortcuts: true
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
        flashcardsApi.stats.getForecast(30),
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
    setReviewDeckName('Revisão Geral (Fila Inteligente)');
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

  // Criar cartão no Supabase
  const handleSaveCard = async (
    cardData: {
      deck_id: string;
      card_type: FlashcardType;
      front: string;
      back: string;
      cloze_text?: string;
      tags: string[];
      subject_id?: string;
      topic_id?: string;
    },
    createAnother: boolean
  ) => {
    await flashcardsApi.cards.create(cardData);
    if (!createAnother) {
      setShowEditorModal(false);
    }
    loadData();
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

  // Estimativa de tempo (considerando ~12 segundos por cartão)
  const estimatedMinutes = Math.max(1, Math.round((queueCounts.total * 12) / 60));

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
      {/* HEADER SUPERIOR DO MÓDULO FLASHCARDS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                Flashcards
                <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/50">
                  FSRS 4.5
                </span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sistema de repetição espaçada moderna com retenção otimizada
              </p>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO SUPERIORES */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
            title="Configurações do Algoritmo"
          >
            <Sliders size={18} />
          </button>

          <button
            onClick={() => setShowEditorModal(true)}
            className="flex-1 sm:flex-none px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Novo Cartão
          </button>
        </div>
      </div>

      {/* SUB-NAVEGAÇÃO POR ABAS INTERNAS */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 w-fit">
        <button
          onClick={() => setSubTab('hoje')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            subTab === 'hoje'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Hoje
        </button>

        <button
          onClick={() => setSubTab('baralhos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            subTab === 'baralhos'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Baralhos ({decks.length})
        </button>

        <button
          onClick={() => setSubTab('todos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            subTab === 'todos'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Todos os Cartões ({cardsWithState.length})
        </button>

        <button
          onClick={() => setSubTab('stats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            subTab === 'stats'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Estatísticas
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA */}
      {subTab === 'hoje' && (
        <div className="space-y-6">
          {/* BANNER PRINCIPAL DE ESTUDOS DE HOJE */}
          <div className="bg-gradient-to-br from-indigo-900/20 via-zinc-900/10 to-transparent dark:from-indigo-950/40 dark:via-zinc-900/60 p-6 sm:p-10 rounded-[2.5rem] border border-indigo-200/30 dark:border-indigo-900/30 relative overflow-hidden shadow-sm">
            <div className="max-w-xl space-y-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                  Fila de Hoje
                </span>
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Clock size={14} /> Tempo previsto: ~{estimatedMinutes} min
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                {queueCounts.total > 0
                  ? `${queueCounts.total} cartões prontos para revisar`
                  : 'Tudo revisado por hoje! 🎉'}
              </h2>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                {queueCounts.total > 0
                  ? 'O algoritmo FSRS organizou sua fila priorizando cartões com maior risco de esquecimento.'
                  : 'Você completou todas as revisões programadas. Volte amanhã ou pratique cartões específicos pelos seus baralhos.'}
              </p>

              {queueCounts.total > 0 && (
                <div className="pt-2">
                  <button
                    onClick={handleStartGeneralReview}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <Play size={16} fill="currentColor" /> Iniciar Revisão Geral
                  </button>
                </div>
              )}
            </div>

            <div className="absolute right-4 bottom-4 opacity-5 dark:opacity-10 pointer-events-none hidden md:block">
              <Layers size={220} />
            </div>
          </div>

          {/* 4 CONTADORES DE FILA (FSRS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-rose-500 block mb-1">
                Atrasados
              </span>
              <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
                {queueCounts.overdue}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Urgentes para retenção</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-amber-500 block mb-1">
                Aprendendo
              </span>
              <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
                {queueCounts.learning}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Ciclos de fixação curta</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-emerald-500 block mb-1">
                Revisões de Hoje
              </span>
              <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
                {queueCounts.review}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">No momento ideal da curva</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-blue-500 block mb-1">
                Novos Cartões
              </span>
              <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
                {queueCounts.newCards}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Limite: {settings.new_cards_per_day}/dia</span>
            </div>
          </div>

          {/* LISTA RÁPIDA DE BARALHOS PARA HOJE */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                  Baralhos Ativos <Folder size={18} className="text-indigo-500" />
                </h3>
                <p className="text-xs text-zinc-400">Pratique por matéria ou baralho isolado</p>
              </div>

              <button
                onClick={() => setSubTab('baralhos')}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
              >
                Gerenciar todos <ArrowRight size={14} />
              </button>
            </div>

            {decks.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                Nenhum baralho criado. Crie seu primeiro baralho clicando no botão "+ Novo Cartão".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {decks.slice(0, 6).map(deck => (
                  <div
                    key={deck.id}
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                        {deck.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1">
                        <span className="text-blue-500 font-bold">{deck.new_count || 0} novos</span>
                        <span>•</span>
                        <span className="text-emerald-500 font-bold">{deck.due_count || 0} pendentes</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartDeckReview(deck.id, deck.name)}
                      disabled={(deck.due_count || 0) === 0}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                      title="Estudar este baralho"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'baralhos' && (
        <FlashcardDeckManager
          decks={decks}
          subjects={subjects}
          onCreateDeck={handleCreateDeck}
          onUpdateDeck={handleUpdateDeck}
          onDeleteDeck={handleDeleteDeck}
          onStudyDeck={handleStartDeckReview}
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
          onEditCard={() => {}}
        />
      )}

      {subTab === 'stats' && (
        <FlashcardStats
          statsSummary={statsSummary}
          forecast={forecast}
          heatmapData={heatmapData}
        />
      )}

      {/* MODAL DO EDITOR DE FLASHCARDS */}
      {showEditorModal && (
        <FlashcardEditor
          decks={decks}
          subjects={subjects}
          onSave={handleSaveCard}
          onClose={() => setShowEditorModal(false)}
        />
      )}

      {/* MODAL DE CONFIGURAÇÕES */}
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
