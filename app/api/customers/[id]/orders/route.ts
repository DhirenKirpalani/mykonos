import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get customer order history
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

    // Check permission
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['support_agent', 'inventory_manager', 'admin'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      )
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get customer orders
    const { data: orders, error, count } = await supabase
      .from('orders')
      .select('*, shipping_address:shipping_addresses(*), order_items(*)', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Customer orders fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer orders' },
      { status: 500 }
    )
  }
}
