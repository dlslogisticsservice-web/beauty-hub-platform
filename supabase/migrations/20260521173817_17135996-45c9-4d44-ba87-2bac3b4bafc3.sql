
-- Storage bucket for center logos/covers
INSERT INTO storage.buckets (id, name, public) VALUES ('center-assets', 'center-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Center assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'center-assets');

CREATE POLICY "Authenticated users can upload center assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'center-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own center assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'center-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own center assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'center-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
