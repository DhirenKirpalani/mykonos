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

    // Fetch user data from auth.users and merge
    if (orders && orders.length > 0) {
      const userIds = Array.from(new Set(
        (orders as any[])
          .map((order: any) => order.user_id)
          .filter(Boolean) // Filter out null user_ids (guest orders)
      ))
      
      let usersMap = new Map()
      
      if (userIds.length > 0) {
        const { data: users } = await supabase.auth.admin.listUsers()
        
        // Create a map of users by id, extracting metadata
        usersMap = new Map(
          (users.users || [])
            .filter((user: any) => userIds.includes(user.id))
            .map((user: any) => [
              user.id,
              {
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name || '',
                last_name: user.user_metadata?.last_name || ''
              }
            ])
        )
      }

      // Merge user data into orders and add first product name
      const ordersWithUsers = (orders as any[]).map((order: any) => {
        const firstProduct = order.order_items?.[0]?.product?.name || null
        const itemCount = order.order_items?.length || 0
        
        return {
          ...order,
          user: order.user_id ? usersMap.get(order.user_id) || null : null,
          customer_name: order.user_id 
            ? `${usersMap.get(order.user_id)?.first_name || ''} ${usersMap.get(order.user_id)?.last_name || ''}`.trim() || 'User'
            : 'Guest',
          customer_email: order.user_id 
            ? usersMap.get(order.user_id)?.email || order.customer_email
            : order.customer_email,
          first_product_name: firstProduct,
          items_count: itemCount
        }
      })

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
