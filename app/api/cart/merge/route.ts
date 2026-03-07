import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Merge guest cart into user cart on login
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
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Call merge function
    const { error } = await supabase.rpc('merge_guest_cart', {
      p_session_id: session_id,
      p_user_id: session.user.id,
    } as any)

    if (error) {
      console.error('Cart merge error:', error)
      return NextResponse.json(
        { error: 'Failed to merge cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cart merged successfully' 
    })
  } catch (error: any) {
    console.error('Cart merge error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to merge cart' },
      { status: 500 }
    )
  }
}
