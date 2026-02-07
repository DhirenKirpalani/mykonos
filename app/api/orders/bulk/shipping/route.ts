import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Bulk assign shipping
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
    const { shipments } = body

    if (!shipments || !Array.isArray(shipments) || shipments.length === 0) {
      return NextResponse.json(
        { error: 'Shipments array is required' },
        { status: 400 }
      )
    }

    // Validate each shipment has required fields
    for (const shipment of shipments) {
      if (!shipment.order_id || !shipment.carrier_code || !shipment.tracking_number) {
        return NextResponse.json(
          { error: 'Each shipment must have order_id, carrier_code, and tracking_number' },
          { status: 400 }
        )
      }
    }

    // Use database function for bulk shipping assignment
    const { data: results, error } = await supabase.rpc('bulk_assign_shipping', {
      p_shipments: shipments,
    } as any)

    if (error) throw error

    const successCount = results?.filter((r: any) => r.success).length || 0
    const failureCount = results?.filter((r: any) => !r.success).length || 0

    return NextResponse.json({
      message: `Bulk shipping assignment completed: ${successCount} succeeded, ${failureCount} failed`,
      results: results || [],
      summary: {
        total: shipments.length,
        succeeded: successCount,
        failed: failureCount,
      },
    })
  } catch (error: any) {
    console.error('Bulk shipping assignment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to bulk assign shipping' },
      { status: 500 }
    )
  }
}
