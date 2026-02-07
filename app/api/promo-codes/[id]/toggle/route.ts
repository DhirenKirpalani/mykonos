import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Enable promo code
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

    // Use database function to enable
    const { error } = await supabase.rpc('enable_promo_code', {
      p_promo_code_id: id,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Promo code enabled successfully',
    })
  } catch (error: any) {
    console.error('Enable promo code error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to enable promo code' },
      { status: 500 }
    )
  }
}

/**
 * Disable promo code
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
    const { reason } = body

    // Use database function to disable
    const { error } = await supabase.rpc('disable_promo_code', {
      p_promo_code_id: id,
      p_reason: reason || null,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Promo code disabled successfully',
    })
  } catch (error: any) {
    console.error('Disable promo code error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disable promo code' },
      { status: 500 }
    )
  }
}
