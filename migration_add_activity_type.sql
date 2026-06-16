-- Migration: Add activity_type column to study_sessions table
-- Run this in the Supabase SQL Editor at: https://supabase.com/dashboard/project/osxlcwbxlbesxcrzvoyt/sql

ALTER TABLE study_sessions
ADD COLUMN IF NOT EXISTS activity_type text;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN study_sessions.activity_type IS 'Type of study activity: Questões, Leitura, Aula, Simulado, Flashcards, Revisão, etc.';
