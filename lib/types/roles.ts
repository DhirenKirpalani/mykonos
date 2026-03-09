// Role and permission types

export type UserRole = 
  | 'customer'
  | 'staff'
  | 'admin'

export interface Role {
  id: string
  name: UserRole
  display_name: string
  description: string | null
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoleChangeLog {
  id: string
  user_id: string
  changed_by: string
  old_role: string | null
  new_role: string
  reason: string | null
  created_at: string
}

// Permission categories
export const PERMISSIONS = {
  // Product permissions
  VIEW_PRODUCTS: 'view_products',
  CREATE_PRODUCTS: 'create_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  EDIT_PRODUCT_INVENTORY: 'edit_product_inventory',
  
  // Collection permissions
  MANAGE_COLLECTIONS: 'manage_collections',
  
  // CMS permissions
  MANAGE_HOMEPAGE_BANNERS: 'manage_homepage_banners',
  MANAGE_FEATURED_COLLECTIONS: 'manage_featured_collections',
  MANAGE_FEATURED_PRODUCTS: 'manage_featured_products',
  MANAGE_FRAGRANCE_FAMILIES: 'manage_fragrance_families',
  SET_EDITORIAL_PRIORITY: 'set_editorial_priority',
  
  // Promo code permissions
  CREATE_PROMO_CODES: 'create_promo_codes',
  EDIT_PROMO_CODES: 'edit_promo_codes',
  DELETE_PROMO_CODES: 'delete_promo_codes',
  MANAGE_SALES_PRICING: 'manage_sales_pricing',
  MANAGE_REGIONAL_PRICING: 'manage_regional_pricing',
  
  // Order permissions
  VIEW_OWN_ORDERS: 'view_own_orders',
  VIEW_ALL_ORDERS: 'view_all_orders',
  UPDATE_ORDER_STATUS: 'update_order_status',
  UPDATE_ORDER_NOTES: 'update_order_notes',
  ADD_TRACKING_INFO: 'add_tracking_info',
  
  // Customer permissions
  VIEW_CUSTOMER_INFO: 'view_customer_info',
  MANAGE_OWN_PROFILE: 'manage_own_profile',
  
  // Cart permissions
  MANAGE_OWN_CART: 'manage_own_cart',
  PLACE_ORDERS: 'place_orders',
  
  // Chat permissions
  USE_CHAT: 'use_chat',
  MANAGE_CHAT: 'manage_chat',
  SEND_AGENT_MESSAGES: 'send_agent_messages',
  VIEW_ALL_CONVERSATIONS: 'view_all_conversations',
  
  // Shipping permissions
  MANAGE_SHIPPING: 'manage_shipping',
  
  // Analytics permissions
  VIEW_PROMO_ANALYTICS: 'view_promo_analytics',
  VIEW_ORDER_ANALYTICS: 'view_order_analytics',
  VIEW_INVENTORY_REPORTS: 'view_inventory_reports',
  
  // Admin permissions
  ALL: '*',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_OWN_CART,
    PERMISSIONS.PLACE_ORDERS,
    PERMISSIONS.VIEW_OWN_ORDERS,
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.USE_CHAT,
  ],
  staff: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.EDIT_PRODUCT_INVENTORY,
    PERMISSIONS.MANAGE_COLLECTIONS,
    PERMISSIONS.MANAGE_HOMEPAGE_BANNERS,
    PERMISSIONS.MANAGE_FEATURED_COLLECTIONS,
    PERMISSIONS.MANAGE_FEATURED_PRODUCTS,
    PERMISSIONS.MANAGE_FRAGRANCE_FAMILIES,
    PERMISSIONS.SET_EDITORIAL_PRIORITY,
    PERMISSIONS.CREATE_PROMO_CODES,
    PERMISSIONS.EDIT_PROMO_CODES,
    PERMISSIONS.DELETE_PROMO_CODES,
    PERMISSIONS.MANAGE_SALES_PRICING,
    PERMISSIONS.MANAGE_REGIONAL_PRICING,
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.UPDATE_ORDER_STATUS,
    PERMISSIONS.UPDATE_ORDER_NOTES,
    PERMISSIONS.ADD_TRACKING_INFO,
    PERMISSIONS.MANAGE_SHIPPING,
    PERMISSIONS.VIEW_CUSTOMER_INFO,
    PERMISSIONS.MANAGE_CHAT,
    PERMISSIONS.SEND_AGENT_MESSAGES,
    PERMISSIONS.VIEW_ALL_CONVERSATIONS,
    PERMISSIONS.VIEW_PROMO_ANALYTICS,
    PERMISSIONS.VIEW_ORDER_ANALYTICS,
    PERMISSIONS.VIEW_INVENTORY_REPORTS,
  ],
  admin: [PERMISSIONS.ALL],
}
