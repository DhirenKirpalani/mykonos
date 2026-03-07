import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  // Detect if we should use IDR based on browser locale or explicit currency
  const locale = typeof window !== 'undefined' ? navigator.language : 'en-US'
  const isIndonesia = locale.startsWith('id') || currency === 'IDR'
  
  const actualCurrency = isIndonesia ? 'IDR' : currency
  const actualLocale = isIndonesia ? 'id-ID' : 'en-US'
  
  return new Intl.NumberFormat(actualLocale, {
    style: 'currency',
    currency: actualCurrency,
  }).format(price)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
