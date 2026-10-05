-- Cota fixa por usuário para proteger o custo da Edge Function Gemini.
-- Uma única linha por usuário torna o consumo atômico via INSERT ... ON CONFLICT.
CREATE TABLE IF NOT EXISTS public.gemini_rate_limits (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.gemini_rate_limits IS
    'Contadores de cota da Edge Function Gemini; sem acesso direto pelos clientes.';

ALTER TABLE public.gemini_rate_limits ENABLE ROW LEVEL SECURITY;

-- Mesmo com privilégios SELECT explícitos, clientes não enxergam linhas.
-- Toda mutação ocorre exclusivamente pela função SECURITY DEFINER abaixo.
DROP POLICY IF EXISTS "gemini_rate_limits_no_direct_client_access"
    ON public.gemini_rate_limits;
CREATE POLICY "gemini_rate_limits_no_direct_client_access"
    ON public.gemini_rate_limits
    FOR ALL
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

REVOKE ALL ON TABLE public.gemini_rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.gemini_rate_limits FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.gemini_rate_limits TO anon;
GRANT SELECT ON TABLE public.gemini_rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gemini_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_gemini_quota()
RETURNS TABLE (
    allowed boolean,
    remaining integer,
    reset_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    quota_user_id uuid := (SELECT auth.uid());
    quota_now timestamptz := clock_timestamp();
    quota_window constant interval := interval '1 hour';
    quota_limit constant integer := 30;
    current_count integer;
    current_window_started_at timestamptz;
BEGIN
    IF quota_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Authentication required';
    END IF;

    INSERT INTO public.gemini_rate_limits AS quota (
        user_id,
        window_started_at,
        request_count,
        updated_at
    )
    VALUES (
        quota_user_id,
        quota_now,
        1,
        quota_now
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        window_started_at = CASE
            WHEN quota.window_started_at <= quota_now - quota_window THEN quota_now
            ELSE quota.window_started_at
        END,
        request_count = CASE
            WHEN quota.window_started_at <= quota_now - quota_window THEN 1
            ELSE LEAST(quota.request_count + 1, quota_limit + 1)
        END,
        updated_at = quota_now
    RETURNING quota.request_count, quota.window_started_at
    INTO current_count, current_window_started_at;

    RETURN QUERY
    SELECT
        current_count <= quota_limit,
        GREATEST(quota_limit - current_count, 0),
        current_window_started_at + quota_window;
END;
$function$;

COMMENT ON FUNCTION public.consume_gemini_quota() IS
    'Consome atomicamente uma das 30 chamadas Gemini permitidas por usuário a cada hora.';

REVOKE ALL ON FUNCTION public.consume_gemini_quota() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_gemini_quota() FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_gemini_quota() TO anon;
GRANT EXECUTE ON FUNCTION public.consume_gemini_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_gemini_quota() TO service_role;
