import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Schedule sale pricing
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

    // Check permission
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['staff', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      product_id,
      region_id,
      sale_price,
      start_date,
      end_date,
    } = body

    if (!product_id || !region_id || !sale_price || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Product ID, region ID, sale price, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Use database function to schedule sale
    const { error } = await supabase.rpc('schedule_sale', {
      p_product_id: product_id,
      p_region_id: region_id,
      p_sale_price: sale_price,
      p_start_date: start_date,
      p_end_date: end_date,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Sale scheduled successfully',
    })
  } catch (error: any) {
    console.error('Schedule sale error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to schedule sale' },
      { status: 500 }
    )
  }
}
