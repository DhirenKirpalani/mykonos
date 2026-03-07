import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Update promo code
 */
export async function PATCH(
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

    if (!user || !['marketing_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Marketing manager access required' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()

    // Update promo code
    const updateData: Database['public']['Tables']['promo_codes']['Update'] = {
      ...body,
      last_modified_by: session.user.id,
      updated_at: new Date().toISOString(),
    }

    const query = supabase.from('promo_codes')
    const { data: promoCode, error } = await (query.update as any)(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Promo code updated successfully',
      promo_code: promoCode,
    })
  } catch (error: any) {
    console.error('Update promo code error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update promo code' },
      { status: 500 }
    )
  }
}

/**
 * Delete promo code
 */
export async function DELETE(
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

    // Check permission (admin only)
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Delete promo code
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      message: 'Promo code deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete promo code error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete promo code' },
      { status: 500 }
    )
  }
}
