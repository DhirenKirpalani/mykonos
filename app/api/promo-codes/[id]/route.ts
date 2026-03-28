import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get single promo code by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!promoCode) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(promoCode)
  } catch (error: any) {
    console.error('Get promo code error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promo code' },
      { status: 500 }
    )
  }
}

/**
 * Update promo code
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['marketing_manager', 'admin'].includes((userData as any).role || '')) {
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
      last_modified_by: user.id,
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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admin only)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || (userData as any).role !== 'admin') {
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
