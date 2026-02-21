import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Update product visibility
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
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

    // Update product visibility directly
    const query = supabase.from('products')
    const { error } = await (query.update as any)({ is_visible })
      .eq('id', id)

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
