-- Criar bucket para anexos das contas financeiras
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conta-anexos',
  'conta-anexos',
  false,
  10485760,  -- 10MB por arquivo
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload conta anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'conta-anexos');

-- Política: usuário autenticado pode ler qualquer anexo
CREATE POLICY "Authenticated users can read conta anexos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'conta-anexos');

-- Política: usuário autenticado pode deletar seus próprios uploads
CREATE POLICY "Authenticated users can delete conta anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'conta-anexos');