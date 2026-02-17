-- Clear existing products and seed Mykonos products
-- This migration removes all existing products and adds the 6 Mykonos products

-- Delete all existing products
DELETE FROM products;

-- Insert Mykonos products with correct fragrance families
-- Note: image_urls will be updated after uploading to Supabase Storage

-- 1. Aphrodite Extrait de Parfum (50ml & 100ml) - Oriental
INSERT INTO products (name, slug, description, price, fragrance_family, collection, size, is_new, image_urls, stock_quantity) VALUES
(
  'Mykonos - Aphrodite Extrait de Parfum',
  'mykonos-aphrodite-extrait-de-parfum',
  'Warm and exotic with amber, vanilla, and spices. A luxurious oriental fragrance that captivates the senses.',
  89.99,
  'Oriental',
  'Extrait de Parfum',
  '50ml, 100ml',
  true,
  ARRAY[
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134201-23030-rm2apozwa5nv01@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-23030-2146vbmxa5nv31@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-23030-8u48blyxa5nv1a@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-7ras8-m12ciuvxpax68b@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-8224o-mh8laxfg855bdc@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-8224s-mh8laxfg5c0fb2@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-8224t-mh8laxfg6qkvdb@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-8224x-mie875vwgsg80b@resize_w900_nl.webp',
    '/assets/Mykonos - Aphrodite Extrait de Parfum 50ml & 100ml/id-11134207-82251-mfw6j7s1she0c4@resize_w900_nl.webp'
  ],
  50
);

-- 2. Baby Love EDP 50ml - Powdery Elegance
INSERT INTO products (name, slug, description, price, fragrance_family, collection, size, is_new, image_urls, stock_quantity) VALUES
(
  'Mykonos - Baby Love EDP',
  'mykonos-baby-love-edp',
  'Soft, sophisticated powdery notes with iris and musk. A delicate and elegant fragrance.',
  69.99,
  'Powdery Elegance',
  'Eau de Parfum',
  '50ml',
  true,
  ARRAY[
    '/assets/Mykonos - Baby Love EDP 50ml/id-11134207-8224s-mh9zrybeo9hne2@resize_w900_nl.webp',
    '/assets/Mykonos - Baby Love EDP 50ml/id-11134207-8224t-mftpzwptqq6m85@resize_w900_nl.webp',
    '/assets/Mykonos - Baby Love EDP 50ml/id-11134207-8224w-mfw6yh89dlote7@resize_w900_nl.webp',
    '/assets/Mykonos - Baby Love EDP 50ml/id-11134207-8224y-mfw6yh89f09989@resize_w900_nl.webp'
  ],
  50
);

-- 3. California Club Extrait de Parfum 50ml - Aqua & Aromatic
INSERT INTO products (name, slug, description, price, fragrance_family, collection, size, is_new, image_urls, stock_quantity) VALUES
(
  'Mykonos - California Club Extrait de Parfum',
  'mykonos-california-club-extrait-de-parfum',
  'Fresh aquatic notes blended with aromatic herbs and marine accords. A refreshing coastal fragrance.',
  79.99,
  'Aqua & Aromatic',
  'Extrait de Parfum',
  '50ml',
  true,
  ARRAY[
    '/assets/Mykonos - California Club Extrait de Parfum 50ml/id-11134207-7rbk2-m70pfs3051ka87@resize_w900_nl.webp',
    '/assets/Mykonos - California Club Extrait de Parfum 50ml/id-11134207-7rbk3-m70pfs300tuy2b@resize_w900_nl.webp',
    '/assets/Mykonos - California Club Extrait de Parfum 50ml/id-11134207-7rbka-m70pfs303mzu19@resize_w900_nl.webp',
    '/assets/Mykonos - California Club Extrait de Parfum 50ml/id-11134207-7rbkc-m70pfs3028fea4@resize_w900_nl.webp',
    '/assets/Mykonos - California Club Extrait de Parfum 50ml/id-11134207-8224q-mfw6qyhizci06c@resize_w900_nl.webp'
  ],
  50
);

-- 4. Coconut Dreams Extrait de Parfum 50ml - Gourmand Galore
INSERT INTO products (name, slug, description, price, fragrance_family, collection, size, is_new, image_urls, stock_quantity) VALUES
(
  'Mykonos - Coconut Dreams Extrait de Parfum',
  'mykonos-coconut-dreams-extrait-de-parfum',
  'Delicious sweet notes of vanilla, caramel, and chocolate with creamy coconut. A gourmand delight.',
  79.99,
  'Gourmand Galore',
  'Extrait de Parfum',
  '50ml',
  true,
  ARRAY[
    '/assets/Mykonos - Coconut Dreams Extrait de Parfum 50ml/id-11134207-7r98o-lks4fukkthis08@resize_w900_nl.webp',
    '/assets/Mykonos - Coconut Dreams Extrait de Parfum 50ml/id-11134207-8224t-mha00l19u1ho25@resize_w900_nl.webp',
    '/assets/Mykonos - Coconut Dreams Extrait de Parfum 50ml/id-11134207-8224v-mie875vwp7uva9@resize_w900_nl.webp'
  ],
  50
);

-- 5. Enchanted Extrait de Parfum 50ml - Floral Fantasy
INSERT INTO products (name, slug, description, price, fragrance_family, collection, size, is_new, image_urls, stock_quantity) VALUES
(
  'Mykonos - Enchanted Extrait de Parfum',
  'mykonos-enchanted-extrait-de-parfum',
  'Romantic and elegant with rose, jasmine, and lily notes. A captivating floral bouquet.',
  79.99,
  'Floral Fantasy',
  'Extrait de Parfum',
  '50ml',
  true,
  ARRAY[
    '/assets/Mykonos - Enchanted Extrait de Parfum 50ml/id-11134207-8224p-mftpzwpxkdu2f2@resize_w900_nl.webp',
    '/assets/Mykonos - Enchanted Extrait de Parfum 50ml/id-11134207-8224p-mha00l19vg24f9@resize_w900_nl.webp',
    '/assets/Mykonos - Enchanted Extrait de Parfum 50ml/id-11134207-82252-mfw6yh897zf189@resize_w900_nl.webp'
  ],
  50
);

-- 6. Hawaiian Crush Extrait de Parfum 50ml - Fresh Fruity
INSERT INTO products (name, slug, description, price, fragrance_family, collection, size, is_new, image_urls, stock_quantity) VALUES
(
  'Mykonos - Hawaiian Crush Extrait de Parfum',
  'mykonos-hawaiian-crush-extrait-de-parfum',
  'Vibrant citrus and juicy fruit notes for an energizing experience. A tropical paradise in a bottle.',
  79.99,
  'Fresh Fruity',
  'Extrait de Parfum',
  '50ml',
  true,
  ARRAY[
    '/assets/Mykonos - Hawaiian Crush Extrait de Parfum 50ml/id-11134207-7ras8-m63amicdu9qr7f@resize_w900_nl.webp',
    '/assets/Mykonos - Hawaiian Crush Extrait de Parfum 50ml/id-11134207-7ras8-m63amicdvob784@resize_w900_nl.webp',
    '/assets/Mykonos - Hawaiian Crush Extrait de Parfum 50ml/id-11134207-7rasm-m63amicdx2vn58@resize_w900_nl.webp',
    '/assets/Mykonos - Hawaiian Crush Extrait de Parfum 50ml/id-11134207-8224t-mfw6qyhiwjd46e@resize_w900_nl.webp'
  ],
  50
);
