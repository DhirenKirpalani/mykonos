/**
 * Currency utilities for location-based pricing
 */

export type Currency = 
  | 'USD' | 'IDR' | 'EUR' | 'GBP' | 'SGD' | 'MYR' | 'AUD' | 'NZD'
  | 'JPY' | 'CNY' | 'HKD' | 'THB' | 'PHP' | 'VND' | 'KRW'
  | 'CAD' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK'
  | 'HUF' | 'RON' | 'BGN' | 'HRK' | 'RUB' | 'TRY' | 'ZAR'
  | 'INR' | 'BRL' | 'MXN' | 'ARS' | 'CLP' | 'COP' | 'PEN'
  | 'AED' | 'SAR' | 'QAR' | 'KWD' | 'BHD' | 'OMR' | 'JOD'
  | 'ILS' | 'EGP' | 'MAD' | 'TND' | 'DZD' | 'LBP' | 'IQD'

export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  locale: string
  decimals: number
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  // Major currencies
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0 },
  
  // Asia Pacific
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID', decimals: 0 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY', decimals: 2 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH', decimals: 2 },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH', decimals: 2 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', decimals: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'en-HK', decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR', decimals: 0 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', decimals: 2 },
  
  // Oceania
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2 },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ', decimals: 2 },
  
  // Americas
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', decimals: 2 },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX', decimals: 2 },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', locale: 'es-AR', decimals: 2 },
  CLP: { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', locale: 'es-CL', decimals: 0 },
  COP: { code: 'COP', symbol: 'CO$', name: 'Colombian Peso', locale: 'es-CO', decimals: 0 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', locale: 'es-PE', decimals: 2 },
  
  // Europe
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', decimals: 2 },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE', decimals: 2 },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO', decimals: 2 },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', locale: 'da-DK', decimals: 2 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL', decimals: 2 },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ', decimals: 2 },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU', decimals: 0 },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', locale: 'ro-RO', decimals: 2 },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', locale: 'bg-BG', decimals: 2 },
  HRK: { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', locale: 'hr-HR', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU', decimals: 2 },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR', decimals: 2 },
  
  // Middle East & Africa
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE', decimals: 2 },
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', locale: 'ar-SA', decimals: 2 },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', locale: 'ar-QA', decimals: 2 },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', locale: 'ar-KW', decimals: 3 },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', locale: 'ar-BH', decimals: 3 },
  OMR: { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', locale: 'ar-OM', decimals: 3 },
  JOD: { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', locale: 'ar-JO', decimals: 3 },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', locale: 'he-IL', decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA', decimals: 2 },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', locale: 'ar-EG', decimals: 2 },
}

/**
 * Get currency info for a currency code
 * Returns USD info if currency not found
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  return CURRENCIES[currencyCode] || CURRENCIES['USD']
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
    
    // Default to IDR (Indonesia)
    return 'IDR'
  } catch (error) {
    console.error('Failed to detect currency:', error)
    // Default to IDR if detection fails
    return 'IDR'
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
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
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
