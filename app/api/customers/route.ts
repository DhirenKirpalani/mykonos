import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get all customers (Customer Dashboard)
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Query users table directly
    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, country, created_at')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    const { data: customers, error } = await query

    if (error) {
      console.error('Customers fetch error:', error)
      throw error
    }

    // Fetch order counts and totals for each customer
    if (customers && customers.length > 0) {
      const customerIds = customers.map((c: any) => c.id)
      
      const { data: orders } = await supabase
        .from('orders')
        .select('user_id, total_amount')
        .in('user_id', customerIds)

      // Calculate order counts and total spent per customer
      const orderStats = new Map()
      orders?.forEach((order: any) => {
        const existing = orderStats.get(order.user_id) || { count: 0, total: 0 }
        orderStats.set(order.user_id, {
          count: existing.count + 1,
          total: existing.total + (order.total_amount || 0)
        })
      })

      // Merge stats into customers
      const customersWithStats = customers.map((customer: any) => {
        const stats = orderStats.get(customer.id) || { count: 0, total: 0 }
        return {
          ...customer,
          order_count: stats.count,
          total_spent: stats.total
        }
      })

      return NextResponse.json(customersWithStats)
    }

    return NextResponse.json(customers || [])
  } catch (error: any) {
    console.error('Customers fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
