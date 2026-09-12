-- Migration: Add education_level column to concursos table
-- Run this in the Supabase SQL Editor at: https://supabase.com/dashboard/project/osxlcwbxlbesxcrzvoyt/sql

ALTER TABLE concursos
ADD COLUMN IF NOT EXISTS education_level text;

COMMENT ON COLUMN concursos.education_level IS 'Nível de escolaridade exigido: Fundamental, Médio, Superior, Pós-graduação, etc.';
