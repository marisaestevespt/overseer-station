ALTER TABLE public.instances
  ADD COLUMN stats_url TEXT,
  ADD COLUMN stats_key TEXT,
  ADD COLUMN last_stats JSONB,
  ADD COLUMN last_stats_at TIMESTAMPTZ,
  ADD COLUMN setup_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;