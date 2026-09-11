import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { verifyAdminAuth } from '@/lib/auth/admin-auth'
export const dynamic = 'force-dynamic'

/**
 * Get all customers (Customer Dashboard)
 */
export async function GET(request: Request) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.ok) return auth.response

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Query users table directly, excluding admin users
    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, country, created_at, role')
      .neq('role', 'admin')
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

    // Fetch all orders including guest orders (join shipping_addresses for guest name)
    const { data: allOrders } = await supabase
      .from('orders')
      .select('user_id, customer_email, total_amount, currency_code, created_at, shipping_address:shipping_addresses(full_name)')

    // Convert amount to USD based on currency_code
    const toUSD = (amount: number, currency: string) => {
      if (!amount) return 0
      const c = (currency || '').toUpperCase()
      if (c === 'IDR') return amount / 15000
      if (c === 'EUR') return amount * 1.08
      if (c === 'GBP') return amount * 1.27
      if (c === 'CAD') return amount * 0.73
      if (c === 'AUD') return amount * 0.65
      if (c === 'SGD') return amount * 0.74
      return amount // USD or unknown → assume USD
    }

    // Calculate order counts and total spent per customer
    const orderStats = new Map()
    const guestCustomers = new Map()

    allOrders?.forEach((order: any) => {
      const usdAmount = toUSD(order.total_amount || 0, order.currency_code)
      if (order.user_id) {
        // Registered user order
        const existing = orderStats.get(order.user_id) || { count: 0, total: 0 }
        orderStats.set(order.user_id, {
          count: existing.count + 1,
          total: existing.total + usdAmount
        })
      } else if (order.customer_email) {
        // Guest order — derive name from shipping address
        const fullName = (order as any).shipping_address?.full_name || ''
        const firstName = fullName?.split(' ')[0] || ''
        const lastName = fullName?.split(' ').slice(1).join(' ') || ''
        const existing = guestCustomers.get(order.customer_email) || {
          email: order.customer_email,
          first_name: firstName,
          last_name: lastName,
          phone: null,
          country: '',
          created_at: order.created_at,
          order_count: 0,
          total_spent: 0,
          is_guest: true
        }
        guestCustomers.set(order.customer_email, {
          ...existing,
          order_count: existing.order_count + 1,
          total_spent: existing.total_spent + usdAmount,
          created_at: order.created_at < existing.created_at ? order.created_at : existing.created_at
        })
      }
    })

    // Merge stats into registered customers
    const customersWithStats = customers?.map((customer: any) => {
      const stats = orderStats.get(customer.id) || { count: 0, total: 0 }
      return {
        ...customer,
        order_count: stats.count,
        total_spent: stats.total,
        is_guest: false
      }
    }) || []

    // Combine registered and guest customers
    const allCustomers = [...customersWithStats, ...Array.from(guestCustomers.values())]
    
    // Sort by created_at descending
    allCustomers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(allCustomers)
  } catch (error: any) {
    console.error('Customers fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
