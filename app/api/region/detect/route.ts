import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { DEFAULT_REGION_CODE } from '@/lib/utils/region'

export const dynamic = 'force-dynamic'

/**
 * Detect user region based on priority:
 * 1. User profile country (if logged in)
 * 2. Shipping address (if previously used)
 * 3. IP geolocation
 * 4. Default region
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    let detectedCountry: string | null = null
    let source: 'user_profile' | 'shipping_address' | 'ip_geolocation' | 'default' = 'default'

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      // Priority 1: User profile country
      const { data: profile } = await supabase
        .from('users')
        .select('country')
        .eq('id', session.user.id)
        .single() as { data: { country: string } | null }

      if (profile?.country) {
        detectedCountry = profile.country
        source = 'user_profile'
      }

      // Priority 2: Default shipping address
      if (!detectedCountry) {
        const { data: address } = await supabase
          .from('shipping_addresses')
          .select('country')
          .eq('user_id', session.user.id)
          .eq('is_default', true)
          .single() as { data: { country: string } | null }

        if (address?.country) {
          detectedCountry = address.country
          source = 'shipping_address'
        }
      }
    }

    // Priority 3: IP geolocation
    if (!detectedCountry) {
      const ipCountry = await detectCountryFromIP(request)
      if (ipCountry) {
        detectedCountry = ipCountry
        source = 'ip_geolocation'
      }
    }

    // Priority 4: Default
    if (!detectedCountry) {
      detectedCountry = 'US'
      source = 'default'
    }

    // Get region information
    const { data: countryRegion } = await supabase
      .from('country_regions')
      .select(`
        *,
        region:regions(*)
      `)
      .eq('country_code', detectedCountry)
      .single() as { data: any }

    if (!countryRegion) {
      // Fallback to default region
      const { data: defaultRegion } = await supabase
        .from('regions')
        .select('*')
        .eq('code', DEFAULT_REGION_CODE)
        .single()

      return NextResponse.json({
        country_code: detectedCountry,
        region: defaultRegion,
        country_region: null,
        shipping_zone: null,
        source,
      })
    }

    // Get shipping zone
    const { data: shippingZone } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('region_id', countryRegion.region.id)
      .single()

    return NextResponse.json({
      country_code: detectedCountry,
      region: countryRegion.region,
      country_region: {
        id: countryRegion.id,
        country_code: countryRegion.country_code,
        region_id: countryRegion.region_id,
        is_shipping_available: countryRegion.is_shipping_available,
        estimated_delivery_days_min: countryRegion.estimated_delivery_days_min,
        estimated_delivery_days_max: countryRegion.estimated_delivery_days_max,
        created_at: countryRegion.created_at,
      },
      shipping_zone: shippingZone,
      source,
    })
  } catch (error: any) {
    console.error('Region detection error:', error)
    
    // Return default region on error
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: defaultRegion } = await supabase
      .from('regions')
      .select('*')
      .eq('code', DEFAULT_REGION_CODE)
      .single()

    return NextResponse.json({
      country_code: 'US',
      region: defaultRegion,
      country_region: null,
      shipping_zone: null,
      source: 'default' as const,
    })
  }
}

/**
 * Detect country from IP address using various services
 */
async function detectCountryFromIP(request: Request): Promise<string | null> {
  try {
    // Try to get country from Vercel/Cloudflare headers
    const countryHeader = request.headers.get('x-vercel-ip-country') || 
                         request.headers.get('cf-ipcountry')
    
    if (countryHeader && countryHeader !== 'XX') {
      return countryHeader
    }

    // Get IP address
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp

    // In development, try to detect from actual public IP
    if (!ip || ip === '127.0.0.1' || ip?.startsWith('192.168.') || ip?.startsWith('::1')) {
      // Option 1: Use real IP detection in development (set USE_REAL_IP_DETECTION=true in .env.local)
      if (process.env.USE_REAL_IP_DETECTION === 'true') {
        try {
          // Get your actual public IP
          const ipResponse = await fetch('https://api.ipify.org?format=json', {
            signal: AbortSignal.timeout(3000),
          })
          if (ipResponse.ok) {
            const { ip: publicIp } = await ipResponse.json()
            console.log('Development mode: Using real public IP:', publicIp)
            
            // Now detect country from this real IP
            const geoResponse = await fetch(`https://ipapi.co/${publicIp}/country/`, {
              headers: { 'User-Agent': 'Mykonos-Ecommerce/1.0' },
              signal: AbortSignal.timeout(3000),
            })
            if (geoResponse.ok) {
              const country = await geoResponse.text()
              const countryCode = country.trim()
              if (countryCode && countryCode !== 'Undefined') {
                console.log('Development mode: Detected country from real IP:', countryCode)
                return countryCode
              }
            }
          }
        } catch (error) {
          console.error('Real IP detection failed:', error)
        }
      }
      
      // Option 2: Force Indonesia for testing (default in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Forcing Indonesia detection')
        return 'ID'
      }
      
      // Option 3: Fallback to browser locale
      const acceptLanguage = request.headers.get('accept-language')
      if (acceptLanguage) {
        const country = detectCountryFromLocale(acceptLanguage)
        if (country) {
          console.log('Using locale-based detection (development mode):', country)
          return country
        }
      }
      return null
    }

    // Production: Use ipapi.co (free tier: 1000 requests/day)
    try {
      const response = await fetch(`https://ipapi.co/${ip}/country/`, {
        headers: { 'User-Agent': 'Mykonos-Ecommerce/1.0' },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      })

      if (response.ok) {
        const country = await response.text()
        const countryCode = country.trim()
        if (countryCode && countryCode !== 'Undefined') {
          return countryCode
        }
      }
    } catch (fetchError) {
      console.error('ipapi.co fetch error:', fetchError)
    }

    return null
  } catch (error) {
    console.error('IP geolocation error:', error)
    return null
  }
}

/**
 * Detect country from browser locale/accept-language header
 * Used as fallback in development or when IP detection fails
 */
function detectCountryFromLocale(acceptLanguage: string): string | null {
  try {
    // Parse accept-language header (e.g., "en-US,en;q=0.9,id-ID;q=0.8")
    const locales = acceptLanguage.split(',').map(l => l.split(';')[0].trim())
    
    // Map of common locale suffixes to country codes
    const localeToCountry: Record<string, string> = {
      'en-US': 'US',
      'en-GB': 'GB',
      'en-AU': 'AU',
      'en-CA': 'CA',
      'id-ID': 'ID',
      'id': 'ID',
      'fr-FR': 'FR',
      'de-DE': 'DE',
      'es-ES': 'ES',
      'it-IT': 'IT',
      'pt-BR': 'BR',
      'ja-JP': 'JP',
      'ko-KR': 'KR',
      'zh-CN': 'CN',
      'zh-TW': 'TW',
      'ar-SA': 'SA',
      'ar-AE': 'AE',
    }

    for (const locale of locales) {
      // Try exact match first
      if (localeToCountry[locale]) {
        return localeToCountry[locale]
      }
      
      // Try extracting country code from locale (e.g., "en-US" -> "US")
      const parts = locale.split('-')
      if (parts.length === 2) {
        const countryCode = parts[1].toUpperCase()
        // Validate it's a 2-letter code
        if (countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
          return countryCode
        }
      }
    }

    return null
  } catch (error) {
    console.error('Locale detection error:', error)
    return null
  }
}
