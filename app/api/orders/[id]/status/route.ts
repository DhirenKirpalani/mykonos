import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Update order status
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id } = params
    const body = await request.json()
    const { status, note } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'paid', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Server-side validation: Can only ship orders that are packed
    if (status === 'shipped') {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', id)
        .single()

      if (orderError) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      if (order.status !== 'packed') {
        return NextResponse.json(
          { error: 'Order must be marked as packed before it can be shipped' },
          { status: 400 }
        )
      }
    }

    // Use database function to update status
    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: id,
      p_new_status: status,
      p_note: note || null,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Order status updated successfully',
    })
  } catch (error: any) {
    console.error('Order status update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    )
  }
}
