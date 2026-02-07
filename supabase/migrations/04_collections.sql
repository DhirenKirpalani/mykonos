-- Collections table
-- Stores product collections/categories

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  hero_image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_collections_slug ON collections(slug);

-- Row Level Security (RLS)
-- Public read access for collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are viewable by everyone" 
  ON collections FOR SELECT 
  USING (true);
