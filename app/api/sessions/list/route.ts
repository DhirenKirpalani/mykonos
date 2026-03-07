import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * List all active sessions for the current user
 */
export async function GET(request: Request) {
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

    // Get all sessions for user
    const { data: sessions, error } = await supabase
      .from('sessions' as any)
      .select('id, device_type, browser, os, ip_address, region_code, currency_code, language_code, created_at, last_active_at, is_active')
      .eq('user_id', session.user.id)
      .order('last_active_at', { ascending: false })

    if (error) {
      console.error('List sessions error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      sessions: sessions || [],
    })
  } catch (error: any) {
    console.error('List sessions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
