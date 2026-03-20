import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is admin or staff
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order is in processing state and payment is completed
    if (order.status !== 'processing') {
      return NextResponse.json(
        { error: 'Order must be in processing status to mark as packed' },
        { status: 400 }
      )
    }

    if (order.payment_status !== 'completed') {
      return NextResponse.json(
        { error: 'Payment must be completed before packing' },
        { status: 400 }
      )
    }

    // Update order with packed timestamp and status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'packed',
        packed_at: new Date().toISOString(),
        packed_by: user.id,
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('Failed to mark order as packed:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // Add to order status history
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id,
        status: 'packed',
        notes: 'Order marked as packed and ready for shipment',
      })

    if (historyError) {
      console.error('Failed to add status history:', historyError)
    }

    return NextResponse.json({
      success: true,
      message: 'Order marked as packed',
      order_number: order.order_number,
    })
  } catch (error) {
    console.error('Error marking order as packed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
