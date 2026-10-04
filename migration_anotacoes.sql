-- ==============================================================================
-- MIGRAÇÃO: TABELAS DE ANOTAÇÕES E PASTAS (MÓDULO DE ANOTAÇÕES)
-- ==============================================================================

-- 1. Tabela de Pastas de Anotações
CREATE TABLE IF NOT EXISTS public.anotacoes_pastas (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Anotações',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.anotacoes_pastas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias pastas de anotações" ON public.anotacoes_pastas;
CREATE POLICY "Usuários gerenciam suas próprias pastas de anotações"
    ON public.anotacoes_pastas
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_anotacoes_pastas_user_id ON public.anotacoes_pastas(user_id);

-- 2. Tabela de Anotações e Resumos
CREATE TABLE IF NOT EXISTS public.anotacoes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES public.anotacoes_pastas(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Sem Título',
    content TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT 'Anotações',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias anotações" ON public.anotacoes;
CREATE POLICY "Usuários gerenciam suas próprias anotações"
    ON public.anotacoes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_anotacoes_user_id ON public.anotacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_anotacoes_folder_id ON public.anotacoes(folder_id);
CREATE INDEX IF NOT EXISTS idx_anotacoes_date ON public.anotacoes(date);

-- 3. Concessão explícita de permissões (Conforme Regras de Segurança do Supabase)
GRANT ALL ON TABLE public.anotacoes_pastas TO authenticated;
GRANT ALL ON TABLE public.anotacoes_pastas TO service_role;
GRANT SELECT ON TABLE public.anotacoes_pastas TO anon;

GRANT ALL ON TABLE public.anotacoes TO authenticated;
GRANT ALL ON TABLE public.anotacoes TO service_role;
GRANT SELECT ON TABLE public.anotacoes TO anon;
