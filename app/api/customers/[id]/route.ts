import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get customer profile details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    if (!user || !['support_agent', 'inventory_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Get customer profile, tags, and shipping addresses in parallel
    const [customerRes, tagsRes, addressesRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, country, created_at, role')
        .eq('id', id)
        .single(),
      supabase
        .from('customer_tag_assignments')
        .select('id, tag_id, assigned_at, tag:customer_tags(id, name, color)')
        .eq('user_id', id),
      supabase
        .from('shipping_addresses')
        .select('id, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default')
        .eq('user_id', id)
        .order('is_default', { ascending: false })
    ])

    const customer = customerRes.data
    const customerError = customerRes.error

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      customer,
      tags: tagsRes.data || [],
      addresses: addressesRes.data || [],
    })
  } catch (error: any) {
    console.error('Customer profile fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer profile' },
      { status: 500 }
    )
  }
}
