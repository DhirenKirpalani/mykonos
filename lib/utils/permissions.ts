/**
 * Permission checking utilities
 */

import type { UserRole, Permission } from '@/lib/types/roles'
import { ROLE_PERMISSIONS, PERMISSIONS } from '@/lib/types/roles'

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role]
  
  // Admin has all permissions
  if (rolePermissions.includes(PERMISSIONS.ALL)) {
    return true
  }
  
  return rolePermissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Check if user can access CMS
 */
export function canAccessCMS(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.MANAGE_HOMEPAGE_BANNERS,
    PERMISSIONS.MANAGE_FEATURED_COLLECTIONS,
    PERMISSIONS.MANAGE_FEATURED_PRODUCTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.CREATE_PROMO_CODES,
  ])
}

/**
 * Check if user can manage products
 */
export function canManageProducts(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
  ])
}

/**
 * Check if user can manage inventory
 */
export function canManageInventory(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.EDIT_PRODUCT_INVENTORY)
}

/**
 * Check if user can manage orders
 */
export function canManageOrders(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.UPDATE_ORDER_STATUS,
  ])
}

/**
 * Check if user can manage promotions
 */
export function canManagePromotions(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.CREATE_PROMO_CODES,
    PERMISSIONS.EDIT_PROMO_CODES,
    PERMISSIONS.DELETE_PROMO_CODES,
  ])
}

/**
 * Check if user can access support features
 */
export function canAccessSupport(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.MANAGE_CHAT,
    PERMISSIONS.VIEW_ALL_CONVERSATIONS,
  ])
}

/**
 * Get role display information
 */
export function getRoleInfo(role: UserRole): {
  name: string
  color: string
  description: string
} {
  const roleInfo: Record<UserRole, { name: string; color: string; description: string }> = {
    customer: {
      name: 'Customer',
      color: 'gray',
      description: 'Regular customer account',
    },
    support_agent: {
      name: 'Support Agent',
      color: 'blue',
      description: 'Customer support representative',
    },
    inventory_manager: {
      name: 'Inventory Manager',
      color: 'purple',
      description: 'Manages inventory and fulfillment',
    },
    content_manager: {
      name: 'Content Manager',
      color: 'green',
      description: 'Manages website content',
    },
    marketing_manager: {
      name: 'Marketing Manager',
      color: 'orange',
      description: 'Manages promotions and marketing',
    },
    admin: {
      name: 'Administrator',
      color: 'red',
      description: 'Full system access',
    },
  }

  return roleInfo[role]
}
