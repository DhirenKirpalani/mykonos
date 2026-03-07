import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Create a new session (for login or guest)
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { session: authSession } } = await supabase.auth.getSession()
    const body = await request.json()
    
    const {
      region_code = 'US',
      currency_code = 'USD',
      language_code = 'en',
      device_type,
      browser,
      os,
    } = body

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                request.headers.get('x-real-ip') || 
                null
    const userAgent = request.headers.get('user-agent') || null

    // Generate session token
    const sessionToken = `sess_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`

    // Create session using database function
    const { data, error } = await supabase.rpc('create_session', {
      p_user_id: authSession?.user?.id || null,
      p_session_token: sessionToken,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_device_type: device_type,
      p_browser: browser,
      p_os: os,
      p_region_code: region_code,
      p_currency_code: currency_code,
      p_language_code: language_code,
      p_login_method: authSession?.user ? 'email' : 'guest',
      p_expires_in_hours: 720, // 30 days
    } as any)

    if (error) {
      console.error('Create session error:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      session_id: data,
      session_token: sessionToken,
    })
  } catch (error: any) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}
