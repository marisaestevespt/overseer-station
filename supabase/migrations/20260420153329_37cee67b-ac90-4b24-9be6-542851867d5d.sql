-- 2. Tabela de convites pendentes (guarda role até user confirmar conta)
CREATE TABLE IF NOT EXISTS public.pending_user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage pending_user_invites"
  ON public.pending_user_invites FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. Função auxiliar: tem qualquer um destes roles?
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 4. Trigger: quando user confirma email, atribui role pendente
CREATE OR REPLACE FUNCTION public.assign_pending_role_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_role public.app_role;
BEGIN
  -- Só age quando email_confirmed_at acabou de ser preenchido
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN

    SELECT role INTO pending_role
    FROM public.pending_user_invites
    WHERE email = NEW.email;

    IF pending_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, pending_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      DELETE FROM public.pending_user_invites WHERE email = NEW.email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_pending_role_on_confirm();

-- Também tratar caso em que o user é criado já confirmado (auto-confirm)
CREATE OR REPLACE FUNCTION public.assign_pending_role_on_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_role public.app_role;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    SELECT role INTO pending_role
    FROM public.pending_user_invites
    WHERE email = NEW.email;

    IF pending_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, pending_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      DELETE FROM public.pending_user_invites WHERE email = NEW.email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_pending_role_on_create();

-- 5. Reescrever políticas RLS
-- INSTANCES
DROP POLICY IF EXISTS "Super admins can view instances" ON public.instances;
DROP POLICY IF EXISTS "Super admins can insert instances" ON public.instances;
DROP POLICY IF EXISTS "Super admins can update instances" ON public.instances;
DROP POLICY IF EXISTS "Super admins can delete instances" ON public.instances;

CREATE POLICY "Staff can view instances" ON public.instances FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[]));
CREATE POLICY "Admins can insert instances" ON public.instances FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));
CREATE POLICY "Admins can update instances" ON public.instances FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));
CREATE POLICY "Admins can delete instances" ON public.instances FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Super admins can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can delete subscriptions" ON public.subscriptions;

CREATE POLICY "Staff can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[]));
CREATE POLICY "Admins can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));
CREATE POLICY "Admins can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));
CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));

-- ACTIVITY LOG
DROP POLICY IF EXISTS "Super admins can view activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Super admins can insert activity_log" ON public.activity_log;

CREATE POLICY "Staff can view activity_log" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[]));
CREATE POLICY "Admins can insert activity_log" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));

-- ADMIN_SETTINGS
DROP POLICY IF EXISTS "Super admins can view admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Super admins can insert admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Super admins can update admin_settings" ON public.admin_settings;

CREATE POLICY "Staff can view admin_settings" ON public.admin_settings FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[]));
CREATE POLICY "Super admins can insert admin_settings" ON public.admin_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update admin_settings" ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete admin_settings" ON public.admin_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- EMAIL_SETTINGS
DROP POLICY IF EXISTS "Super admins can view email_settings" ON public.email_settings;
DROP POLICY IF EXISTS "Super admins can insert email_settings" ON public.email_settings;
DROP POLICY IF EXISTS "Super admins can update email_settings" ON public.email_settings;

CREATE POLICY "Staff can view email_settings" ON public.email_settings FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[]));
CREATE POLICY "Super admins can insert email_settings" ON public.email_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update email_settings" ON public.email_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete email_settings" ON public.email_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Super admins can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage user_roles" ON public.user_roles;

CREATE POLICY "Staff can view user_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[])
  );
CREATE POLICY "Super admins manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RATE_LIMITS
DROP POLICY IF EXISTS "Super admins can view rate_limits" ON public.rate_limits;
CREATE POLICY "Staff can view rate_limits" ON public.rate_limits FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','support']::public.app_role[]));