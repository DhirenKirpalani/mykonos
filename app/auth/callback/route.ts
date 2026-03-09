import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// Track processed codes to prevent duplicates (in-memory cache)
const processedCodes = new Set<string>()
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle error from Supabase
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    // Idempotency check - prevent duplicate processing
    if (processedCodes.has(code)) {
      console.log('Code already processed, skipping')
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    try {
      // Mark code as being processed
      processedCodes.add(code)
      
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Exchange code error:', exchangeError)
        
        // Handle rate limit specifically
        if (exchangeError.message?.includes('rate limit')) {
          return NextResponse.redirect(
            new URL('/?error=rate_limit', requestUrl.origin)
          )
        }
        
        return NextResponse.redirect(
          new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        )
      }

      // Clean up processed code after expiry
      setTimeout(() => processedCodes.delete(code), CACHE_EXPIRY)
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      processedCodes.delete(code) // Remove from cache on error
      return NextResponse.redirect(
        new URL('/?error=auth_failed', requestUrl.origin)
      )
    }
  }

  // Redirect to home page after successful confirmation
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
