import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Validate all cart items (inventory, prices)
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const body = await request.json()
    const { cart_item_ids } = body

    if (!cart_item_ids || !Array.isArray(cart_item_ids)) {
      return NextResponse.json(
        { error: 'Cart item IDs array is required' },
        { status: 400 }
      )
    }

    // Validate each cart item
    const validations = await Promise.all(
      cart_item_ids.map(async (itemId: string) => {
        const { data, error } = await supabase.rpc('validate_cart_item', {
          p_cart_item_id: itemId,
        } as any) as { data: any; error: any }

        if (error) {
          console.error(`Validation error for item ${itemId}:`, error)
          return {
            cart_item_id: itemId,
            is_valid: false,
            issue_type: 'error',
            issue_message: 'Validation failed',
            current_price: 0,
            current_stock: 0,
          }
        }

        const result = Array.isArray(data) ? data[0] : data

        return {
          cart_item_id: itemId,
          ...result,
        }
      })
    )

    const hasIssues = validations.some(
      v => !v.is_valid || v.issue_type !== null
    )

    return NextResponse.json({
      validations,
      has_issues: hasIssues,
    })
  } catch (error: any) {
    console.error('Cart validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate cart' },
      { status: 500 }
    )
  }
}
