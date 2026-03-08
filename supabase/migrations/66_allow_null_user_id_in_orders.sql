-- Allow null user_id in orders table for guest checkout
-- Guest orders will have null user_id but will have customer email in checkout session

-- Make user_id nullable
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Add customer_email column to store guest email
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add session_id column to track guest orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add constraint to ensure either user_id or session_id is present
-- Drop first if exists to avoid duplicate constraint error
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_or_session_check;
ALTER TABLE orders ADD CONSTRAINT orders_user_or_session_check 
  CHECK (
    (user_id IS NOT NULL) OR 
    (session_id IS NOT NULL) OR
    (customer_email IS NOT NULL)
  );

-- Update RLS policies to allow guest orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;

-- New policy: Users can view their own orders (by user_id or session_id)
CREATE POLICY "Users can view their own orders" 
  ON orders FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NOT NULL AND auth.uid()::text = session_id)
  );

-- New policy: Allow order creation for authenticated and anonymous users
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" 
  ON orders FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR auth.uid()::text = session_id)) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Add index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);

-- Add index for customer_email lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- Add comment
COMMENT ON COLUMN orders.user_id IS 'User ID for authenticated users, null for guest orders';
COMMENT ON COLUMN orders.customer_email IS 'Email address for guest orders';
COMMENT ON COLUMN orders.session_id IS 'Session ID for guest/anonymous orders';
