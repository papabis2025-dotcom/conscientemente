-- Migration: Adicionar coluna 'status' na tabela scheduled_studies
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar a coluna status com valor padrao 'planejado'
ALTER TABLE public.scheduled_studies
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planejado';

-- 2. Marcar como 'realizado' todos os registros que ja possuem sessao de estudo correspondente
UPDATE public.scheduled_studies ss
SET status = 'realizado'
WHERE EXISTS (
    SELECT 1 FROM public.study_sessions ses
    WHERE ses.id = ss.id AND ses.user_id = ss.user_id
);
