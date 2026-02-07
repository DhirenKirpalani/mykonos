import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get tracking information for an order
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

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, tracking_number, carrier_code, shipped_at, delivered_at, estimated_delivery_date, status')
      .eq('order_number', order_number)
      .eq('user_id', session.user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!(order as any).tracking_number) {
      return NextResponse.json({
        has_tracking: false,
        message: 'Tracking information not yet available',
      })
    }

    // Get tracking events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_tracking_events')
      .select('*')
      .eq('order_id', (order as any).id)
      .order('event_timestamp', { ascending: false })

    if (eventsError) throw eventsError

    // Get tracking URL
    const { data: trackingUrl } = await supabase.rpc('get_tracking_url', {
      p_order_id: (order as any).id,
    } as any)

    // Get carrier info
    const { data: carrierInfo } = await supabase
      .from('carrier_tracking_urls')
      .select('carrier_name, tracking_url_template')
      .eq('carrier_code', (order as any).carrier_code || '')
      .single()

    return NextResponse.json({
      has_tracking: true,
      tracking_number: (order as any).tracking_number,
      carrier_code: (order as any).carrier_code,
      carrier_name: (carrierInfo as any)?.carrier_name || (order as any).carrier_code,
      tracking_url: trackingUrl,
      shipped_at: (order as any).shipped_at,
      delivered_at: (order as any).delivered_at,
      estimated_delivery_date: (order as any).estimated_delivery_date,
      status: (order as any).status,
      events: events || [],
    })
  } catch (error: any) {
    console.error('Tracking fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tracking information' },
      { status: 500 }
    )
  }
}
