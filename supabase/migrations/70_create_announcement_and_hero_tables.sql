-- Create announcement_messages table
CREATE TABLE IF NOT EXISTS announcement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create hero_media table
CREATE TABLE IF NOT EXISTS hero_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('video', 'image')),
  media_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_announcement_messages_display_order ON announcement_messages(display_order);
CREATE INDEX idx_announcement_messages_is_active ON announcement_messages(is_active);
CREATE INDEX idx_hero_media_is_active ON hero_media(is_active);

-- Insert default announcement messages
INSERT INTO announcement_messages (message, display_order, is_active) VALUES
  ('Discover our redeemable sampler sets. *T&Cs Apply.', 1, true),
  ('Free shipping on orders over $100', 2, true),
  ('Complimentary gift wrapping available', 3, true),
  ('New arrivals now in stock', 4, true);

-- Enable RLS
ALTER TABLE announcement_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_media ENABLE ROW LEVEL SECURITY;

-- Create policies for announcement_messages
CREATE POLICY "Anyone can view active announcement messages"
  ON announcement_messages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage announcement messages"
  ON announcement_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create policies for hero_media
CREATE POLICY "Anyone can view active hero media"
  ON hero_media FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage hero media"
  ON hero_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
