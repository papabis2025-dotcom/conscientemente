-- ==============================================================================
-- OTIMIZAÇÃO DE LOGS DO SUPABASE (COMPATÍVEL COM O SQL EDITOR DO SUPABASE)
-- ==============================================================================
-- O SQL Editor do Supabase executa scripts dentro de um bloco transacional implícito.
-- Por isso, comandos 'ALTER SYSTEM' são bloqueados pelo Postgres com o erro 25001.
-- A forma correta e nativa de aplicar configurações no Supabase via SQL é através
-- de 'ALTER DATABASE' e 'ALTER ROLE', que rodam perfeitamente no SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. APLICAR CONFIGURAÇÕES NO NÍVEL DE BANCO DE DADOS (DATABASE "postgres")
-- Afeta todas as conexões criadas para a sua aplicação
-- ------------------------------------------------------------------------------

-- a) Desativa o log de cada SELECT/INSERT/UPDATE bruto (maior economia de bytes)
ALTER DATABASE "postgres" SET log_statement = 'none';

-- b) Loga apenas queries que demorarem mais de 2 segundos (2000 ms)
ALTER DATABASE "postgres" SET log_min_duration_statement = '2000';

-- c) Desativa log de criação de arquivos temporários de ordenação e memória
ALTER DATABASE "postgres" SET log_temp_files = '-1';

-- d) Desativa aviso de espera por locks comuns
ALTER DATABASE "postgres" SET log_lock_waits = 'off';

-- e) Nível mínimo de criticidade de mensagens internas: 'warning'
ALTER DATABASE "postgres" SET log_min_messages = 'warning';

-- ------------------------------------------------------------------------------
-- 2. APLICAR DIRETAMENTE NAS ROLES DA API (PostgREST / Supabase Client)
-- Garante que requisições vindas do front-end (usuários anônimos e autenticados)
-- e do backend executem com log mínimo
-- ------------------------------------------------------------------------------

ALTER ROLE "anon" SET log_statement = 'none';
ALTER ROLE "anon" SET log_min_duration_statement = '2000';

ALTER ROLE "authenticated" SET log_statement = 'none';
ALTER ROLE "authenticated" SET log_min_duration_statement = '2000';

ALTER ROLE "service_role" SET log_statement = 'none';
ALTER ROLE "service_role" SET log_min_duration_statement = '2000';

ALTER ROLE "postgres" SET log_statement = 'none';
ALTER ROLE "postgres" SET log_min_duration_statement = '2000';

-- ------------------------------------------------------------------------------
-- 3. VERIFICAR SE O PGAUDIT ESTÁ INSTALADO / ATIVO
-- Se o resultado for vazio, o pgAudit NÃO está instalado (situação ideal para economia)
-- ------------------------------------------------------------------------------
SELECT 
    extname, 
    extversion 
FROM pg_extension 
WHERE extname = 'pgaudit';

-- ------------------------------------------------------------------------------
-- 4. IDENTIFICAR SE HÁ FUNÇÕES COM 'RAISE NOTICE' OU 'RAISE LOG' NO SCHEMA PUBLIC
-- ------------------------------------------------------------------------------
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN p.prosrc ILIKE '%RAISE NOTICE%' THEN 'Contém RAISE NOTICE'
        WHEN p.prosrc ILIKE '%RAISE LOG%' THEN 'Contém RAISE LOG'
        ELSE 'Outro'
    END AS tipo_aviso
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.prosrc ILIKE '%RAISE NOTICE%' OR p.prosrc ILIKE '%RAISE LOG%');

-- ------------------------------------------------------------------------------
-- 5. CONFIRMAÇÃO DAS CONFIGURAÇÕES ATIVAS NAS ROLES
-- ------------------------------------------------------------------------------
SELECT 
    rolname, 
    rolconfig 
FROM pg_roles 
WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role');
