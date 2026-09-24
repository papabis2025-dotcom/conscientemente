-- ==============================================================================
-- Migração de Permissões Explícitas (Supabase API de Dados / PostgREST)
-- ==============================================================================
-- Adequação à nova política do Supabase (vigente a partir de 30 de outubro):
-- Novas tabelas e migrações no schema public exigem GRANT explícito para que a
-- API de Dados (PostgREST, supabase-js, etc.) possa acessá-las.
--
-- Execute este script no SQL Editor do Supabase se desejar garantir permissões
-- explícitas em todas as tabelas atuais e configurar os privilégios padrão
-- para tabelas futuras criadas pelo seu usuário/role.
-- ==============================================================================

-- 1. Permissões para todas as tabelas existentes no schema public
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 2. Permissões para todas as sequências (auto-increment / IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 3. Configurar privilégios padrão para QUALQUER tabela futura criada neste banco
-- Isso garante que futuras tabelas criadas no schema public já nasçam com as permissões corretas
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- Confirmação
SELECT 'Permissões e privilégios padrão configurados com sucesso!' AS status;
