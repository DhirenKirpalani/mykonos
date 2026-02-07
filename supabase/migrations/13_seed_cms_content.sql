-- Seed CMS content for homepage
-- Sample banners, featured collections, and products

-- Insert fragrance families
INSERT INTO fragrance_families (name, description, display_order) VALUES
  ('Woody', 'Rich, earthy scents featuring sandalwood, cedar, and vetiver', 1),
  ('Floral', 'Romantic and elegant with rose, jasmine, and lily notes', 2),
  ('Oriental', 'Warm and exotic with amber, vanilla, and spices', 3),
  ('Fresh', 'Clean and invigorating with citrus and aquatic notes', 4),
  ('Citrus', 'Bright and energizing with lemon, bergamot, and orange', 5),
  ('Aromatic', 'Herbaceous and green with lavender, sage, and rosemary', 6);

-- Update existing products with fragrance families and editorial priority
UPDATE products SET 
  fragrance_family = 'Oriental',
  editorial_priority = 100
WHERE slug = 'oud-noir';

UPDATE products SET 
  fragrance_family = 'Floral',
  editorial_priority = 95
WHERE slug = 'rose-lumiere';

UPDATE products SET 
  fragrance_family = 'Woody',
  editorial_priority = 90
WHERE slug = 'vetiver-sauvage';

UPDATE products SET 
  fragrance_family = 'Oriental',
  editorial_priority = 98
WHERE slug = 'ambre-royal';

UPDATE products SET 
  fragrance_family = 'Fresh',
  editorial_priority = 85
WHERE slug = 'neroli-garden';

-- Insert homepage banners
INSERT INTO homepage_banners (title, subtitle, description, image_url, cta_text, cta_link, display_order, is_active) VALUES
  (
    'Discover Luxury Fragrances',
    'Exclusive Collections',
    'Experience the art of fine perfumery with our curated selection of niche and haute perfumery',
    'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1920',
    'Shop Now',
    '/products',
    1,
    true
  ),
  (
    'New Arrivals',
    'Spring Collection 2026',
    'Fresh and uplifting scents perfect for the new season',
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1920',
    'Explore Collection',
    '/products?collection=Signature+Collection',
    2,
    true
  ),
  (
    'Limited Edition',
    'Rare & Exclusive',
    'Discover our most sought-after fragrances in limited quantities',
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1920',
    'View Limited Edition',
    '/products?collection=Limited+Edition',
    3,
    true
  );

-- Insert featured collections (all existing collections)
INSERT INTO featured_collections (collection_id, display_order, is_active)
SELECT id, display_order, true FROM collections ORDER BY display_order;

-- Insert featured products (top editorial priority products)
INSERT INTO featured_products (product_id, display_order, is_active)
SELECT id, 
  CASE slug
    WHEN 'oud-noir' THEN 1
    WHEN 'ambre-royal' THEN 2
    WHEN 'rose-lumiere' THEN 3
    WHEN 'vetiver-sauvage' THEN 4
    ELSE 5
  END as display_order,
  true
FROM products
WHERE slug IN ('oud-noir', 'ambre-royal', 'rose-lumiere', 'vetiver-sauvage')
ORDER BY editorial_priority DESC;
