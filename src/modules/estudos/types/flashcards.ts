// ==============================================================================
// TIPOS DO SISTEMA NATIVO DE FLASHCARDS (ESTUDOS)
// ==============================================================================

export type FlashcardType = 'basic' | 'reversed' | 'cloze';

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  parent_id?: string | null;
  name: string;
  description?: string;
  color?: string;
  concurso_id?: string | null;
  subject_id?: string | null;
  topic_id?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Campos computados em tempo de execução
  card_count?: number;
  due_count?: number;
  new_count?: number;
  learning_count?: number;
  children?: FlashcardDeck[];
}

export interface Flashcard {
  id: string;
  user_id: string;
  deck_id: string;
  deck_ids?: string[];
  card_type: FlashcardType;
  front: string;
  back: string;
  cloze_text?: string;
  tags: string[];
  concurso_id?: string | null;
  subject_id?: string | null;
  topic_id?: string | null;
  source_type: 'manual' | 'question' | 'summary' | 'ai';
  source_id?: string | null;
  is_suspended: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardSchedulingState {
  card_id: string;
  user_id: string;
  state: State;
  due_at: string; // ISO timestamp
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review_at?: string | null;
  scheduler_version: string;
  updated_at: string;
}

export interface FlashcardReviewLog {
  id: string;
  card_id: string;
  user_id: string;
  rating: Rating;
  previous_state: State;
  new_state: State;
  previous_stability?: number | null;
  new_stability?: number | null;
  previous_difficulty?: number | null;
  new_difficulty?: number | null;
  previous_due_at?: string | null;
  new_due_at: string;
  elapsed_days: number;
  scheduled_days: number;
  response_time_ms: number;
  scheduler_version: string;
  reviewed_at: string;
  created_at: string;
}

export interface FlashcardSettings {
  user_id?: string;
  new_cards_per_day: number;
  max_reviews_per_day: number;
  request_retention: number; // Ex: 0.9 (90%)
  show_next_review_time: boolean;
  enable_keyboard_shortcuts: boolean;
  // Espaçamentos e multiplicadores por classificação:
  again_interval_minutes?: number; // Padrão: 10
  hard_factor?: number; // Padrão: 1.2
  good_factor?: number; // Padrão: 1.0
  easy_bonus?: number; // Padrão: 1.3
  maximum_interval_days?: number; // Padrão: 36500
  created_at?: string;
  updated_at?: string;
}

export interface CardWithState {
  card: Flashcard;
  scheduling: CardSchedulingState;
  deck?: FlashcardDeck;
}

export interface NextIntervalsPreview {
  again: { intervalLabel: string; scheduledDays: number; state: State };
  hard: { intervalLabel: string; scheduledDays: number; state: State };
  good: { intervalLabel: string; scheduledDays: number; state: State };
  easy: { intervalLabel: string; scheduledDays: number; state: State };
}

export interface FlashcardSessionSummary {
  totalReviewed: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  durationMs: number;
  retentionRate: number; // Porcentagem de acertos (hard, good, easy)
}
