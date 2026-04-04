ALTER TABLE public.instances
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS github_repo text,
  ADD COLUMN IF NOT EXISTS current_version text,
  ADD COLUMN IF NOT EXISTS last_update_check timestamptz;