-- Update fragrance families with new names and local images

-- First, delete existing fragrance families
DELETE FROM fragrance_families;

-- Insert new fragrance families with updated names and local image paths
INSERT INTO fragrance_families (name, description, image_url, display_order) VALUES
  ('Aqua & Aromatic', 'Fresh aquatic notes blended with aromatic herbs and marine accords', '/assets/fragrance-families/id-11134210-81ztd-mf1cjoyygbgp12.webp', 1),
  ('Floral Fantasy', 'Romantic and elegant with rose, jasmine, and lily notes', '/assets/fragrance-families/id-11134210-81ztj-mf1cjoz5zf2j7b.webp', 2),
  ('Oriental', 'Warm and exotic with amber, vanilla, and spices', '/assets/fragrance-families/id-11134210-81ztk-mf1cjoz60tmz13.webp', 3),
  ('Fresh Fruity', 'Vibrant citrus and juicy fruit notes for an energizing experience', '/assets/fragrance-families/id-11134210-81ztl-mf1cjoz63mrv61.webp', 4),
  ('Powdery Elegance', 'Soft, sophisticated powdery notes with iris and musk', '/assets/fragrance-families/id-11134210-81ztn-mf1cjoz5y0i36b.webp', 5),
  ('Gourmand Galore', 'Delicious sweet notes of vanilla, caramel, and chocolate', '/assets/fragrance-families/id-11134210-81ztq-mf1cjoz6287f0e.webp', 6);
