import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get regional pricing for a product
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      )
    }

    // Get regional pricing
    const { data: pricing, error } = await supabase
      .from('product_regional_pricing')
      .select('*, region:regions(*)')
      .eq('product_id', productId)
      .order('region_id')

    if (error) throw error

    return NextResponse.json({ pricing: pricing || [] })
  } catch (error: any) {
    console.error('Regional pricing fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch regional pricing' },
      { status: 500 }
    )
  }
}

/**
 * Set regional price
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

    const body = await request.json()
    const {
      product_id,
      region_id,
      price,
      sale_price,
      sale_start_date,
      sale_end_date,
    } = body

    if (!product_id || !region_id || !price) {
      return NextResponse.json(
        { error: 'Product ID, region ID, and price are required' },
        { status: 400 }
      )
    }

    // Use database function to set regional price
    const { error } = await supabase.rpc('set_regional_price', {
      p_product_id: product_id,
      p_region_id: region_id,
      p_price: price,
      p_sale_price: sale_price || null,
      p_sale_start_date: sale_start_date || null,
      p_sale_end_date: sale_end_date || null,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Regional price set successfully',
    })
  } catch (error: any) {
    console.error('Set regional price error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to set regional price' },
      { status: 500 }
    )
  }
}
