
-- Create email_settings table
CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'Lirah',
  contact_email text NOT NULL DEFAULT 'suporte@lirah.pt',
  phone text,
  address text,
  business_hours text DEFAULT 'Seg-Sex, 9h-18h',
  website text DEFAULT 'https://lirah.pt',
  logo_url text,
  instagram_url text,
  linkedin_url text,
  facebook_url text,
  twitter_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email settings"
  ON public.email_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update email settings"
  ON public.email_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert email settings"
  ON public.email_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default row
INSERT INTO public.email_settings (business_name, contact_email) VALUES ('Lirah', 'suporte@lirah.pt');

-- Create storage bucket for email assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view email assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'email-assets');
CREATE POLICY "Authenticated users can upload email assets"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-assets');
CREATE POLICY "Authenticated users can update email assets"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'email-assets');
CREATE POLICY "Authenticated users can delete email assets"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'email-assets');
