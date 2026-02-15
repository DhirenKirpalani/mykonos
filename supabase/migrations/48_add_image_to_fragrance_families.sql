-- Add image_url field to fragrance_families table
ALTER TABLE fragrance_families ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing fragrance families with images
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&q=80' WHERE name = 'Floral';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80' WHERE name = 'Fruity';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80' WHERE name = 'Gourmand';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1583241800698-e8f1c92a2c8e?w=400&q=80' WHERE name = 'Powdery';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80' WHERE name = 'Aquatic Aromatic';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1602874801006-c2b5e8f3e06f?w=400&q=80' WHERE name = 'Oriental';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1547887538-047f814bfb64?w=400&q=80' WHERE name = 'Woody';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80' WHERE name = 'Citrus';
UPDATE fragrance_families SET image_url = 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=80' WHERE name = 'Fresh';
