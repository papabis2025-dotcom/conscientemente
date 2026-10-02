-- ==============================================================================
-- MIGRAÇÃO: SISTEMA NATIVO DE FLASHCARDS (ESTUDOS)
-- ==============================================================================
-- Atende a todas as diretrizes de segurança, políticas de RLS e GRANT explícito
-- para as roles anon, authenticated e service_role do Supabase.
--
-- Separação estrita:
-- 1. flashcard_decks: Baralhos hierárquicos com associação a Disciplina/Assunto
-- 2. flashcard_cards: Conteúdo imutável do cartão (frente, verso, cloze, tags)
-- 3. flashcard_scheduling_state: Estado atual do algoritmo de repetição (FSRS)
-- 4. flashcard_review_logs: Histórico imutável de eventos de revisão (Event Log)
-- 5. flashcard_settings: Preferências individuais de limites e retenção
-- ==============================================================================

-- 1. TABELA DE BARALHOS HIERÁRQUICOS
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    concurso_id TEXT,
    subject_id TEXT,
    topic_id TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE CARTÕES (CONTEÚDO)
CREATE TABLE IF NOT EXISTS public.flashcard_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL DEFAULT 'basic', -- 'basic', 'reversed', 'cloze'
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    cloze_text TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    concurso_id TEXT,
    subject_id TEXT,
    topic_id TEXT,
    source_type TEXT DEFAULT 'manual', -- 'manual', 'question', 'summary', 'ai'
    source_id TEXT,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ESTADO DE AGENDAMENTO (SCHEDULING STATE - FSRS)
CREATE TABLE IF NOT EXISTS public.flashcard_scheduling_state (
    card_id UUID PRIMARY KEY REFERENCES public.flashcard_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state INTEGER NOT NULL DEFAULT 0, -- 0=New, 1=Learning, 2=Review, 3=Relearning
    due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    difficulty DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    last_review_at TIMESTAMPTZ,
    scheduler_version TEXT NOT NULL DEFAULT 'fsrs-4.5',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. HISTÓRICO IMUTÁVEL DE REVISÕES (EVENT LOG AUDITÁVEL)
CREATE TABLE IF NOT EXISTS public.flashcard_review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.flashcard_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL, -- 1=Again, 2=Hard, 3=Good, 4=Easy
    previous_state INTEGER NOT NULL,
    new_state INTEGER NOT NULL,
    previous_stability DOUBLE PRECISION,
    new_stability DOUBLE PRECISION,
    previous_difficulty DOUBLE PRECISION,
    new_difficulty DOUBLE PRECISION,
    previous_due_at TIMESTAMPTZ,
    new_due_at TIMESTAMPTZ NOT NULL,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    scheduler_version TEXT NOT NULL DEFAULT 'fsrs-4.5',
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CONFIGURAÇÕES POR USUÁRIO
CREATE TABLE IF NOT EXISTS public.flashcard_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    new_cards_per_day INTEGER NOT NULL DEFAULT 20,
    max_reviews_per_day INTEGER NOT NULL DEFAULT 200,
    request_retention DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    show_next_review_time BOOLEAN NOT NULL DEFAULT TRUE,
    enable_keyboard_shortcuts BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user ON public.flashcard_decks(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_deck ON public.flashcard_cards(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_subject ON public.flashcard_cards(user_id, subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sched_due ON public.flashcard_scheduling_state(user_id, due_at, state);
CREATE INDEX IF NOT EXISTS idx_flashcard_logs_user_reviewed ON public.flashcard_review_logs(user_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_flashcard_logs_card ON public.flashcard_review_logs(card_id);

-- ------------------------------------------------------------------------------
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_scheduling_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- POLÍTICAS RLS (Segurança estrita por usuário autenticado)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own flashcard decks" ON public.flashcard_decks;
CREATE POLICY "Users can manage their own flashcard decks"
    ON public.flashcard_decks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flashcard cards" ON public.flashcard_cards;
CREATE POLICY "Users can manage their own flashcard cards"
    ON public.flashcard_cards FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flashcard scheduling state" ON public.flashcard_scheduling_state;
CREATE POLICY "Users can manage their own flashcard scheduling state"
    ON public.flashcard_scheduling_state FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flashcard review logs" ON public.flashcard_review_logs;
CREATE POLICY "Users can manage their own flashcard review logs"
    ON public.flashcard_review_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flashcard settings" ON public.flashcard_settings;
CREATE POLICY "Users can manage their own flashcard settings"
    ON public.flashcard_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- PERMISSÕES EXPLÍCITAS (GRANT) - OBRIGATÓRIO PARA A API DO SUPABASE
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.flashcard_decks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_decks TO authenticated;
GRANT ALL ON public.flashcard_decks TO service_role;

GRANT SELECT ON public.flashcard_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_cards TO authenticated;
GRANT ALL ON public.flashcard_cards TO service_role;

GRANT SELECT ON public.flashcard_scheduling_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_scheduling_state TO authenticated;
GRANT ALL ON public.flashcard_scheduling_state TO service_role;

GRANT SELECT ON public.flashcard_review_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_review_logs TO authenticated;
GRANT ALL ON public.flashcard_review_logs TO service_role;

GRANT SELECT ON public.flashcard_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_settings TO authenticated;
GRANT ALL ON public.flashcard_settings TO service_role;
