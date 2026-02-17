-- Create storage bucket for fragrance family images
INSERT INTO storage.buckets (id, name, public)
VALUES ('fragrance-families', 'fragrance-families', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public access
CREATE POLICY "Public Access for fragrance family images"
ON storage.objects FOR SELECT
USING (bucket_id = 'fragrance-families');

CREATE POLICY "Authenticated users can upload fragrance family images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fragrance-families' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update fragrance family images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fragrance-families' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete fragrance family images"
ON storage.objects FOR DELETE
USING (bucket_id = 'fragrance-families' AND auth.role() = 'authenticated');
