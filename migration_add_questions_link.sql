-- Executar estes comandos no editor de SQL do painel do Supabase
-- URL: https://supabase.com/dashboard/project/osxlcwbxlbesxcrzvoyt/sql

-- Adiciona a coluna questions_link na tabela scheduled_studies
ALTER TABLE scheduled_studies ADD COLUMN IF NOT EXISTS questions_link text;

-- Adiciona a coluna questions_link na tabela study_sessions
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS questions_link text;

-- Comentários descritivos das colunas
COMMENT ON COLUMN scheduled_studies.questions_link IS 'Links serializados em JSON para cadernos de questões associados';
COMMENT ON COLUMN study_sessions.questions_link IS 'Links serializados em JSON para cadernos de questões da sessão realizada';
