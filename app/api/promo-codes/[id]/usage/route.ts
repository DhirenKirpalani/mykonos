import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get promo code usage history
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check permission
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['marketing_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Marketing manager access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Get usage history
    const { data: usage, error } = await supabase
      .from('promo_code_usage')
      .select('*, user:users(first_name, last_name, email), order:orders(order_number, total_amount)')
      .eq('promo_code_id', id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Get usage statistics
    const { data: stats } = await supabase
      .from('promo_code_stats' as any)
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      usage: usage || [],
      stats: stats || null,
    })
  } catch (error: any) {
    console.error('Promo code usage fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promo code usage' },
      { status: 500 }
    )
  }
}
