-- Access & Role Management
-- Role-based access control for CMS and admin functions

-- Add role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES auth.users(id);

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Roles enum constraint
ALTER TABLE users ADD CONSTRAINT valid_user_role 
  CHECK (role IN ('customer', 'support_agent', 'inventory_manager', 'content_manager', 'marketing_manager', 'admin'));

-- Roles reference table (for documentation and UI)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log for role changes
CREATE TABLE IF NOT EXISTS role_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  old_role TEXT,
  new_role TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_change_log_user ON role_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_changed_by ON role_change_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_change_log_created ON role_change_log(created_at DESC);

-- Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Anyone can view active roles
CREATE POLICY "Active roles are viewable by everyone" 
  ON roles FOR SELECT 
  USING (is_active = true);

-- Only admins can modify roles
CREATE POLICY "Only admins can modify roles" 
  ON roles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

ALTER TABLE role_change_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own role change history
CREATE POLICY "Users can view their own role changes" 
  ON role_change_log FOR SELECT 
  USING (user_id = auth.uid());

-- Admins can view all role changes
CREATE POLICY "Admins can view all role changes" 
  ON role_change_log FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can insert role change logs
CREATE POLICY "Only admins can log role changes" 
  ON role_change_log FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM users WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin has all permissions
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get role permissions
  SELECT permissions INTO v_permissions FROM roles WHERE name = v_role;
  
  IF v_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if permission exists in permissions array
  RETURN v_permissions ? p_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_role TEXT;
  v_admin_id UUID;
BEGIN
  -- Get current user (must be admin)
  v_admin_id := auth.uid();
  
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Get current role
  SELECT role INTO v_old_role FROM users WHERE id = p_user_id;
  
  -- Update user role
  UPDATE users 
  SET role = p_new_role,
      role_assigned_at = NOW(),
      role_assigned_by = v_admin_id,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the change
  INSERT INTO role_change_log (user_id, changed_by, old_role, new_role, reason)
  VALUES (p_user_id, v_admin_id, v_old_role, p_new_role, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies for CMS tables

-- Homepage banners - content managers and admins only
DROP POLICY IF EXISTS "Homepage banners are viewable by everyone" ON homepage_banners;
CREATE POLICY "Homepage banners are viewable by everyone" 
  ON homepage_banners FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Content managers can manage homepage banners" 
  ON homepage_banners FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'admin')
    )
  );

-- Featured collections - content managers and admins only
DROP POLICY IF EXISTS "Featured collections are viewable by everyone" ON featured_collections;
CREATE POLICY "Featured collections are viewable by everyone" 
  ON featured_collections FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Content managers can manage featured collections" 
  ON featured_collections FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'admin')
    )
  );

-- Featured products - content managers and admins only
DROP POLICY IF EXISTS "Featured products are viewable by everyone" ON featured_products;
CREATE POLICY "Featured products are viewable by everyone" 
  ON featured_products FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Content managers can manage featured products" 
  ON featured_products FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'admin')
    )
  );

-- Products - content managers and inventory managers can edit
CREATE POLICY "Content managers can manage products" 
  ON products FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('content_manager', 'inventory_manager', 'admin')
    )
  );

-- Promo codes - marketing managers and admins only
DROP POLICY IF EXISTS "Promo codes are viewable by everyone" ON promo_codes;
CREATE POLICY "Promo codes are viewable by everyone" 
  ON promo_codes FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Marketing managers can manage promo codes" 
  ON promo_codes FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('marketing_manager', 'admin')
    )
  );

-- Orders - support agents can view, inventory managers can update status
CREATE POLICY "Support agents can view all orders" 
  ON orders FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'inventory_manager', 'admin')
    )
  );

CREATE POLICY "Inventory managers can update orders" 
  ON orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('inventory_manager', 'admin')
    )
  );

-- Chat conversations - support agents can view all
CREATE POLICY "Support agents can view all conversations" 
  ON chat_conversations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );

CREATE POLICY "Support agents can update conversations" 
  ON chat_conversations FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );

-- Chat messages - support agents can send messages
CREATE POLICY "Support agents can send messages" 
  ON chat_messages FOR INSERT 
  WITH CHECK (
    sender_type = 'agent' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );
