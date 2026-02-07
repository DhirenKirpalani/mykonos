import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Assign shipping carrier and tracking
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body = await request.json()
    const { carrier_code, tracking_number, notify_customer } = body

    if (!carrier_code || !tracking_number) {
      return NextResponse.json(
        { error: 'Carrier code and tracking number are required' },
        { status: 400 }
      )
    }

    // Use database function to assign shipping
    const { error } = await supabase.rpc('assign_shipping', {
      p_order_id: id,
      p_carrier_code: carrier_code,
      p_tracking_number: tracking_number,
      p_notify_customer: notify_customer !== false,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Shipping assigned successfully',
    })
  } catch (error: any) {
    console.error('Shipping assignment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign shipping' },
      { status: 500 }
    )
  }
}
