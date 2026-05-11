import { NextResponse } from 'next/server'

// Fallback rates (approximate mid-market as of 2025) if Frankfurter is unavailable
const FALLBACK_RATES: Record<string, number> = {
  SGD: 1.35, AED: 3.67, EUR: 0.92, GBP: 0.79,
  AUD: 1.55, MYR: 4.72, SAR: 3.75, THB: 36.0,
  JPY: 152.0, KRW: 1380.0, CNY: 7.3, HKD: 7.8,
  CAD: 1.37, CHF: 0.88, NZD: 1.70, BRL: 5.1,
  MXN: 17.5, ZAR: 18.5, INR: 83.5, PHP: 57.0,
  VND: 25200, PKR: 280, BDT: 110, LKR: 325,
  ILS: 3.75, TRY: 32.0, CZK: 23.5, PLN: 4.1,
  HUF: 375.0, RON: 4.6, SEK: 10.8, NOK: 10.7,
  DKK: 6.9,
}

export const revalidate = 3600 // Cache for 1 hour on the server

export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?base=USD', {
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`)

    const data = await res.json()
    return NextResponse.json(data.rates, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (error) {
    console.error('Exchange rate fetch failed, using fallback:', error)
    return NextResponse.json(FALLBACK_RATES, {
      headers: { 'Cache-Control': 'public, s-maxage=600' },
    })
  }
}
