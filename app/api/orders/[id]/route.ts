import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get order details by order number
 */
export async function GET(
  request: Request,
  { params }: { params: { order_number: string } }
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

    const { order_number } = params

    // Fetch order with all related data
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        shipping_address:shipping_addresses(*),
        order_items(
          *,
          product:products(*)
        )
      `)
      .eq('order_number', order_number)
      .eq('user_id', session.user.id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get tracking events if available
    let trackingEvents = null
    if ((order as any).tracking_number) {
      const { data: events } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .eq('order_id', (order as any).id)
        .order('event_timestamp', { ascending: false })

      trackingEvents = events
    }

    // Get tracking URL if available
    let trackingUrl = null
    if ((order as any).tracking_number && (order as any).carrier_code) {
      const { data: urlData } = await supabase.rpc('get_tracking_url', {
        p_order_id: (order as any).id,
      } as any)

      trackingUrl = urlData
    }

    return NextResponse.json({
      order,
      tracking_events: trackingEvents,
      tracking_url: trackingUrl,
    })
  } catch (error: any) {
    console.error('Order fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
