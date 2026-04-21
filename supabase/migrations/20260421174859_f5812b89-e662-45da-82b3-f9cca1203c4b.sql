
-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_instance_created ON public.activity_log (instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON public.activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits (ip, endpoint, window_start DESC);

-- Função de retenção (apaga registos antigos para evitar crescimento indefinido)
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_log WHERE created_at < now() - interval '180 days';
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '7 days';
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_records() TO service_role;
