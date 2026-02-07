import { Region, PriceDisplay } from '@/lib/types/region'

/**
 * Format price with currency symbol and proper formatting
 */
export function formatPrice(
  amount: number,
  region: Region,
  options: {
    showCurrency?: boolean
    decimals?: number
  } = {}
): string {
  const { showCurrency = true, decimals = 2 } = options

  const formatted = amount.toFixed(decimals)
  
  if (!showCurrency) {
    return formatted
  }

  // Format based on currency
  switch (region.currency_code) {
    case 'USD':
    case 'GBP':
      return `${region.currency_symbol}${formatted}`
    case 'EUR':
      return `${formatted}${region.currency_symbol}`
    default:
      return `${region.currency_symbol}${formatted}`
  }
}

/**
 * Get price display object with formatting
 */
export function getPriceDisplay(
  price: number,
  region: Region,
  salePrice?: number | null
): PriceDisplay {
  const hasDiscount = salePrice !== null && salePrice !== undefined && salePrice < price

  return {
    amount: hasDiscount ? salePrice! : price,
    formatted: formatPrice(hasDiscount ? salePrice! : price, region),
    currency_code: region.currency_code,
    currency_symbol: region.currency_symbol,
    original_amount: hasDiscount ? price : undefined,
    original_formatted: hasDiscount ? formatPrice(price, region) : undefined,
    is_sale: hasDiscount,
  }
}

/**
 * Calculate price with tax
 */
export function calculatePriceWithTax(price: number, taxRate: number): number {
  return price * (1 + taxRate / 100)
}

/**
 * Get delivery estimate text
 */
export function getDeliveryEstimate(
  minDays: number | null,
  maxDays: number | null
): string {
  if (!minDays || !maxDays) {
    return 'Delivery time varies'
  }

  if (minDays === maxDays) {
    return `${minDays} business days`
  }

  return `${minDays}-${maxDays} business days`
}

/**
 * Check if free shipping threshold is met
 */
export function isFreeShippingEligible(
  cartTotal: number,
  threshold: number | null
): boolean {
  if (!threshold) return false
  return cartTotal >= threshold
}

/**
 * Get shipping cost
 */
export function getShippingCost(
  cartTotal: number,
  baseRate: number,
  freeShippingThreshold: number | null
): number {
  if (isFreeShippingEligible(cartTotal, freeShippingThreshold)) {
    return 0
  }
  return baseRate
}

/**
 * Default region code
 */
export const DEFAULT_REGION_CODE = 'US'

/**
 * Get region from country code
 */
export function getRegionCodeFromCountry(countryCode: string): string {
  const euCountries = [
    'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR',
    'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE',
    'LV', 'LT', 'DK', 'SE', 'FI', 'IE', 'CH', 'NO'
  ]

  const apacCountries = ['JP', 'KR', 'CN', 'SG', 'HK', 'AU', 'NZ', 'IN', 'ZA']
  const menaCountries = ['AE', 'SA', 'IL', 'TR']
  const latamCountries = ['BR', 'MX', 'AR', 'CL', 'CO']

  if (countryCode === 'US' || countryCode === 'CA') return 'US'
  if (countryCode === 'GB') return 'UK'
  if (euCountries.includes(countryCode)) return 'EU'
  if (apacCountries.includes(countryCode)) return 'APAC'
  if (menaCountries.includes(countryCode)) return 'MENA'
  if (latamCountries.includes(countryCode)) return 'LATAM'

  return DEFAULT_REGION_CODE
}
