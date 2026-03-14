import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | undefined | null, currency: string = 'USD'): string {
  // Handle undefined/null prices
  if (price === undefined || price === null || isNaN(price)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(0)
  }
  
  // Detect if we should use IDR based on browser locale or explicit currency
  const locale = typeof window !== 'undefined' ? navigator.language : 'en-US'
  const isIndonesia = locale.startsWith('id') || currency === 'IDR'
  
  const actualCurrency = isIndonesia ? 'IDR' : currency
  const actualLocale = isIndonesia ? 'id-ID' : 'en-US'
  
  // Format with proper thousand separators
  if (isIndonesia) {
    // Custom formatting for IDR: Rp. 100,000
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
    return `Rp. ${formatted}`
  }
  
  return new Intl.NumberFormat(actualLocale, {
    style: 'currency',
    currency: actualCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
