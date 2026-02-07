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

    if (!user || !['support_agent', 'inventory_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') // email or name
    const tagId = searchParams.get('tag_id')
    const hasNotes = searchParams.get('has_notes') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Use customer_dashboard view
    let query = supabase
      .from('customer_dashboard' as any)
      .select('*', { count: 'exact' })
      .order('registered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    if (hasNotes) {
      query = query.gt('note_count', 0)
    }

    const { data: customers, error, count } = await query

    if (error) throw error

    // If filtering by tag, do a separate query
    let filteredCustomers = customers
    if (tagId && customers) {
      const { data: taggedUsers } = await supabase
        .from('customer_tag_assignments')
        .select('user_id')
        .eq('tag_id', tagId)

      const taggedUserIds = new Set(taggedUsers?.map(t => (t as any).user_id) || [])
      filteredCustomers = customers.filter(c => taggedUserIds.has((c as any).id))
    }

    return NextResponse.json({
      customers: filteredCustomers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Customers fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
