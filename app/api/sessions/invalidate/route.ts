import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Invalidate a session (logout from one device)
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { session_id, all_devices = false } = body

    if (all_devices) {
      // Invalidate all sessions for user
      const { data, error } = await supabase.rpc('invalidate_all_user_sessions', {
        p_user_id: session.user.id,
      } as any)

      if (error) {
        console.error('Invalidate all sessions error:', error)
        return NextResponse.json(
          { error: 'Failed to invalidate sessions' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true,
        message: `Logged out from ${data} device(s)`,
        count: data,
      })
    } else {
      // Invalidate single session
      if (!session_id) {
        return NextResponse.json(
          { error: 'Session ID is required' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase.rpc('invalidate_session', {
        p_session_id: session_id,
      } as any)

      if (error) {
        console.error('Invalidate session error:', error)
        return NextResponse.json(
          { error: 'Failed to invalidate session' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true,
        message: 'Session invalidated',
      })
    }
  } catch (error: any) {
    console.error('Invalidate session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invalidate session' },
      { status: 500 }
    )
  }
}
