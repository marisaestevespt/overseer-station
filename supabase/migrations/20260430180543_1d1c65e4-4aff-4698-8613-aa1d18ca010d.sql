-- Add subdomain and DNS/SSL flags to instances
ALTER TABLE public.instances
  ADD COLUMN subdomain TEXT,
  ADD COLUMN dns_configured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ssl_active BOOLEAN NOT NULL DEFAULT false;

-- Format check (lowercase alphanumeric + hyphen, 1-32 chars, no leading/trailing hyphen)
ALTER TABLE public.instances
  ADD CONSTRAINT instances_subdomain_format
  CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$');

-- Unique index (case-insensitive, but values are already lowercase per check)
CREATE UNIQUE INDEX instances_subdomain_unique_idx
  ON public.instances (lower(subdomain))
  WHERE subdomain IS NOT NULL;

-- Backfill from existing instance_url matching https://X.lyrata.pt
UPDATE public.instances
SET subdomain = lower(substring(instance_url FROM 'https?://([a-z0-9-]+)\.lyrata\.pt'))
WHERE instance_url ~* '^https?://[a-z0-9-]+\.lyrata\.pt/?$'
  AND subdomain IS NULL;