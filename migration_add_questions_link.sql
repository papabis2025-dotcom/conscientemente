-- ============================================================
-- MIGRATION OBRIGATÓRIA — Executar no SQL Editor do Supabase
-- URL: https://supabase.com/dashboard/project/osxlcwbxlbesxcrzvoyt/sql
-- ============================================================

-- 1. Adiciona questions_link nas duas tabelas (se ainda não existir)
ALTER TABLE scheduled_studies
    ADD COLUMN IF NOT EXISTS questions_link text;

ALTER TABLE study_sessions
    ADD COLUMN IF NOT EXISTS questions_link text;

-- 2. Adiciona activity_type em study_sessions (se ainda não existir)
ALTER TABLE study_sessions
    ADD COLUMN IF NOT EXISTS activity_type text;

-- 3. Confirma que todas as colunas esperadas existem
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('scheduled_studies', 'study_sessions')
  AND column_name IN ('questions_link', 'activity_type')
ORDER BY table_name, column_name;
