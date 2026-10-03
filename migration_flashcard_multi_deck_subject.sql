-- ==============================================================================
-- MIGRAÇÃO: SUPORTE A MÚLTIPLOS BARALHOS E MÚLTIPLAS DISCIPLINAS POR FLASHCARD
-- ==============================================================================
-- Permite que um cartão seja associado a múltiplos baralhos (deck_ids)
-- e a múltiplas disciplinas (subject_ids) / tópicos (topic_ids).
-- Mantém deck_id e subject_id legados como referências primárias para compatibilidade.
-- ==============================================================================

ALTER TABLE public.flashcard_cards
  ADD COLUMN IF NOT EXISTS deck_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subject_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS topic_ids TEXT[] NOT NULL DEFAULT '{}';

-- Popular dados existentes para garantir integridade
UPDATE public.flashcard_cards
SET deck_ids = ARRAY[deck_id::text]
WHERE (deck_ids IS NULL OR cardinality(deck_ids) = 0) AND deck_id IS NOT NULL;

UPDATE public.flashcard_cards
SET subject_ids = ARRAY[subject_id::text]
WHERE (subject_ids IS NULL OR cardinality(subject_ids) = 0) AND subject_id IS NOT NULL;

-- Índices GIN para busca ultra-rápida por baralho e por disciplina em arrays
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_deck_ids ON public.flashcard_cards USING GIN (deck_ids);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_subject_ids ON public.flashcard_cards USING GIN (subject_ids);

-- Permissões explícitas (GRANT) para todas as roles
GRANT SELECT ON public.flashcard_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_cards TO authenticated;
GRANT ALL ON public.flashcard_cards TO service_role;
