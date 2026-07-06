-- Update fragrance families with new names and local images

-- First, delete existing fragrance families
DELETE FROM fragrance_families;

-- Insert new fragrance families with updated names and local image paths
INSERT INTO fragrance_families (name, description, image_url, display_order) VALUES
  ('Fruity Floral', 'A delightful blend of juicy fruits and romantic floral notes', '/assets/fragrance-families/id-11134210-81ztl-mf1cjoz63mrv61.webp', 1),
  ('Smoky Citrus', 'Bright citrus infused with mysterious smoky undertones', '/assets/fragrance-families/id-11134210-81ztd-mf1cjoyygbgp12.webp', 2),
  ('Tropical Gourmand', 'Lush tropical sweetness with delicious gourmand accents', '/assets/fragrance-families/id-11134210-81ztq-mf1cjoz6287f0e.webp', 3),
  ('Musky Powdery', 'Soft musk layered with elegant, sophisticated powdery notes', '/assets/fragrance-families/id-11134210-81ztn-mf1cjoz5y0i36b.webp', 4),
  ('Citrus Aromatic', 'Fresh citrus balanced with herbaceous aromatic depth', '/assets/fragrance-families/id-11134210-81ztd-mf1cjoyygbgp12.webp', 5),
  ('Spicy Gourmand', 'Warm spices wrapped in sweet, edible gourmand warmth', '/assets/fragrance-families/id-11134210-81ztq-mf1cjoz6287f0e.webp', 6),
  ('Sweet Gourmand', 'Rich, indulgent sweetness with vanilla and caramel bliss', '/assets/fragrance-families/id-11134210-81ztq-mf1cjoz6287f0e.webp', 7),
  ('Fruity Clean', 'Crisp, refreshing fruit notes with a pure, airy finish', '/assets/fragrance-families/id-11134210-81ztl-mf1cjoz63mrv61.webp', 8),
  ('Fruity Ambery', 'Juicy fruits warmed by golden amber and resinous depth', '/assets/fragrance-families/id-11134210-81ztl-mf1cjoz63mrv61.webp', 9),
  ('Tropical Fruity', 'Exotic tropical fruits bursting with sun-ripened sweetness', '/assets/fragrance-families/id-11134210-81ztl-mf1cjoz63mrv61.webp', 10),
  ('Citrus Clean', 'Zesty, sparkling citrus with an impeccably clean signature', '/assets/fragrance-families/id-11134210-81ztd-mf1cjoyygbgp12.webp', 11),
  ('Milky Musky', 'Creamy, lactonic warmth enveloped in soft sensual musk', '/assets/fragrance-families/id-11134210-81ztn-mf1cjoz5y0i36b.webp', 12),
  ('Milky Fruity', 'Smooth milky notes blended with luscious, ripe fruits', '/assets/fragrance-families/id-11134210-81ztl-mf1cjoz63mrv61.webp', 13),
  ('Milky Sweet', 'Velvety milk accords paired with comforting sweet gourmand', '/assets/fragrance-families/id-11134210-81ztq-mf1cjoz6287f0e.webp', 14),
  ('Spicy Vanilla', 'Warm exotic spices fused with creamy, rich vanilla', '/assets/fragrance-families/id-11134210-81ztq-mf1cjoz6287f0e.webp', 15),
  ('Citrus Floral', 'Bright, uplifting citrus intertwined with delicate florals', '/assets/fragrance-families/id-11134210-81ztj-mf1cjoz5zf2j7b.webp', 16),
  ('Floral Musky', 'Romantic florals grounded by soft, intimate white musk', '/assets/fragrance-families/id-11134210-81ztj-mf1cjoz5zf2j7b.webp', 17),
  ('Fruity Woody', 'Juicy fruits resting on a rich, earthy woody base', '/assets/fragrance-families/id-11134210-81ztk-mf1cjoz60tmz13.webp', 18),
  ('Citrus Aquatic', 'Sparkling citrus meeting fresh, breezy marine accords', '/assets/fragrance-families/id-11134210-81ztd-mf1cjoyygbgp12.webp', 19),
  ('Citrus Spicy', 'Energetic citrus brightened with a kick of warm spice', '/assets/fragrance-families/id-11134210-81ztd-mf1cjoyygbgp12.webp', 20),
  ('Floral Vanilla', 'Elegant florals softened by creamy, comforting vanilla', '/assets/fragrance-families/id-11134210-81ztj-mf1cjoz5zf2j7b.webp', 21),
  ('Floral Woody', 'Delicate florals anchored by rich, grounding woody notes', '/assets/fragrance-families/id-11134210-81ztk-mf1cjoz60tmz13.webp', 22),
  ('Smoky Floral', 'Soft romantic florals veiled in alluring smoky mystery', '/assets/fragrance-families/id-11134210-81ztj-mf1cjoz5zf2j7b.webp', 23),
  ('Woody Gourmand', 'Rich woody warmth blended with sweet, edible gourmand indulgence', '/assets/fragrance-families/id-11134210-81ztk-mf1cjoz60tmz13.webp', 24);
