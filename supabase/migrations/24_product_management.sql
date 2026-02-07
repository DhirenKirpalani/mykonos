-- Product & Content Management Enhancements
-- Support for product CRUD, image management, visibility control, and inventory management

-- Add product management fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Create product images table (replacing image_urls array)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Product collection assignments (many-to-many)
CREATE TABLE IF NOT EXISTS product_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, collection_id)
);

-- Inventory change log
CREATE TABLE IF NOT EXISTS inventory_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_archived ON products(is_archived);
CREATE INDEX IF NOT EXISTS idx_products_visible ON products(is_visible);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_collections_product ON product_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_collection ON product_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_product ON inventory_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_created ON inventory_changes(created_at DESC);

-- Row Level Security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view product images for visible products
CREATE POLICY "Product images are viewable for visible products" 
  ON product_images FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_images.product_id 
      AND products.is_visible = true 
      AND products.is_archived = false
    )
  );

-- Content managers can manage product images
CREATE POLICY "Content managers can manage product images" 
  ON product_images FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'admin')
    )
  );

ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;

-- Everyone can view product collections
CREATE POLICY "Product collections are viewable by everyone" 
  ON product_collections FOR SELECT 
  USING (true);

-- Content managers can manage product collections
CREATE POLICY "Content managers can manage product collections" 
  ON product_collections FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'admin')
    )
  );

ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;

-- Inventory managers and admins can view inventory changes
CREATE POLICY "Inventory managers can view inventory changes" 
  ON inventory_changes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('inventory_manager', 'admin')
    )
  );

-- Only inventory managers can log inventory changes
CREATE POLICY "Inventory managers can log inventory changes" 
  ON inventory_changes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('inventory_manager', 'admin')
    )
  );

-- Enhanced product visibility policy
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Visible products are viewable by everyone" 
  ON products FOR SELECT 
  USING (is_visible = true AND is_archived = false);

-- Content managers can view all products including archived
CREATE POLICY "Content managers can view all products" 
  ON products FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'inventory_manager', 'admin')
    )
  );

-- Function to archive product
CREATE OR REPLACE FUNCTION archive_product(
  p_product_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only content managers can archive products';
  END IF;
  
  -- Archive product
  UPDATE products 
  SET is_archived = true,
      is_visible = false,
      archived_at = NOW(),
      archived_by = v_user_id,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore archived product
CREATE OR REPLACE FUNCTION restore_product(
  p_product_id UUID
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only content managers can restore products';
  END IF;
  
  -- Restore product
  UPDATE products 
  SET is_archived = false,
      is_visible = true,
      archived_at = NULL,
      archived_by = NULL,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product visibility
CREATE OR REPLACE FUNCTION update_product_visibility(
  p_product_id UUID,
  p_is_visible BOOLEAN
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only content managers can update product visibility';
  END IF;
  
  -- Update visibility
  UPDATE products 
  SET is_visible = p_is_visible,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE id = p_product_id AND is_archived = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update inventory with logging
CREATE OR REPLACE FUNCTION update_product_inventory(
  p_product_id UUID,
  p_new_quantity INTEGER,
  p_reason TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_old_quantity INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('inventory_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only inventory managers can update inventory';
  END IF;
  
  -- Get current quantity
  SELECT stock_quantity INTO v_old_quantity 
  FROM products 
  WHERE id = p_product_id;
  
  -- Update inventory
  UPDATE products 
  SET stock_quantity = p_new_quantity,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Log the change
  INSERT INTO inventory_changes (
    product_id,
    changed_by,
    old_quantity,
    new_quantity,
    change_amount,
    reason
  ) VALUES (
    p_product_id,
    v_user_id,
    v_old_quantity,
    p_new_quantity,
    p_new_quantity - v_old_quantity,
    p_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder product images
CREATE OR REPLACE FUNCTION reorder_product_images(
  p_product_id UUID,
  p_image_orders JSONB
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_image RECORD;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only content managers can reorder images';
  END IF;
  
  -- Update each image's display order
  FOR v_image IN 
    SELECT * FROM jsonb_to_recordset(p_image_orders) 
    AS items(image_id UUID, display_order INTEGER)
  LOOP
    UPDATE product_images 
    SET display_order = v_image.display_order
    WHERE id = v_image.image_id AND product_id = p_product_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
