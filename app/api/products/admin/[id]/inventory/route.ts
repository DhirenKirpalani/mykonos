import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Update product inventory
 */
export async function PATCH(
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
    const { quantity, reason } = body

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be a non-negative number' },
        { status: 400 }
      )
    }

    // Use database function to update inventory with logging
    const { error } = await supabase.rpc('update_product_inventory', {
      p_product_id: id,
      p_new_quantity: quantity,
      p_reason: reason || null,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Inventory updated successfully',
    })
  } catch (error: any) {
    console.error('Inventory update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

/**
 * Get inventory change history
 */
export async function GET(
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

    // Check if user has permission
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['inventory_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Inventory manager access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Get inventory change history
    const { data: changes, error } = await supabase
      .from('inventory_changes')
      .select('*, changed_by_user:users!inventory_changes_changed_by_fkey(first_name, last_name, email)')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      changes: changes || [],
    })
  } catch (error: any) {
    console.error('Inventory history fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory history' },
      { status: 500 }
    )
  }
}
