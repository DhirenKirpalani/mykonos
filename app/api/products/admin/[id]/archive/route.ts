import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Archive product
 */
export async function POST(
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
    const { reason } = body

    // Use database function to archive
    const { error } = await supabase.rpc('archive_product', {
      p_product_id: id,
      p_reason: reason || null,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Product archived successfully',
    })
  } catch (error: any) {
    console.error('Product archive error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to archive product' },
      { status: 500 }
    )
  }
}

/**
 * Restore archived product
 */
export async function DELETE(
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

    // Use database function to restore
    const { error } = await supabase.rpc('restore_product', {
      p_product_id: id,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Product restored successfully',
    })
  } catch (error: any) {
    console.error('Product restore error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to restore product' },
      { status: 500 }
    )
  }
}
