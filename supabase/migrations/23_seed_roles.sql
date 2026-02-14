-- ============================================
-- MYKONOS RBAC ROLE SEED
-- ============================================
-- Safe to run multiple times
-- Will upsert roles based on unique "name"
-- ============================================

-- Ensure roles table has unique constraint on name
-- (Run once if not already present)
-- ALTER TABLE roles ADD CONSTRAINT roles_name_unique UNIQUE (name);

-- ============================================
-- CUSTOMER ROLE
-- Public-facing access only
-- ============================================

INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'customer',
  'Customer',
  'Public user with access to shopping and account features',
  '[
    "view_products",
    "manage_own_cart",
    "place_orders",
    "view_own_orders",
    "manage_own_profile",
    "manage_own_addresses",
    "view_wishlist",
    "manage_wishlist",
    "use_chat"
  ]'::jsonb,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;


-- ============================================
-- STAFF ROLE
-- Operational CMS access
-- ============================================

INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'staff',
  'Staff',
  'Operational CMS user with product, order, promotion, and support management access',
  '[
    "view_all_products",
    "create_products",
    "edit_products",
    "delete_products",
    "manage_collections",
    "manage_homepage_content",
    "manage_fragrance_families",
    "edit_inventory",
    "view_all_orders",
    "update_order_status",
    "add_tracking_info",
    "manage_shipping_operations",
    "create_promo_codes",
    "edit_promo_codes",
    "delete_promo_codes",
    "manage_sales_pricing",
    "manage_regional_pricing",
    "view_basic_sales_analytics",
    "view_customer_profiles",
    "manage_support_conversations",
    "send_support_messages",
    "add_internal_order_notes"
  ]'::jsonb,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;


-- ============================================
-- ADMIN ROLE
-- Full system access + operational controls
-- ============================================

INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'admin',
  'Administrator',
  'Full system access including role assignment, audit logs, and operational controls',
  '[
    "*",
    "assign_roles",
    "view_audit_logs",
    "configure_system_settings",
    "disable_checkout",
    "disable_payments",
    "disable_regions",
    "disable_promo_codes",
    "enable_maintenance_mode",
    "override_locked_orders"
  ]'::jsonb,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;


-- ============================================
-- OPTIONAL: Set default role for new users
-- ============================================

-- If you store role inside users table:
-- UPDATE users SET role = 'customer' WHERE role IS NULL;

-- ============================================
-- END OF FILE
-- ============================================
