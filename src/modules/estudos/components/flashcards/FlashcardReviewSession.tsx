import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CardWithState, Rating, NextIntervalsPreview, FlashcardSessionSummary } from '../../types/flashcards';
import { flashcardsApi } from '../../services/flashcards/api';
import { defaultScheduler } from '../../services/flashcards/scheduler/fsrs';
import { ClozeRenderer } from './ClozeRenderer';

interface FlashcardReviewSessionProps {
  cardsQueue: CardWithState[];
  deckName?: string;
  onFinishSession: (summary: FlashcardSessionSummary) => void;
  onExit: () => void;
}

export const FlashcardReviewSession: React.FC<FlashcardReviewSessionProps> = ({
  cardsQueue,
  deckName,
  onFinishSession,
  onExit,
}) => {
  const [queue, setQueue] = useState<CardWithState[]>(cardsQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeButtonFeedback, setActiveButtonFeedback] = useState<Rating | null>(null);

  // Métricas da sessão
  const sessionStartTimeRef = useRef<number>(Date.now());
  const cardStartTimeRef = useRef<number>(Date.now());
  const ratingsCountRef = useRef({ again: 0, hard: 0, good: 0, easy: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const currentItem = queue[currentIndex] || null;

  // Timer da sessão
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resetar timer do cartão ao trocar de cartão
  useEffect(() => {
    setIsAnswerRevealed(false);
    cardStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // Previsão dos 4 intervalos calculados pelo FSRS para o cartão atual
  const intervalPreviews: NextIntervalsPreview | null = currentItem
    ? defaultScheduler.getNextIntervalPreviews(currentItem.scheduling)
    : null;

  // Função para revelar a resposta
  const handleRevealAnswer = useCallback(() => {
    if (!isAnswerRevealed) {
      setIsAnswerRevealed(true);
    }
  }, [isAnswerRevealed]);

  // Função para responder ao cartão
  const handleAnswer = useCallback(async (rating: Rating) => {
    if (!currentItem || isSubmitting || !isAnswerRevealed) return;

    setIsSubmitting(true);
    setActiveButtonFeedback(rating);

    const responseTimeMs = Math.max(100, Date.now() - cardStartTimeRef.current);

    // Atualizar contadores locais
    if (rating === Rating.Again) ratingsCountRef.current.again++;
    else if (rating === Rating.Hard) ratingsCountRef.current.hard++;
    else if (rating === Rating.Good) ratingsCountRef.current.good++;
    else if (rating === Rating.Easy) ratingsCountRef.current.easy++;

    try {
      // 1. Gravar no banco Supabase (ReviewLog imutável + Scheduling State atômico)
      await flashcardsApi.answerCard(currentItem.card.id, rating, responseTimeMs);

      // 2. Se o usuário marcou "Again", recoloca o cartão no final da fila da sessão atual para fixação
      let updatedQueue = [...queue];
      if (rating === Rating.Again) {
        // Clonar o item para repassar no fim da fila
        updatedQueue.push(currentItem);
        setQueue(updatedQueue);
      }

      // Feedback visual rápido (150ms) antes da transição suave
      setTimeout(() => {
        setActiveButtonFeedback(null);
        setIsSubmitting(false);

        if (currentIndex + 1 < updatedQueue.length) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // Sessão finalizada
          const total = Object.values(ratingsCountRef.current).reduce((a, b) => a + b, 0);
          const successes = ratingsCountRef.current.hard + ratingsCountRef.current.good + ratingsCountRef.current.easy;
          const retentionRate = total > 0 ? Math.round((successes / total) * 100) : 100;

          onFinishSession({
            totalReviewed: total,
            againCount: ratingsCountRef.current.again,
            hardCount: ratingsCountRef.current.hard,
            goodCount: ratingsCountRef.current.good,
            easyCount: ratingsCountRef.current.easy,
            durationMs: Date.now() - sessionStartTimeRef.current,
            retentionRate
          });
        }
      }, 160);
    } catch (error) {
      console.error('Erro ao registrar resposta do flashcard:', error);
      setIsSubmitting(false);
      setActiveButtonFeedback(null);
    }
  }, [currentItem, isSubmitting, isAnswerRevealed, currentIndex, queue, onFinishSession]);

  // Listener de atalhos de teclado (Espaço, 1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir acionamento se o foco estiver em campos de texto
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isAnswerRevealed) {
          handleRevealAnswer();
        }
      } else if (isAnswerRevealed && !isSubmitting) {
        if (e.key === '1') {
          e.preventDefault();
          handleAnswer(Rating.Again);
        } else if (e.key === '2') {
          e.preventDefault();
          handleAnswer(Rating.Hard);
        } else if (e.key === '3') {
          e.preventDefault();
          handleAnswer(Rating.Good);
        } else if (e.key === '4') {
          e.preventDefault();
          handleAnswer(Rating.Easy);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, isSubmitting, handleRevealAnswer, handleAnswer]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
          Sessão Concluída!
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm max-w-md">
          Você revisou todos os cartões programados para esta sessão.
        </p>
        <button
          onClick={onExit}
          className="mt-6 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold uppercase text-xs rounded-2xl hover:scale-105 transition-all shadow-lg cursor-pointer"
        >
          Voltar aos Baralhos
        </button>
      </div>
    );
  }

  const isCloze = currentItem.card.card_type === 'cloze';
  const progressPercent = Math.min(100, Math.round(((currentIndex) / queue.length) * 100));

  return (
    <div className="flex flex-col min-h-[85vh] max-w-4xl mx-auto w-full p-4 select-none">
      {/* HEADER DA SESSÃO */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
            {deckName || 'Revisão Geral'}
          </span>
          {currentItem.card.tags.length > 0 && (
            <div className="flex items-center gap-1.5 hidden sm:flex">
              {currentItem.card.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800/70 px-2 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          <div className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
            <span className="text-zinc-900 dark:text-white font-mono">{currentIndex + 1}</span>
            <span className="text-zinc-400 dark:text-zinc-600 mx-1">/</span>
            <span className="font-mono">{queue.length}</span>
          </div>

          <button
            onClick={onExit}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-bold cursor-pointer"
            title="Sair da Revisão"
          >
            ✕
          </button>
        </div>
      </div>

      {/* BARRA DE PROGRESSO SLIM */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-1.5 rounded-full overflow-hidden my-3">
        <div
          className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ÁREA CENTRAL DO FLASHCARD */}
      <div className="flex-1 flex flex-col justify-center my-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-xl p-8 sm:p-12 relative flex flex-col min-h-[380px] transition-all">
          {/* LADO DA FRENTE (PERGUNTA / TEXTO COM CLOZE) */}
          <div className="flex-1 flex flex-col justify-center text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 block">
              {isCloze ? 'Complete a Lacuna' : 'Pergunta'}
            </span>

            <div className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-relaxed max-w-2xl mx-auto">
              {isCloze ? (
                <ClozeRenderer
                  text={currentItem.card.cloze_text || currentItem.card.front}
                  isAnswerRevealed={isAnswerRevealed}
                  clozeIndex={1}
                />
              ) : (
                currentItem.card.front
              )}
            </div>
          </div>

          {/* DIVISOR QUANDO REVELADO */}
          {isAnswerRevealed && !isCloze && (
            <div className="my-6 border-t border-dashed border-zinc-200 dark:border-zinc-800 relative animate-in fade-in">
              <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white dark:bg-zinc-900 px-3 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                Resposta
              </span>
            </div>
          )}

          {/* LADO DO VERSO (RESPOSTA) */}
          {isAnswerRevealed && !isCloze && (
            <div className="flex-1 flex flex-col justify-center text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed max-w-2xl mx-auto">
                {currentItem.card.back}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ÁREA INFERIOR DE CONTROLES */}
      <div className="pt-2 pb-6">
        {!isAnswerRevealed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleRevealAnswer}
              className="w-full max-w-md py-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold uppercase text-xs tracking-wider shadow-xl shadow-zinc-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Mostrar Resposta</span>
              <kbd className="px-2 py-0.5 text-[10px] bg-zinc-800 dark:bg-zinc-200 rounded font-mono font-normal">
                Espaço
              </kbd>
            </button>
            <span className="text-[11px] text-zinc-400">Pressione a tecla Espaço ou clique para ver a resposta</span>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {/* BOTÃO 1 - NOVAMENTE */}
              <button
                type="button"
                onClick={() => handleAnswer(Rating.Again)}
                disabled={isSubmitting}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  activeButtonFeedback === Rating.Again
                    ? 'bg-rose-500 text-white border-transparent scale-95 shadow-lg shadow-rose-500/30'
                    : 'bg-rose-50/80 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/40'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-black uppercase tracking-tight">1. Novamente</span>
                </div>
                <span className="text-[10px] font-mono font-semibold opacity-80">
                  {intervalPreviews?.again.intervalLabel || '< 10 min'}
                </span>
              </button>

              {/* BOTÃO 2 - DIFÍCIL */}
              <button
                type="button"
                onClick={() => handleAnswer(Rating.Hard)}
                disabled={isSubmitting}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  activeButtonFeedback === Rating.Hard
                    ? 'bg-amber-500 text-white border-transparent scale-95 shadow-lg shadow-amber-500/30'
                    : 'bg-amber-50/80 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-900/40'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-black uppercase tracking-tight">2. Difícil</span>
                </div>
                <span className="text-[10px] font-mono font-semibold opacity-80">
                  {intervalPreviews?.hard.intervalLabel || '1 dia'}
                </span>
              </button>

              {/* BOTÃO 3 - BOM */}
              <button
                type="button"
                onClick={() => handleAnswer(Rating.Good)}
                disabled={isSubmitting}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  activeButtonFeedback === Rating.Good
                    ? 'bg-indigo-600 text-white border-transparent scale-95 shadow-lg shadow-indigo-600/30'
                    : 'bg-indigo-50/80 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-900/40'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-black uppercase tracking-tight">3. Bom</span>
                </div>
                <span className="text-[10px] font-mono font-semibold opacity-80">
                  {intervalPreviews?.good.intervalLabel || '3 dias'}
                </span>
              </button>

              {/* BOTÃO 4 - FÁCIL */}
              <button
                type="button"
                onClick={() => handleAnswer(Rating.Easy)}
                disabled={isSubmitting}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  activeButtonFeedback === Rating.Easy
                    ? 'bg-emerald-600 text-white border-transparent scale-95 shadow-lg shadow-emerald-600/30'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-900/40'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-black uppercase tracking-tight">4. Fácil</span>
                </div>
                <span className="text-[10px] font-mono font-semibold opacity-80">
                  {intervalPreviews?.easy.intervalLabel || '7 dias'}
                </span>
              </button>
            </div>

            <div className="text-center text-[10px] text-zinc-400 font-medium">
              Atalhos rápidos: pressione <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">1</kbd>, <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">2</kbd>, <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">3</kbd> ou <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">4</kbd> no teclado
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
