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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query - fetch ONLY essential fields for list view
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        customer_email,
        status,
        payment_status,
        total_amount,
        created_at,
        updated_at,
        shipping_address:shipping_addresses(full_name),
        order_items!inner(
          id,
          variant_name,
          product:products(name)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Orders fetch error:', error)
      throw error
    }

    // Fetch user data from public.users table (faster than auth.users)
    if (orders && orders.length > 0) {
      const userIds = Array.from(new Set(
        (orders as any[])
          .map((order: any) => order.user_id)
          .filter(Boolean)
      ))
      
      let usersMap = new Map()
      
      if (userIds.length > 0) {
        // Fetch from public.users table instead of auth.admin.listUsers()
        const { data: users } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .in('id', userIds)
        
        usersMap = new Map(
          (users || []).map((user: any) => [
            user.id,
            {
              id: user.id,
              email: user.email,
              first_name: user.first_name || '',
              last_name: user.last_name || ''
            }
          ])
        )
      }

      // Merge user data into orders
      const ordersWithUsers = (orders as any[]).map((order: any) => {
        const itemCount = order.order_items?.length || 0
        const shippingName = order.shipping_address?.full_name || ''
        
        // Get first product name (with variant if applicable)
        const firstItem = order.order_items?.[0]
        let firstProductName = null
        if (firstItem?.product?.name) {
          firstProductName = firstItem.variant_name 
            ? `${firstItem.product.name} (${firstItem.variant_name})`
            : firstItem.product.name
        }
        
        return {
          id: order.id,
          order_number: order.order_number,
          user_id: order.user_id,
          status: order.status,
          payment_status: order.payment_status,
          total_amount: order.total_amount,
          created_at: order.created_at,
          updated_at: order.updated_at,
          customer_name: order.user_id 
            ? `${usersMap.get(order.user_id)?.first_name || ''} ${usersMap.get(order.user_id)?.last_name || ''}`.trim() || shippingName || 'User'
            : shippingName || 'Guest',
          customer_email: order.user_id 
            ? usersMap.get(order.user_id)?.email || order.customer_email
            : order.customer_email,
          first_product_name: firstProductName,
          items_count: itemCount
        }
      })

      return NextResponse.json({ 
        orders: ordersWithUsers,
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      })
    }

    return NextResponse.json({ 
      orders: orders || [],
      total: count || 0,
      page,
      limit,
      totalPages: 0
    })
  } catch (error: any) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
