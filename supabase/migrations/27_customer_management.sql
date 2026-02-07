-- Customer Management
-- Support for customer profiles, order history, internal notes, and tags

-- Customer tags table
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  color TEXT, -- hex color for UI display
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer tag assignments (many-to-many)
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- Customer internal notes
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_user ON customer_tag_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_user ON customer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created ON customer_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notes_important ON customer_notes(is_important);

-- Row Level Security
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

-- Staff can view all tags
CREATE POLICY "Staff can view customer tags" 
  ON customer_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'inventory_manager', 'admin')
    )
  );

-- Admins can manage tags
CREATE POLICY "Admins can manage customer tags" 
  ON customer_tags FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Staff can view tag assignments
CREATE POLICY "Staff can view tag assignments" 
  ON customer_tag_assignments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'inventory_manager', 'admin')
    )
  );

-- Support agents and admins can assign tags
CREATE POLICY "Support agents can assign tags" 
  ON customer_tag_assignments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );

-- Support agents and admins can remove tags
CREATE POLICY "Support agents can remove tags" 
  ON customer_tag_assignments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- Staff can view customer notes
CREATE POLICY "Staff can view customer notes" 
  ON customer_notes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'inventory_manager', 'admin')
    )
  );

-- Support agents and admins can add notes
CREATE POLICY "Support agents can add customer notes" 
  ON customer_notes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );

-- Support agents can update their own notes
CREATE POLICY "Support agents can update own notes" 
  ON customer_notes FOR UPDATE 
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'admin')
    )
  );

-- Admins can delete notes
CREATE POLICY "Admins can delete customer notes" 
  ON customer_notes FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- View for customer dashboard
CREATE OR REPLACE VIEW customer_dashboard AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.created_at as registered_at,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as lifetime_value,
  MAX(o.created_at) as last_order_date,
  COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as completed_orders,
  COUNT(DISTINCT sa.id) as saved_addresses,
  COUNT(DISTINCT cta.tag_id) as tag_count,
  COUNT(DISTINCT cn.id) as note_count,
  COUNT(DISTINCT CASE WHEN cn.is_important = true THEN cn.id END) as important_note_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
LEFT JOIN shipping_addresses sa ON sa.user_id = u.id
LEFT JOIN customer_tag_assignments cta ON cta.user_id = u.id
LEFT JOIN customer_notes cn ON cn.user_id = u.id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.created_at;

-- Function to add customer note
CREATE OR REPLACE FUNCTION add_customer_note(
  p_user_id UUID,
  p_note TEXT,
  p_is_important BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  v_staff_id UUID;
  v_note_id UUID;
BEGIN
  v_staff_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_staff_id 
    AND role IN ('support_agent', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only support agents can add customer notes';
  END IF;
  
  -- Add note
  INSERT INTO customer_notes (user_id, note, is_important, created_by)
  VALUES (p_user_id, p_note, p_is_important, v_staff_id)
  RETURNING id INTO v_note_id;
  
  RETURN v_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign tag to customer
CREATE OR REPLACE FUNCTION assign_customer_tag(
  p_user_id UUID,
  p_tag_id UUID
) RETURNS void AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  v_staff_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_staff_id 
    AND role IN ('support_agent', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only support agents can assign tags';
  END IF;
  
  -- Assign tag (ignore if already assigned)
  INSERT INTO customer_tag_assignments (user_id, tag_id, assigned_by)
  VALUES (p_user_id, p_tag_id, v_staff_id)
  ON CONFLICT (user_id, tag_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove tag from customer
CREATE OR REPLACE FUNCTION remove_customer_tag(
  p_user_id UUID,
  p_tag_id UUID
) RETURNS void AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  v_staff_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_staff_id 
    AND role IN ('support_agent', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only support agents can remove tags';
  END IF;
  
  -- Remove tag
  DELETE FROM customer_tag_assignments
  WHERE user_id = p_user_id AND tag_id = p_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
