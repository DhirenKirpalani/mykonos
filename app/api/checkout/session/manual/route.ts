import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Create checkout session manually with provided cart and pricing data
 * Used for Buy Now flow where items aren't in the cart
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { user_id, cart_snapshot, pricing_snapshot } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    if (!cart_snapshot || !Array.isArray(cart_snapshot) || cart_snapshot.length === 0) {
      return NextResponse.json(
        { error: 'Cart snapshot required' },
        { status: 400 }
      )
    }

    if (!pricing_snapshot) {
      return NextResponse.json(
        { error: 'Pricing snapshot required' },
        { status: 400 }
      )
    }

    const { data: checkoutSession, error: sessionError } = await supabase
      .from('checkout_sessions')
      .insert({
        user_id: user_id,
        session_id: null,
        current_step: 1,
        cart_snapshot: cart_snapshot as any,
        pricing_snapshot: pricing_snapshot as any,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } as any)
      .select()
      .single()

    if (sessionError) throw sessionError

    const typedSession = checkoutSession as any

    // Reserve inventory for the checkout session
    const { error: reserveError } = await supabase.rpc('reserve_inventory_for_checkout', {
      p_checkout_session_id: typedSession.id,
      p_user_id: user_id,
      p_session_id: null
    } as any)

    if (reserveError) {
      await supabase.from('checkout_sessions').delete().eq('id', typedSession.id)
      throw reserveError
    }

    return NextResponse.json({
      session_id: typedSession.id,
      expires_at: typedSession.expires_at
    })
  } catch (error: any) {
    console.error('Create manual checkout session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
