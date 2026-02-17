-- Create storage bucket for product images and videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public access
CREATE POLICY "Public Access for product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "Authenticated users can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media' AND auth.role() = 'authenticated');
