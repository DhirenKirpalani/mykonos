import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get sales report with gross sales, net sales, and discounts
 */
export async function GET(request: Request) {
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

    if (!user || !['marketing_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Marketing manager or admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      )
    }

    // Get sales report using database function
    const { data: report, error } = await supabase.rpc('get_sales_report', {
      p_start_date: startDate,
      p_end_date: endDate,
    } as any)

    if (error) throw error

    const salesData = (report as any) && (report as any).length > 0 ? (report as any)[0] : {
      total_orders: 0,
      gross_sales: 0,
      total_discounts: 0,
      total_shipping: 0,
      total_tax: 0,
      net_sales: 0,
      avg_order_value: 0,
      completed_orders: 0,
      unique_customers: 0,
    }

    return NextResponse.json({
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      metrics: {
        total_orders: parseInt(String(salesData.total_orders || '0')),
        gross_sales: parseFloat(String(salesData.gross_sales || '0')),
        total_discounts: parseFloat(String(salesData.total_discounts || '0')),
        total_shipping: parseFloat(String(salesData.total_shipping || '0')),
        total_tax: parseFloat(String(salesData.total_tax || '0')),
        net_sales: parseFloat(String(salesData.net_sales || '0')),
        avg_order_value: parseFloat(String(salesData.avg_order_value || '0')),
        completed_orders: parseInt(String(salesData.completed_orders || '0')),
        unique_customers: parseInt(String(salesData.unique_customers || '0')),
      },
    })
  } catch (error: any) {
    console.error('Sales report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate sales report' },
      { status: 500 }
    )
  }
}
