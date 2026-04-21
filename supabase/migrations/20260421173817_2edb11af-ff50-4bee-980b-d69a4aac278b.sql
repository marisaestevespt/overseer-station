-- Tornar bucket email-assets privado (bloqueia listagem anónima do conteúdo)
UPDATE storage.buckets SET public = false WHERE id = 'email-assets';

-- Permitir leitura pública dos objetos (para emails continuarem a renderizar imagens)
DROP POLICY IF EXISTS "Public read access to email-assets" ON storage.objects;
CREATE POLICY "Public read access to email-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Apenas super_admin pode fazer upload
DROP POLICY IF EXISTS "Super admins can upload email-assets" ON storage.objects;
CREATE POLICY "Super admins can upload email-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'super_admin')
);

-- Apenas super_admin pode atualizar
DROP POLICY IF EXISTS "Super admins can update email-assets" ON storage.objects;
CREATE POLICY "Super admins can update email-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'super_admin')
);

-- Apenas super_admin pode apagar
DROP POLICY IF EXISTS "Super admins can delete email-assets" ON storage.objects;
CREATE POLICY "Super admins can delete email-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'super_admin')
);