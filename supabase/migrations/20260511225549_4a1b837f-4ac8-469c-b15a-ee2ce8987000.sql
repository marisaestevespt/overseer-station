
ALTER TABLE public.rectification_requests
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rectification-attachments', 'rectification-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can view rectification attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rectification-attachments'
  AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'support'::app_role])
);

CREATE POLICY "Admins can upload rectification attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rectification-attachments'
  AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
);

CREATE POLICY "Admins can update rectification attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'rectification-attachments'
  AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
);

CREATE POLICY "Admins can delete rectification attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rectification-attachments'
  AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
);
