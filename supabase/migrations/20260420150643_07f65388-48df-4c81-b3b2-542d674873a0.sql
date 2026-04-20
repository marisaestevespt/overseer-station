-- admin_settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.admin_settings;

CREATE POLICY "Super admins can view admin_settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert admin_settings"
  ON public.admin_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update admin_settings"
  ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- email_settings
DROP POLICY IF EXISTS "Authenticated users can view email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Authenticated users can insert email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Authenticated users can update email settings" ON public.email_settings;

CREATE POLICY "Super admins can view email_settings"
  ON public.email_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert email_settings"
  ON public.email_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update email_settings"
  ON public.email_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Storage: limitar listagem de email-assets a super admins (URLs continuam públicas para leitura directa)
DROP POLICY IF EXISTS "Public can view email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete email-assets" ON storage.objects;

CREATE POLICY "Super admins can list email-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can upload email-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update email-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete email-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'super_admin'));