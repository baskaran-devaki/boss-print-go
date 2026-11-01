DROP POLICY IF EXISTS "Guests upload order files" ON storage.objects;
CREATE POLICY "Guests upload order files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'order-uploads');
ALTER TABLE public.orders ALTER COLUMN utr DROP NOT NULL;