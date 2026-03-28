import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Validate promo code
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
    const { code, region_id, cart_total, product_ids, shipping_cost } = body

    if (!code || !region_id || cart_total === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Call validation function with scope-aware params
    const { data: validation, error } = await supabase.rpc('validate_promo_code', {
      p_code: code.toUpperCase(),
      p_user_id: session.user.id,
      p_region_id: region_id,
      p_cart_total: cart_total,
      p_shipping_cost: shipping_cost || 0,
      p_product_ids: product_ids || null,
    } as any) as { data: any; error: any }

    if (error) {
      console.error('Promo code validation error:', error)
      return NextResponse.json(
        { error: 'Failed to validate promo code' },
        { status: 500 }
      )
    }

    const result = Array.isArray(validation) ? validation[0] : validation

    if (!result.is_valid) {
      return NextResponse.json({
        is_valid: false,
        error_message: result.error_message,
        discount_amount: 0,
        promo_code_id: null,
      })
    }

    // Get full promo code details
    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', result.promo_code_id)
      .single()

    return NextResponse.json({
      is_valid: true,
      error_message: null,
      discount_amount: result.discount_amount,
      promo_code_id: result.promo_code_id,
      promo_code: promoCode,
    })
  } catch (error: any) {
    console.error('Promo code validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate promo code' },
      { status: 500 }
    )
  }
}
