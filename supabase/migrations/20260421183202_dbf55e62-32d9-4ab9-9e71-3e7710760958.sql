UPDATE public.email_settings
SET business_name = 'Lyrata®', updated_at = now()
WHERE business_name = 'Lyrata';

ALTER TABLE public.email_settings
  ALTER COLUMN business_name SET DEFAULT 'Lyrata®';