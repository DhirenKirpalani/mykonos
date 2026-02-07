import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Bulk update order status
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
    const { order_ids, status, note } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs array is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Use database function for bulk update
    const { data: results, error } = await supabase.rpc('bulk_update_order_status', {
      p_order_ids: order_ids,
      p_new_status: status,
      p_note: note || null,
    } as any)

    if (error) throw error

    const successCount = results?.filter((r: any) => r.success).length || 0
    const failureCount = results?.filter((r: any) => !r.success).length || 0

    return NextResponse.json({
      message: `Bulk update completed: ${successCount} succeeded, ${failureCount} failed`,
      results: results || [],
      summary: {
        total: order_ids.length,
        succeeded: successCount,
        failed: failureCount,
      },
    })
  } catch (error: any) {
    console.error('Bulk status update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to bulk update order status' },
      { status: 500 }
    )
  }
}
