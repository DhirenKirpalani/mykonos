import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Update product visibility
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body = await request.json()
    const { is_visible } = body

    if (typeof is_visible !== 'boolean') {
      return NextResponse.json(
        { error: 'is_visible must be a boolean' },
        { status: 400 }
      )
    }

    // Use database function to update visibility
    const { error } = await supabase.rpc('update_product_visibility', {
      p_product_id: id,
      p_is_visible: is_visible,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Product visibility updated successfully',
    })
  } catch (error: any) {
    console.error('Product visibility update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product visibility' },
      { status: 500 }
    )
  }
}
