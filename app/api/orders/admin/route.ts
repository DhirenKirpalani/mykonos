import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Get all orders for admin
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build query - fetch orders with related data
    let query = supabase
      .from('orders')
      .select(`
        *,
        shipping_address:shipping_addresses(*),
        order_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Orders fetch error:', error)
      throw error
    }

    // Fetch user data separately and merge
    if (orders && orders.length > 0) {
      const userIds = Array.from(new Set((orders as any[]).map((order: any) => order.user_id)))
      const { data: users } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', userIds)

      // Create a map of users by id
      const usersMap = new Map((users as any[] || []).map((user: any) => [user.id, user]))

      // Merge user data into orders
      const ordersWithUsers = (orders as any[]).map((order: any) => ({
        ...order,
        user: usersMap.get(order.user_id) || null
      }))

      return NextResponse.json(ordersWithUsers)
    }

    return NextResponse.json(orders || [])
  } catch (error: any) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
