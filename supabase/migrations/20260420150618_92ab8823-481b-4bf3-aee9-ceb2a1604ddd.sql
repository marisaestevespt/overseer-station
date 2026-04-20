-- 1. Enum app_role
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Políticas RLS para user_roles
CREATE POLICY "Super admins can view all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage user_roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 5. Trigger que atribui super_admin ao email da Marisa quando criar conta
CREATE OR REPLACE FUNCTION public.assign_super_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'info@marisaesteves.pt' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_super_admin_on_signup();

-- 6. Seed condicional: se o user já existir, atribui já
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'info@marisaesteves.pt'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Reescrever políticas em instances
DROP POLICY IF EXISTS "Authenticated users can view all instances" ON public.instances;
DROP POLICY IF EXISTS "Authenticated users can insert instances" ON public.instances;
DROP POLICY IF EXISTS "Authenticated users can update instances" ON public.instances;
DROP POLICY IF EXISTS "Authenticated users can delete instances" ON public.instances;

CREATE POLICY "Super admins can view instances"
  ON public.instances FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert instances"
  ON public.instances FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update instances"
  ON public.instances FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete instances"
  ON public.instances FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 8. Reescrever políticas em subscriptions
DROP POLICY IF EXISTS "Authenticated users can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete subscriptions" ON public.subscriptions;

CREATE POLICY "Super admins can view subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete subscriptions"
  ON public.subscriptions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 9. Expandir activity_log e reescrever políticas
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- instance_id passa a ser opcional (acções administrativas podem não envolver instância)
ALTER TABLE public.activity_log ALTER COLUMN instance_id DROP NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can view all activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_log;

CREATE POLICY "Super admins can view activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 10. Tabela rate_limits (escrita pelo service role nas edge functions)
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  endpoint text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ip, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (ip, endpoint, window_start DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view rate_limits"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
-- Sem políticas INSERT/UPDATE/DELETE — só service role consegue escrever.