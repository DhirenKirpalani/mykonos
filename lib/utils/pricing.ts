import { Region } from '@/lib/types/region'
import { PromoCode, PricingCalculation } from '@/lib/types/promo'

/**
 * Get effective price for a product (sale price overrides base price)
 */
export function getEffectivePrice(basePrice: number, salePrice: number | null): number {
  if (salePrice !== null && salePrice > 0 && salePrice < basePrice) {
    return salePrice
  }
  return basePrice
}

/**
 * Calculate discount amount from promo code
 */
export function calculatePromoDiscount(
  promoCode: PromoCode,
  subtotal: number
): number {
  let discount = 0

  if (promoCode.discount_type === 'percentage') {
    discount = subtotal * (promoCode.discount_value / 100)
  } else {
    discount = promoCode.discount_value
  }

  // Apply max discount cap
  if (promoCode.max_discount_amount && discount > promoCode.max_discount_amount) {
    discount = promoCode.max_discount_amount
  }

  // Ensure discount doesn't exceed subtotal
  if (discount > subtotal) {
    discount = subtotal
  }

  return Math.round(discount * 100) / 100
}

/**
 * Calculate order pricing with promo code
 */
export function calculateOrderPricing(
  subtotal: number,
  shippingCost: number,
  taxRate: number,
  promoCode: PromoCode | null = null
): PricingCalculation {
  // Calculate discount
  let discount = 0
  let discountType: 'promo_code' | 'sale' | null = null
  let discountDescription: string | null = null
  let promoCodeApplied: string | null = null

  if (promoCode) {
    discount = calculatePromoDiscount(promoCode, subtotal)
    discountType = 'promo_code'
    discountDescription = promoCode.description || `Promo code: ${promoCode.code}`
    promoCodeApplied = promoCode.code
  }

  // Calculate totals
  const discountedSubtotal = Math.max(0, subtotal - discount)
  const tax = Math.round(discountedSubtotal * (taxRate / 100) * 100) / 100
  const total = Math.max(0, discountedSubtotal + shippingCost + tax)

  return {
    subtotal,
    discount,
    discount_type: discountType,
    discount_description: discountDescription,
    shipping: shippingCost,
    tax,
    total,
    promo_code_applied: promoCodeApplied,
  }
}

/**
 * Validate promo code requirements
 */
export function validatePromoCodeRequirements(
  promoCode: PromoCode,
  subtotal: number
): { valid: boolean; error: string | null } {
  // Check minimum purchase amount
  if (promoCode.min_purchase_amount && subtotal < promoCode.min_purchase_amount) {
    return {
      valid: false,
      error: `Minimum purchase of $${promoCode.min_purchase_amount.toFixed(2)} required`,
    }
  }

  // Check validity dates
  const now = new Date()
  
  if (promoCode.valid_from) {
    const validFrom = new Date(promoCode.valid_from)
    if (now < validFrom) {
      return {
        valid: false,
        error: 'Promo code is not yet valid',
      }
    }
  }

  if (promoCode.valid_until) {
    const validUntil = new Date(promoCode.valid_until)
    if (now > validUntil) {
      return {
        valid: false,
        error: 'Promo code has expired',
      }
    }
  }

  // Check global usage limit
  if (promoCode.usage_limit_global && promoCode.usage_count >= promoCode.usage_limit_global) {
    return {
      valid: false,
      error: 'Promo code usage limit reached',
    }
  }

  return { valid: true, error: null }
}

/**
 * Format discount display
 */
export function formatDiscount(
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  region: Region
): string {
  if (discountType === 'percentage') {
    return `${discountValue}% off`
  } else {
    return `${region.currency_symbol}${discountValue.toFixed(2)} off`
  }
}

/**
 * Calculate savings from sale price
 */
export function calculateSavings(basePrice: number, salePrice: number): number {
  return Math.max(0, basePrice - salePrice)
}

/**
 * Calculate savings percentage
 */
export function calculateSavingsPercentage(basePrice: number, salePrice: number): number {
  if (basePrice <= 0) return 0
  const savings = calculateSavings(basePrice, salePrice)
  return Math.round((savings / basePrice) * 100)
}

/**
 * Prevent total from going below zero
 */
export function ensurePositiveTotal(total: number): number {
  return Math.max(0, total)
}
