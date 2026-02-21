/**
 * Currency utilities for location-based pricing
 */

export type Currency = 'USD' | 'IDR' | 'EUR'

export interface CurrencyInfo {
  code: Currency
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    locale: 'id-ID',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
}

/**
 * Detect user's currency based on their location
 */
export async function detectUserCurrency(): Promise<Currency> {
  try {
    // Try to get location from browser's geolocation API
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    
    const countryCode = data.country_code
    
    // Map country codes to currencies
    if (countryCode === 'ID') return 'IDR' // Indonesia
    if (['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'].includes(countryCode)) {
      return 'EUR' // Eurozone countries
    }
    
    // Default to USD
    return 'USD'
  } catch (error) {
    console.error('Failed to detect currency:', error)
    // Default to USD if detection fails
    return 'USD'
  }
}

/**
 * Get currency from localStorage or detect it
 */
export function getUserCurrency(): Currency {
  if (typeof window === 'undefined') return 'USD'
  
  const stored = localStorage.getItem('preferred_currency')
  if (stored && (stored === 'USD' || stored === 'IDR' || stored === 'EUR')) {
    return stored as Currency
  }
  
  return 'USD'
}

/**
 * Set user's preferred currency
 */
export function setUserCurrency(currency: Currency): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('preferred_currency', currency)
}

/**
 * Format price based on currency
 */
export function formatPrice(
  price: number,
  currency: Currency,
  options?: Intl.NumberFormatOptions
): string {
  const currencyInfo = CURRENCIES[currency]
  
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    ...options,
  }).format(price)
}

/**
 * Get price for product based on currency
 */
export function getProductPrice(
  product: {
    price: number
    price_idr: number
    price_eur: number
  },
  currency: Currency
): number {
  switch (currency) {
    case 'IDR':
      return product.price_idr
    case 'EUR':
      return product.price_eur
    case 'USD':
    default:
      return product.price
  }
}
