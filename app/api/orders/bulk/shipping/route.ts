import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { verifyAdminAuth } from '@/lib/auth/admin-auth'
export const dynamic = 'force-dynamic'

/**
 * Bulk assign shipping
 */
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.ok) return auth.response

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
      if (!(shipment as any).order_id || !(shipment as any).carrier_code || !(shipment as any).tracking_number) {
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

    const successCount = (results as any)?.filter((r: any) => r.success).length || 0
    const failureCount = (results as any)?.filter((r: any) => !r.success).length || 0

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
