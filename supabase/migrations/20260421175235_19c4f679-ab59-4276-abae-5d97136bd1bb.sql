
-- 1. Guardar o email actual em admin_settings (idempotente)
INSERT INTO public.admin_settings (key, value)
VALUES ('bootstrap_super_admin_email', '"info@marisaesteves.pt"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Garantir unicidade da chave (caso ainda não exista)
CREATE UNIQUE INDEX IF NOT EXISTS admin_settings_key_unique ON public.admin_settings (key);

-- 2. Substituir a função para ler de admin_settings
CREATE OR REPLACE FUNCTION public.assign_super_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bootstrap_email text;
BEGIN
  SELECT value #>> '{}' INTO bootstrap_email
  FROM public.admin_settings
  WHERE key = 'bootstrap_super_admin_email';

  IF bootstrap_email IS NOT NULL AND NEW.email = bootstrap_email THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
