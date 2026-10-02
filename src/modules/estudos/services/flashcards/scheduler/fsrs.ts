// ==============================================================================
// SCHEDULER FSRS (FREE SPACED REPETITION SCHEDULER - v4.5)
// ==============================================================================
// Implementação pura, determinística e desacoplada do algoritmo moderno de
// repetição espaçada FSRS (adotado pelo Anki 23.10+).
//
// Separado totalmente de UI, estado visual e banco de dados.
// ==============================================================================

import { State, Rating, CardSchedulingState, FlashcardReviewLog, NextIntervalsPreview } from '../../../types/flashcards';

export const SCHEDULER_VERSION = 'fsrs-4.5';

// Pesos padrão calibrados para FSRS v4.5
export const DEFAULT_FSRS_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, // S0 para Again, Hard, Good, Easy
  7.1949, 0.5345, // Parâmetros de Dificuldade
  1.4604, 0.0046, 1.5457, 0.1192, 1.0192, // Estabilidade em caso de Sucesso
  1.9395, 0.11, 0.29605, 0.22698, // Estabilidade em caso de Esquecimento (Lapse)
  0.2315, 2.9498 // Parâmetros de Decaimento de Retenção
];

export interface FSRSParameters {
  requestRetention: number; // Padrão: 0.9 (90%)
  maximumInterval: number; // Padrão: 36500 (100 anos)
  w: number[];
}

export const defaultParameters: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  w: DEFAULT_FSRS_WEIGHTS,
};

export class FlashcardScheduler {
  private params: FSRSParameters;

  constructor(customParams?: Partial<FSRSParameters>) {
    this.params = {
      ...defaultParameters,
      ...customParams,
      w: customParams?.w || DEFAULT_FSRS_WEIGHTS,
    };
  }

  /**
   * Cria o estado inicial neutro de agendamento para um novo cartão (State.New)
   */
  public getInitialSchedulingState(cardId: string, userId: string): CardSchedulingState {
    const nowIso = new Date().toISOString();
    return {
      card_id: cardId,
      user_id: userId,
      state: State.New,
      due_at: nowIso,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      last_review_at: null,
      scheduler_version: SCHEDULER_VERSION,
      updated_at: nowIso,
    };
  }

  /**
   * Calcula o próximo intervalo em dias a partir da estabilidade e retenção desejada
   */
  public nextInterval(stability: number, desiredRetention?: number): number {
    const r = desiredRetention || this.params.requestRetention;
    if (stability <= 0) return 0;
    // Fórmula FSRS: I = S * (r^(-1/FACTOR) - 1) / (0.9^(-1/FACTOR) - 1)
    // Simplificada com fator de decaimento FSRS:
    const interval = (stability / 19) * (Math.pow(r, -1) - 1);
    const clamped = Math.max(1, Math.round(interval));
    return Math.min(clamped, this.params.maximumInterval);
  }

  /**
   * Dificuldade inicial para um novo cartão
   */
  private initDifficulty(rating: Rating): number {
    const w = this.params.w;
    // D0(G) = w[4] - (G - 3) * w[5]
    const d0 = w[4] - (rating - 3) * w[5];
    return Math.min(Math.max(Number(d0.toFixed(2)), 1), 10);
  }

  /**
   * Estabilidade inicial para um novo cartão
   */
  private initStability(rating: Rating): number {
    const w = this.params.w;
    return Math.max(Number(w[rating - 1].toFixed(2)), 0.1);
  }

  /**
   * Atualização de dificuldade após repetição
   */
  private nextDifficulty(currentD: number, rating: Rating): number {
    const w = this.params.w;
    const deltaD = -w[5] * (rating - 3);
    const nextD = w[6] * currentD + (1 - w[6]) * (w[4] + deltaD);
    return Math.min(Math.max(Number(nextD.toFixed(2)), 1), 10);
  }

  /**
   * Retrievability (Probabilidade de Recordação)
   */
  public retrievability(elapsedDays: number, stability: number): number {
    if (stability <= 0) return 0;
    return Math.pow(1 + elapsedDays / (9 * stability), -1);
  }

  /**
   * Próxima estabilidade após resposta correta (Rating: Hard, Good ou Easy)
   */
  private nextStabilitySuccess(d: number, s: number, r: number, rating: Rating): number {
    const w = this.params.w;
    const hardPenalty = rating === Rating.Hard ? w[15] : 1;
    const easyBonus = rating === Rating.Easy ? w[16] : 1;
    const newS = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hardPenalty * easyBonus);
    return Math.max(Number(newS.toFixed(2)), 0.1);
  }

  /**
   * Próxima estabilidade após esquecimento (Rating: Again)
   */
  private nextStabilityFailure(d: number, s: number, r: number): number {
    const w = this.params.w;
    const newS = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
    return Math.max(Number(newS.toFixed(2)), 0.1);
  }

  /**
   * Executa a transição do FSRS e retorna o novo SchedulingState e os dados para o ReviewLog imutável
   */
  public answerCard(
    current: CardSchedulingState,
    rating: Rating,
    reviewDurationMs: number = 0,
    reviewDate: Date = new Date(),
    customRetention?: number
  ): { nextScheduling: CardSchedulingState; logData: Omit<FlashcardReviewLog, 'id' | 'created_at'> } {
    const nowIso = reviewDate.toISOString();
    const lastRev = current.last_review_at ? new Date(current.last_review_at) : null;
    const elapsedDays = lastRev ? Math.max(0, Math.floor((reviewDate.getTime() - lastRev.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    let nextState: State;
    let nextStability: number;
    let nextDifficulty: number;
    let nextScheduledDays: number;
    let nextDueAt: Date;
    let newLapses = current.lapses;

    if (current.state === State.New) {
      nextDifficulty = this.initDifficulty(rating);
      nextStability = this.initStability(rating);

      if (rating === Rating.Again) {
        nextState = State.Learning;
        nextScheduledDays = 0; // Menos de 1 dia (ex: 5 minutos)
        nextDueAt = new Date(reviewDate.getTime() + 5 * 60 * 1000);
      } else if (rating === Rating.Hard) {
        nextState = State.Learning;
        nextScheduledDays = 0;
        nextDueAt = new Date(reviewDate.getTime() + 15 * 60 * 1000);
      } else if (rating === Rating.Good) {
        nextState = State.Review;
        nextScheduledDays = Math.max(1, Math.round(nextStability));
        nextDueAt = new Date(reviewDate.getTime() + nextScheduledDays * 24 * 60 * 60 * 1000);
      } else { // Rating.Easy
        nextState = State.Review;
        nextScheduledDays = Math.max(3, Math.round(nextStability * 1.5));
        nextDueAt = new Date(reviewDate.getTime() + nextScheduledDays * 24 * 60 * 60 * 1000);
      }
    } else if (current.state === State.Learning || current.state === State.Relearning) {
      nextDifficulty = this.nextDifficulty(current.difficulty, rating);

      if (rating === Rating.Again) {
        nextState = current.state;
        nextStability = Math.max(0.1, current.stability * 0.8);
        nextScheduledDays = 0;
        nextDueAt = new Date(reviewDate.getTime() + 5 * 60 * 1000); // 5 min
      } else if (rating === Rating.Hard) {
        nextState = current.state;
        nextStability = Math.max(0.2, current.stability * 0.9);
        nextScheduledDays = 0;
        nextDueAt = new Date(reviewDate.getTime() + 12 * 60 * 1000); // 12 min
      } else if (rating === Rating.Good) {
        nextState = State.Review;
        nextStability = Math.max(1, current.stability * 1.2);
        nextScheduledDays = Math.max(1, Math.round(nextStability));
        nextDueAt = new Date(reviewDate.getTime() + nextScheduledDays * 24 * 60 * 60 * 1000);
      } else { // Easy
        nextState = State.Review;
        nextStability = Math.max(2, current.stability * 1.6);
        nextScheduledDays = Math.max(3, Math.round(nextStability));
        nextDueAt = new Date(reviewDate.getTime() + nextScheduledDays * 24 * 60 * 60 * 1000);
      }
    } else { // State.Review
      const r = this.retrievability(elapsedDays, current.stability);
      nextDifficulty = this.nextDifficulty(current.difficulty, rating);

      if (rating === Rating.Again) {
        nextState = State.Relearning;
        newLapses += 1;
        nextStability = this.nextStabilityFailure(nextDifficulty, current.stability, r);
        nextScheduledDays = 0;
        nextDueAt = new Date(reviewDate.getTime() + 10 * 60 * 1000); // 10 min
      } else {
        nextState = State.Review;
        nextStability = this.nextStabilitySuccess(nextDifficulty, current.stability, r, rating);
        nextScheduledDays = this.nextInterval(nextStability, customRetention);
        nextDueAt = new Date(reviewDate.getTime() + nextScheduledDays * 24 * 60 * 60 * 1000);
      }
    }

    const nextScheduling: CardSchedulingState = {
      card_id: current.card_id,
      user_id: current.user_id,
      state: nextState,
      due_at: nextDueAt.toISOString(),
      stability: nextStability,
      difficulty: nextDifficulty,
      elapsed_days: elapsedDays,
      scheduled_days: nextScheduledDays,
      reps: current.reps + 1,
      lapses: newLapses,
      last_review_at: nowIso,
      scheduler_version: SCHEDULER_VERSION,
      updated_at: nowIso,
    };

    const logData: Omit<FlashcardReviewLog, 'id' | 'created_at'> = {
      card_id: current.card_id,
      user_id: current.user_id,
      rating,
      previous_state: current.state,
      new_state: nextState,
      previous_stability: current.stability,
      new_stability: nextStability,
      previous_difficulty: current.difficulty,
      new_difficulty: nextDifficulty,
      previous_due_at: current.due_at,
      new_due_at: nextDueAt.toISOString(),
      elapsed_days: elapsedDays,
      scheduled_days: nextScheduledDays,
      response_time_ms: reviewDurationMs,
      scheduler_version: SCHEDULER_VERSION,
      reviewed_at: nowIso,
    };

    return { nextScheduling, logData };
  }

  /**
   * Previsão dos 4 intervalos formatados para exibição nos botões da tela de revisão
   */
  public getNextIntervalPreviews(current: CardSchedulingState, now: Date = new Date(), customRetention?: number): NextIntervalsPreview {
    const againRes = this.answerCard(current, Rating.Again, 0, now, customRetention);
    const hardRes = this.answerCard(current, Rating.Hard, 0, now, customRetention);
    const goodRes = this.answerCard(current, Rating.Good, 0, now, customRetention);
    const easyRes = this.answerCard(current, Rating.Easy, 0, now, customRetention);

    return {
      again: {
        intervalLabel: this.formatIntervalLabel(againRes.nextScheduling),
        scheduledDays: againRes.nextScheduling.scheduled_days,
        state: againRes.nextScheduling.state
      },
      hard: {
        intervalLabel: this.formatIntervalLabel(hardRes.nextScheduling),
        scheduledDays: hardRes.nextScheduling.scheduled_days,
        state: hardRes.nextScheduling.state
      },
      good: {
        intervalLabel: this.formatIntervalLabel(goodRes.nextScheduling),
        scheduledDays: goodRes.nextScheduling.scheduled_days,
        state: goodRes.nextScheduling.state
      },
      easy: {
        intervalLabel: this.formatIntervalLabel(easyRes.nextScheduling),
        scheduledDays: easyRes.nextScheduling.scheduled_days,
        state: easyRes.nextScheduling.state
      }
    };
  }

  private formatIntervalLabel(scheduling: CardSchedulingState): string {
    if (scheduling.scheduled_days === 0) {
      return '< 10 min';
    }
    const days = scheduling.scheduled_days;
    if (days === 1) return '1 dia';
    if (days < 30) return `${days} dias`;
    const months = Math.round(days / 30);
    if (months === 1) return '1 mês';
    if (months < 12) return `${months} meses`;
    const years = (days / 365).toFixed(1);
    return `${years} anos`;
  }
}

export const defaultScheduler = new FlashcardScheduler();
