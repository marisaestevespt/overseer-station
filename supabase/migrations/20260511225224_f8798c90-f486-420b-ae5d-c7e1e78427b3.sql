
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TYPE public.rectification_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected', 'on_hold');
CREATE TYPE public.rectification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.rectification_type AS ENUM ('bug', 'feature', 'data_fix', 'config', 'other');

CREATE TABLE public.rectification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID,
  client_name TEXT NOT NULL,
  client_email TEXT,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  type public.rectification_type NOT NULL DEFAULT 'other',
  priority public.rectification_priority NOT NULL DEFAULT 'medium',
  status public.rectification_status NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rectif_instance ON public.rectification_requests(instance_id);
CREATE INDEX idx_rectif_status ON public.rectification_requests(status);
CREATE INDEX idx_rectif_requested_at ON public.rectification_requests(requested_at DESC);

ALTER TABLE public.rectification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view rectification_requests"
ON public.rectification_requests FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'support'::app_role]));

CREATE POLICY "Admins can insert rectification_requests"
ON public.rectification_requests FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "Admins can update rectification_requests"
ON public.rectification_requests FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "Admins can delete rectification_requests"
ON public.rectification_requests FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE TRIGGER update_rectif_updated_at
BEFORE UPDATE ON public.rectification_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
