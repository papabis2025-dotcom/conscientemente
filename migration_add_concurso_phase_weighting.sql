-- A configuração do curso e as disciplinas são gravadas na mesma linha.
ALTER TABLE public.concursos
  ADD COLUMN IF NOT EXISTS phase_weighting jsonb;

CREATE OR REPLACE FUNCTION public.valid_concurso_phase_weighting(config jsonb, disciplines jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  phase text;
  rule jsonb;
  basis text;
  share numeric;
  total_share numeric := 0;
  participant jsonb;
  participant_count integer;
  units jsonb;
BEGIN
  IF config IS NULL THEN RETURN true; END IF;
  IF COALESCE(config->>'mode', '') NOT IN ('manual', 'phases') THEN RETURN false; END IF;

  IF config->>'mode' = 'phases' THEN
    IF jsonb_typeof(disciplines) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF (SELECT count(*) <> count(DISTINCT subject->>'id') FROM jsonb_array_elements(disciplines) AS subject) THEN
      RETURN false;
    END IF;
  END IF;

  FOREACH phase IN ARRAY ARRAY['objective', 'written', 'oral'] LOOP
    rule := config->'phases'->phase;
    basis := COALESCE(rule->>'basis', '');
    IF jsonb_typeof(rule->'share') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
    share := (rule->>'share')::numeric;
    IF share < 0 OR share > 100 THEN RETURN false; END IF;
    IF basis NOT IN ('equal', 'points') AND NOT (phase = 'objective' AND basis = 'questions') THEN
      RETURN false;
    END IF;
    total_share := total_share + share;
    IF share = 0 OR config->>'mode' = 'manual' THEN CONTINUE; END IF;

    participant_count := 0;
    FOR participant IN SELECT subject FROM jsonb_array_elements(disciplines) AS subject
      WHERE jsonb_typeof(subject->'examPhases'->phase) = 'object'
    LOOP
      participant_count := participant_count + 1;
      IF basis = 'equal' THEN CONTINUE; END IF;
      units := CASE WHEN basis = 'questions' THEN participant->'questionsGoal'
                    ELSE participant->'examPhases'->phase->'points' END;
      IF jsonb_typeof(units) IS DISTINCT FROM 'number' THEN RETURN false; END IF;
      IF units::numeric <= 0 OR (basis = 'questions' AND trunc(units::numeric) <> units::numeric) THEN
        RETURN false;
      END IF;
    END LOOP;
    IF participant_count = 0 THEN RETURN false; END IF;
  END LOOP;

  RETURN config->>'mode' = 'manual' OR abs(total_share - 100) <= 0.000001;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.concursos'::regclass
    AND conname = 'concursos_valid_phase_weighting') THEN
    ALTER TABLE public.concursos ADD CONSTRAINT concursos_valid_phase_weighting
      CHECK (public.valid_concurso_phase_weighting(phase_weighting, subjects::jsonb));
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
