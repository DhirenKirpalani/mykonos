import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get sales by product report
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

    if (!user || !['marketing_manager', 'content_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Manager or admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get product sales report using database function
    const { data: products, error } = await supabase.rpc('get_product_sales_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_limit: limit,
    } as any)

    if (error) throw error

    return NextResponse.json({
      period: startDate && endDate ? {
        start_date: startDate,
        end_date: endDate,
      } : null,
      products: products || [],
    })
  } catch (error: any) {
    console.error('Product sales report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate product sales report' },
      { status: 500 }
    )
  }
}
