import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get sales by region report
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    if (!user || !['staff', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff or admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Get regional sales report using database function
    const { data: regions, error } = await supabase.rpc('get_regional_sales_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    } as any)

    if (error) throw error

    return NextResponse.json({
      period: startDate && endDate ? {
        start_date: startDate,
        end_date: endDate,
      } : null,
      regions: regions || [],
    })
  } catch (error: any) {
    console.error('Regional sales report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate regional sales report' },
      { status: 500 }
    )
  }
}
