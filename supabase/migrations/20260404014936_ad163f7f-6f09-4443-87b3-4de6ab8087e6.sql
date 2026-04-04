CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
ON public.admin_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert settings"
ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
ON public.admin_settings FOR UPDATE TO authenticated USING (true);

-- Seed default subscription plans
INSERT INTO public.admin_settings (key, value) VALUES
('subscription_plans', '[
  {"name": "Basic", "price": 49, "features": ["Até 50 clientes", "1 utilizador", "Módulos base"]},
  {"name": "Pro", "price": 99, "features": ["Até 200 clientes", "3 utilizadores", "Todos os módulos", "Relatórios avançados"]},
  {"name": "Enterprise", "price": 199, "features": ["Clientes ilimitados", "Utilizadores ilimitados", "Todos os módulos", "API access", "Suporte prioritário"]}
]'::jsonb),
('webhook_url', '"https://api.stripe.com/v1/webhooks"'::jsonb),
('github_token', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;