import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Save visitor region preference to database
 * This persists the visitor's manually selected region
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    // Use service role key to bypass RLS for visitor_preferences
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()
    const { session_id, region_id, ip_address, browser_locale, detected_country_code } = body

    if (!session_id || !region_id) {
      return NextResponse.json(
        { error: 'session_id and region_id are required' },
        { status: 400 }
      )
    }

    // Verify region exists and is active
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('id, code, name')
      .eq('id', region_id)
      .eq('is_active', true)
      .single()

    if (regionError || !region) {
      return NextResponse.json(
        { error: 'Invalid or inactive region' },
        { status: 400 }
      )
    }

    // Call the database function to set visitor preference
    const { data, error } = await supabase.rpc('set_visitor_region_preference', {
      p_session_id: session_id,
      p_region_id: region_id,
      p_ip_address: ip_address || null,
      p_browser_locale: browser_locale || null,
      p_detected_country_code: detected_country_code || null,
    } as any)

    if (error) {
      console.error('Failed to save visitor preference:', error)
      return NextResponse.json(
        { error: 'Failed to save preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preference_id: data,
      region: region,
    })
  } catch (error: any) {
    console.error('Visitor preference error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get visitor region preference from database
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get visitor preference
    const { data: preference, error } = await supabase
      .from('visitor_preferences' as any)
      .select(`
        *,
        region:regions(*)
      `)
      .eq('session_id', sessionId)
      .single()

    if (error || !preference) {
      return NextResponse.json(
        { preference: null },
        { status: 200 }
      )
    }

    const pref = preference as any

    return NextResponse.json({
      preference: {
        id: pref.id,
        session_id: pref.session_id,
        preferred_region_id: pref.preferred_region_id,
        ip_address: pref.ip_address,
        browser_locale: pref.browser_locale,
        detected_country_code: pref.detected_country_code,
        created_at: pref.created_at,
        updated_at: pref.updated_at,
      },
      region: pref.region,
    })
  } catch (error: any) {
    console.error('Get visitor preference error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
