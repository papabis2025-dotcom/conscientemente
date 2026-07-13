-- Migração para tabelas de Hábitos (HabitosHub)
-- Execute este script no SQL Editor do Supabase

-- Tabela de Hábitos
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Histórico (Conclusões)
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(habit_id, logged_date)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas (Policies) para habits
CREATE POLICY "Users can manage their own habits" 
    ON public.habits 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Políticas (Policies) para habit_logs
CREATE POLICY "Users can manage their own habit logs" 
    ON public.habit_logs 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Adicionar campo image_url na tabela concursos, se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='concursos' AND column_name='image_url') THEN 
        ALTER TABLE public.concursos ADD COLUMN image_url TEXT;
    END IF; 
END $$;
