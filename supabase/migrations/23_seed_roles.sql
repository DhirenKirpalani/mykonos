-- Seed roles with permissions
-- Define permissions for each role

-- Customer role (default)
INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'customer',
  'Customer',
  'Regular customer with access to shopping features',
  '["view_products", "manage_own_cart", "place_orders", "view_own_orders", "manage_own_profile", "use_chat"]'::jsonb,
  true
);

-- Support Agent role
INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'support_agent',
  'Support Agent',
  'Customer support representative with access to chat and order viewing',
  '["view_products", "view_all_orders", "view_customer_info", "manage_chat", "send_agent_messages", "view_all_conversations", "update_order_notes"]'::jsonb,
  true
);

-- Inventory Manager role
INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'inventory_manager',
  'Inventory Manager',
  'Manages product inventory and order fulfillment',
  '["view_products", "edit_product_inventory", "view_all_orders", "update_order_status", "add_tracking_info", "manage_shipping", "view_inventory_reports"]'::jsonb,
  true
);

-- Content Manager role
INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'content_manager',
  'Content Manager',
  'Manages website content, products, and collections',
  '["view_products", "create_products", "edit_products", "delete_products", "manage_collections", "manage_homepage_banners", "manage_featured_collections", "manage_featured_products", "manage_fragrance_families", "set_editorial_priority"]'::jsonb,
  true
);

-- Marketing Manager role
INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'marketing_manager',
  'Marketing Manager',
  'Manages promotions, pricing, and marketing campaigns',
  '["view_products", "create_promo_codes", "edit_promo_codes", "delete_promo_codes", "manage_sales_pricing", "view_promo_analytics", "manage_regional_pricing", "view_order_analytics"]'::jsonb,
  true
);

-- Admin role (super user)
INSERT INTO roles (name, display_name, description, permissions, is_active)
VALUES (
  'admin',
  'Administrator',
  'Full system access with all permissions',
  '["*"]'::jsonb,
  true
);
