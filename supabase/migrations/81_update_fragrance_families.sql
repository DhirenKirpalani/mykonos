-- Update fragrance families to new 23 names and migrate existing product data

-- Step 1: Clear and re-seed fragrance_families reference table
DELETE FROM fragrance_families;

INSERT INTO fragrance_families (name, description_en, description_id, display_order) VALUES
  ('Fruity Floral', 'A delightful blend of juicy fruits and romantic floral notes', 'Perpaduan lezat dari buah juicy dan nada bunga yang romantis', 1),
  ('Smoky Citrus', 'Bright citrus infused with mysterious smoky undertones', 'Citrus cerah dengan sentuhan misterius asap yang mendalam', 2),
  ('Tropical Gourmand', 'Lush tropical sweetness with delicious gourmand accents', 'Kemanisan tropis yang kaya dengan sentuhan gourmand yang lezat', 3),
  ('Musky Powdery', 'Soft musk layered with elegant, sophisticated powdery notes', 'Musk lembut berlapis dengan nada powdery yang elegan dan canggih', 4),
  ('Citrus Aromatic', 'Fresh citrus balanced with herbaceous aromatic depth', 'Citrus segar yang seimbang dengan kedalaman aroma herbal', 5),
  ('Spicy Gourmand', 'Warm spices wrapped in sweet, edible gourmand warmth', 'Rempah hangat yang dibalut dengan kehangatan gourmand yang manis', 6),
  ('Sweet Gourmand', 'Rich, indulgent sweetness with vanilla and caramel bliss', 'Kemanisan yang kaya dan memanjakan dengan vanila dan karamel', 7),
  ('Fruity Clean', 'Crisp, refreshing fruit notes with a pure, airy finish', 'Nada buah yang segar dan menyegarkan dengan sentuhan murni dan ringan', 8),
  ('Fruity Ambery', 'Juicy fruits warmed by golden amber and resinous depth', 'Buah juicy yang dipanaskan oleh amber emas dan kedalaman resin', 9),
  ('Tropical Fruity', 'Exotic tropical fruits bursting with sun-ripened sweetness', 'Buah tropis eksotis yang meletup dengan kemanisan matang di bawah matahari', 10),
  ('Citrus Clean', 'Zesty, sparkling citrus with an impeccably clean signature', 'Citrus yang bersemangat dan berkilau dengan tanda tangan bersih yang sempurna', 11),
  ('Milky Musky', 'Creamy, lactonic warmth enveloped in soft sensual musk', 'Kehangatan krimi dan laktik yang terbungkus dalam musk sensual yang lembut', 12),
  ('Milky Fruity', 'Smooth milky notes blended with luscious, ripe fruits', 'Nada susu yang halus dipadukan dengan buah-buahan yang lezat dan matang', 13),
  ('Milky Sweet', 'Velvety milk accords paired with comforting sweet gourmand', 'Akord susu yang lembut seperti beludru dipasangkan dengan gourmand manis yang menenangkan', 14),
  ('Spicy Vanilla', 'Warm exotic spices fused with creamy, rich vanilla', 'Rempah eksotis yang hangat dipadukan dengan vanila yang krimi dan kaya', 15),
  ('Citrus Floral', 'Bright, uplifting citrus intertwined with delicate florals', 'Citrus yang cerah dan menyegarkan berpadu dengan bunga-bunga yang lembut', 16),
  ('Floral Musky', 'Romantic florals grounded by soft, intimate white musk', 'Bunga romantis yang diperkuat oleh white musk yang lembut dan intim', 17),
  ('Fruity Woody', 'Juicy fruits resting on a rich, earthy woody base', 'Buah juicy yang beristirahat di dasar woody yang kaya dan earthy', 18),
  ('Citrus Aquatic', 'Sparkling citrus meeting fresh, breezy marine accords', 'Citrus yang berkilau bertemu dengan akord laut yang segar dan berangin', 19),
  ('Citrus Spicy', 'Energetic citrus brightened with a kick of warm spice', 'Citrus yang energik dicerahkan dengan sentuhan rempah yang hangat', 20),
  ('Floral Vanilla', 'Elegant florals softened by creamy, comforting vanilla', 'Bunga yang elegan yang diperhalus oleh vanila yang krimi dan menenangkan', 21),
  ('Floral Woody', 'Delicate florals anchored by rich, grounding woody notes', 'Bunga yang lembut dijalin dengan nada woody yang kaya dan menancap', 22),
  ('Smoky Floral', 'Soft romantic florals veiled in alluring smoky mystery', 'Bunga romantis yang lembut diselimuti oleh misteri asap yang memikat', 23),
  ('Woody Gourmand', 'Rich woody warmth blended with sweet, edible gourmand indulgence', 'Kehangatan woody yang kaya dipadukan dengan kenikmatan gourmand yang manis dan lezat', 24);

-- Step 2: Migrate existing products from ANY old fragrance family names to new ones
UPDATE products SET fragrance_family = 'Smoky Citrus'     WHERE fragrance_family IN ('Oriental', 'Woody', 'Woody & Vanilla');
UPDATE products SET fragrance_family = 'Musky Powdery'    WHERE fragrance_family IN ('Musky', 'Powdery Elegance', 'Powdery');
UPDATE products SET fragrance_family = 'Citrus Aromatic'  WHERE fragrance_family IN ('Citrus', 'Aqua & Aromatic', 'Aquatic Aromatic', 'Fresh', 'Aromatic');
UPDATE products SET fragrance_family = 'Tropical Gourmand' WHERE fragrance_family IN ('Gourmand', 'Gourmand Galore');
UPDATE products SET fragrance_family = 'Floral Musky'      WHERE fragrance_family IN ('Floral', 'Floral Fantasy');
UPDATE products SET fragrance_family = 'Tropical Fruity'   WHERE fragrance_family IN ('Fruity', 'Fresh Fruity', 'Sweet Fruity');
