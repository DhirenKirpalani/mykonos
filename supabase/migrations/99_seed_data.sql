-- Seed data for collections and products
-- Run this after all tables are created

-- Insert sample collections
INSERT INTO collections (name, slug, description, hero_image_url, display_order) VALUES
  ('Signature Collection', 'signature-collection', 'Our most iconic and timeless fragrances', 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1200', 1),
  ('Limited Edition', 'limited-edition', 'Exclusive and rare fragrances for the discerning collector', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200', 2),
  ('Gift Sets', 'gift-sets', 'Curated collections perfect for gifting', 'https://images.unsplash.com/photo-1549298222-1c31e8915347?w=1200', 3);

-- Insert sample products
INSERT INTO products (name, slug, description, price, size, category, collection, is_new, image_urls, stock_quantity) VALUES
  ('Oud Noir', 'oud-noir', 'A rich and mysterious blend of oud wood, amber, and spices. This luxurious fragrance captures the essence of Arabian nights.', 285.00, '100ml', 'Fragrances', 'Signature Collection', true, ARRAY['https://images.unsplash.com/photo-1541643600914-78b084683601?w=800', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800'], 50),
  ('Rose Lumière', 'rose-lumiere', 'An elegant composition of Bulgarian rose, jasmine, and white musk. Timeless femininity in a bottle.', 265.00, '100ml', 'Fragrances', 'Signature Collection', true, ARRAY['https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=800', 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800'], 45),
  ('Vetiver Sauvage', 'vetiver-sauvage', 'A bold and sophisticated blend of vetiver, bergamot, and cedarwood. For the modern gentleman.', 295.00, '100ml', 'Fragrances', 'Signature Collection', false, ARRAY['https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800'], 60),
  ('Ambre Royal', 'ambre-royal', 'Warm and sensual amber combined with vanilla and tonka bean. A truly regal fragrance.', 320.00, '100ml', 'Fragrances', 'Limited Edition', true, ARRAY['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800'], 30),
  ('Neroli Garden', 'neroli-garden', 'Fresh and uplifting neroli with hints of citrus and green tea. Perfect for spring and summer.', 245.00, '100ml', 'Fragrances', 'Signature Collection', false, ARRAY['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800'], 55),
  ('Luxury Discovery Set', 'luxury-discovery-set', 'Experience our five signature fragrances in travel-friendly sizes. The perfect introduction to our collection.', 125.00, '5 x 10ml', 'Gift Sets', 'Gift Sets', false, ARRAY['https://images.unsplash.com/photo-1549298222-1c31e8915347?w=800'], 100);
