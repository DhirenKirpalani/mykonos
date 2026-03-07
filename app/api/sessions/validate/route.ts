import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Validate a session token
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const body = await request.json()
    const { session_token } = body

    if (!session_token) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      )
    }

    // Validate session using database function
    const { data, error } = await supabase.rpc('validate_session', {
      p_session_token: session_token,
    } as any)

    if (error) {
      console.error('Validate session error:', error)
      return NextResponse.json(
        { error: 'Failed to validate session' },
        { status: 500 }
      )
    }

    const sessionData: any = Array.isArray(data) ? data[0] : data

    if (!sessionData || !sessionData.is_valid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      valid: true,
      session: sessionData,
    })
  } catch (error: any) {
    console.error('Validate session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate session' },
      { status: 500 }
    )
  }
}
