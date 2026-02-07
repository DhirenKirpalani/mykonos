import { CartItemWithProduct, CartSummary } from '@/lib/types/cart'
import { getEffectivePrice } from './pricing'

/**
 * Generate a unique session ID for guest carts
 */
export function generateSessionId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get session ID from localStorage or create new one
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('cart_session_id')
  
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('cart_session_id', sessionId)
  }
  
  return sessionId
}

/**
 * Clear session ID (after login/merge)
 */
export function clearSessionId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('cart_session_id')
}

/**
 * Calculate cart subtotal
 */
export function calculateCartSubtotal(items: CartItemWithProduct[]): number {
  return items.reduce((total, item) => {
    const price = getEffectivePrice(item.product.price, item.product.sale_price)
    return total + (price * item.quantity)
  }, 0)
}

/**
 * Calculate total item count
 */
export function calculateCartItemCount(items: CartItemWithProduct[]): number {
  return items.reduce((count, item) => count + item.quantity, 0)
}

/**
 * Check if cart has any validation issues
 */
export function hasCartIssues(summary: CartSummary): boolean {
  return summary.validation_issues.some(issue => !issue.is_valid || issue.issue_type !== null)
}

/**
 * Get cart items with issues
 */
export function getItemsWithIssues(summary: CartSummary): CartItemWithProduct[] {
  const issueItemIds = new Set(
    summary.validation_issues
      .filter(issue => !issue.is_valid || issue.issue_type !== null)
      .map(issue => issue.cart_item_id)
  )
  
  return summary.items.filter(item => issueItemIds.has(item.id))
}

/**
 * Check if price has changed for cart item
 */
export function hasPriceChanged(item: CartItemWithProduct): boolean {
  if (!item.price_at_add) return false
  const currentPrice = getEffectivePrice(item.product.price, item.product.sale_price)
  return Math.abs(currentPrice - item.price_at_add) > 0.01
}

/**
 * Get price change amount
 */
export function getPriceChange(item: CartItemWithProduct): number {
  if (!item.price_at_add) return 0
  const currentPrice = getEffectivePrice(item.product.price, item.product.sale_price)
  return currentPrice - item.price_at_add
}

/**
 * Check if item is in stock
 */
export function isInStock(item: CartItemWithProduct): boolean {
  return item.product.stock_quantity >= item.quantity
}

/**
 * Get maximum available quantity
 */
export function getMaxQuantity(item: CartItemWithProduct): number {
  return Math.min(item.product.stock_quantity, 10) // Cap at 10 for UI
}

/**
 * Validate cart for checkout
 */
export function canCheckout(summary: CartSummary): { canCheckout: boolean; reason: string | null } {
  if (summary.items.length === 0) {
    return { canCheckout: false, reason: 'Cart is empty' }
  }
  
  if (summary.has_issues) {
    const invalidItems = summary.validation_issues.filter(issue => !issue.is_valid)
    if (invalidItems.length > 0) {
      return { canCheckout: false, reason: 'Some items are no longer available' }
    }
  }
  
  return { canCheckout: true, reason: null }
}
