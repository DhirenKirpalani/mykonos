import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Assign tag to customer
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
    const { tag_id } = body

    if (!tag_id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Use database function to assign tag
    const { error } = await supabase.rpc('assign_customer_tag', {
      p_user_id: id,
      p_tag_id: tag_id,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Tag assigned successfully',
    })
  } catch (error: any) {
    console.error('Assign tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign tag' },
      { status: 500 }
    )
  }
}

/**
 * Remove tag from customer
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
    const body = await request.json()
    const { tag_id } = body

    if (!tag_id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Use database function to remove tag
    const { error } = await supabase.rpc('remove_customer_tag', {
      p_user_id: id,
      p_tag_id: tag_id,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Tag removed successfully',
    })
  } catch (error: any) {
    console.error('Remove tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove tag' },
      { status: 500 }
    )
  }
}
