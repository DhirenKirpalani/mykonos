import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Apply promo code to order (record usage)
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
    const { promo_code_id, order_id, discount_amount } = body

    if (!promo_code_id || !order_id || discount_amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Record promo code usage
    const { error } = await supabase.rpc('record_promo_code_usage', {
      p_promo_code_id: promo_code_id,
      p_user_id: session.user.id,
      p_order_id: order_id,
      p_discount_amount: discount_amount,
    } as any)

    if (error) {
      console.error('Promo code application error:', error)
      return NextResponse.json(
        { error: 'Failed to apply promo code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Promo code applied successfully',
    })
  } catch (error: any) {
    console.error('Promo code application error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to apply promo code' },
      { status: 500 }
    )
  }
}
