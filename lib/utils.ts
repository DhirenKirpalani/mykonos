import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Exchange Rate Store ────────────────────────────────────────────────────────
// Module-level cache; populated once per browser session via loadExchangeRates()
let _exchangeRates: Record<string, number> = {}
let _ratesLoaded = false

/** Call this from RegionContext after detecting a non-USD/IDR region. */
export function setExchangeRates(rates: Record<string, number>): void {
  _exchangeRates = rates
  _ratesLoaded = true
}

/** Fetch rates from /api/exchange-rates with localStorage caching (1 h TTL). */
export async function loadExchangeRates(): Promise<void> {
  if (_ratesLoaded) return
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fx_rates')
      const cachedAt = localStorage.getItem('fx_rates_at')
      if (cached && cachedAt && Date.now() - parseInt(cachedAt) < 3_600_000) {
        setExchangeRates(JSON.parse(cached))
        return
      }
    }
    const res = await fetch('/api/exchange-rates')
    if (res.ok) {
      const rates = await res.json()
      setExchangeRates(rates)
      if (typeof window !== 'undefined') {
        localStorage.setItem('fx_rates', JSON.stringify(rates))
        localStorage.setItem('fx_rates_at', Date.now().toString())
      }
    }
  } catch (e) {
    console.error('loadExchangeRates failed:', e)
  }
}

// ── formatPrice ────────────────────────────────────────────────────────────────
/**
 * Format a price value for display with currency code.
 * - IDR prices are passed pre-converted (price_idr field) — format as IDR.
 * - USD is formatted with USD prefix.
 * - Any other currency: multiply the USD value by the mid-market exchange rate
 *   (loaded from /api/exchange-rates), then format with currency code.
 */
export function formatPrice(price: number | undefined | null, currency: string = 'USD'): string {
  if (price === undefined || price === null || isNaN(price)) {
    return 'USD 0.00'
  }

  // IDR — already the local price, just format it
  if (currency === 'IDR') {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
    return `IDR ${formatted}`
  }

  // Non-USD: apply exchange rate (price is in USD)
  let displayPrice = price
  if (currency !== 'USD' && _exchangeRates[currency]) {
    displayPrice = price * _exchangeRates[currency]
  }

  // Zero-decimal currencies (no cents)
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'IDR'].includes(currency)

  // Format the number without currency symbol
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(displayPrice)
  
  // Return with currency code prefix
  return `${currency} ${formatted}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
