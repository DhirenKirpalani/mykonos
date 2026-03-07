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

    // Get customer profile
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get customer tags
    const { data: tags } = await supabase
      .from('customer_tag_assignments')
      .select('*, tag:customer_tags(*)')
      .eq('user_id', id)

    // Get shipping addresses
    const { data: addresses } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', id)
      .order('is_default', { ascending: false })

    return NextResponse.json({
      customer,
      tags: tags || [],
      addresses: addresses || [],
    })
  } catch (error: any) {
    console.error('Customer profile fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer profile' },
      { status: 500 }
    )
  }
}
