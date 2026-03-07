import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Record user acceptance of terms of service and privacy policy
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { terms_version = '1.0', privacy_version = '1.0' } = body

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                null
    const userAgent = request.headers.get('user-agent') || null

    // Call database function to record acceptance
    const { data, error } = await supabase.rpc('record_terms_acceptance', {
      p_user_id: session.user.id,
      p_terms_version: terms_version,
      p_privacy_version: privacy_version,
      p_ip_address: ip,
      p_user_agent: userAgent,
    } as any)

    if (error) {
      console.error('Terms acceptance error:', error)
      return NextResponse.json(
        { error: 'Failed to record terms acceptance' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Terms acceptance recorded'
    })
  } catch (error: any) {
    console.error('Terms acceptance error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record terms acceptance' },
      { status: 500 }
    )
  }
}
