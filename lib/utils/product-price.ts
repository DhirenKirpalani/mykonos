/**
 * Utility functions for getting product prices based on region
 */

export interface ProductWithPrices {
  price_usd?: number | null
  price_idr?: number | null
  sale_price?: number | null
  compare_at_price?: number | null
}

/**
 * Get the appropriate price for a product based on region code
 */
export function getProductPrice(
  product: ProductWithPrices,
  regionCode?: string
): number {
  if (regionCode === 'ID' && product.price_idr) {
    return product.price_idr
  }
  return product.price_usd || 0
}

/**
 * Get the effective price (considering sales) for a product based on region
 */
export function getEffectiveProductPrice(
  product: ProductWithPrices,
  regionCode?: string
): number {
  const basePrice = getProductPrice(product, regionCode)
  
  // For IDR region, use compare_at_price if available and lower than base price
  if (regionCode === 'ID' && product.compare_at_price && product.compare_at_price < basePrice) {
    return product.compare_at_price
  }
  
  // For other regions, use sale_price if available and lower than base price
  if (product.sale_price && product.sale_price < basePrice) {
    return product.sale_price
  }
  
  return basePrice
}
