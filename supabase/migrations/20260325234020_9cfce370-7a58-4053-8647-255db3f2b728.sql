
-- Enums
CREATE TYPE public.instance_status AS ENUM ('active', 'suspended', 'cancelled', 'setup');
CREATE TYPE public.health_status AS ENUM ('ok', 'error', 'unknown');
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

-- Instances table
CREATE TABLE public.instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  supabase_project_ref TEXT,
  instance_url TEXT,
  health_check_url TEXT,
  status public.instance_status NOT NULL DEFAULT 'setup',
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status public.health_status NOT NULL DEFAULT 'unknown',
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  first_login_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all instances"
  ON public.instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert instances"
  ON public.instances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update instances"
  ON public.instances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete instances"
  ON public.instances FOR DELETE TO authenticated USING (true);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'standard',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  monthly_amount DECIMAL NOT NULL DEFAULT 0,
  trial_ends_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete subscriptions"
  ON public.subscriptions FOR DELETE TO authenticated USING (true);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  performed_by TEXT NOT NULL DEFAULT 'system'
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all activity logs"
  ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_instances_status ON public.instances(status);
CREATE INDEX idx_instances_health_status ON public.instances(health_status);
CREATE INDEX idx_subscriptions_instance_id ON public.subscriptions(instance_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_activity_log_instance_id ON public.activity_log(instance_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
