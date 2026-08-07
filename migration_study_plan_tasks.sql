-- Migração para tabela de Tarefas do Plano de Estudos (study_plan_tasks)
-- Execute este script no SQL Editor do Supabase: https://supabase.com/dashboard

CREATE TABLE IF NOT EXISTS public.study_plan_tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    topic_id TEXT,
    topic_name TEXT,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    date TEXT NOT NULL,
    concurso_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.study_plan_tasks ENABLE ROW LEVEL SECURITY;

-- Remover política anterior se existir
DROP POLICY IF EXISTS "Users can manage their own study plan tasks" ON public.study_plan_tasks;

-- Criar política RLS à prova de falhas para o usuário autenticado
CREATE POLICY "Users can manage their own study plan tasks" 
    ON public.study_plan_tasks 
    FOR ALL 
    TO authenticated 
    USING ((SELECT auth.uid()) = user_id) 
    WITH CHECK ((SELECT auth.uid()) = user_id);

