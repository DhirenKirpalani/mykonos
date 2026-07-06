-- Migration 87: Fix inventory_reservations unique constraint to include variant_name
-- The old uniq_active_res constraint on (order_id, product_id) fails when
-- the same product appears multiple times with different variants in one order.

-- Drop old constraint and underlying index
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS uniq_active_res;
DROP INDEX IF EXISTS uniq_active_res;

-- Recreate with variant_name included so each order+product+variant combo is unique
ALTER TABLE inventory_reservations
ADD CONSTRAINT uniq_active_res UNIQUE (order_id, product_id, variant_name);

COMMENT ON CONSTRAINT uniq_active_res ON inventory_reservations IS
  'Ensures one reservation per (order, product, variant) combination';
