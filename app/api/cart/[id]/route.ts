import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Update cart item quantity
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const body = await request.json()
    const { quantity } = body

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      )
    }

    // Get cart item with product
    const { data: cartItem, error: fetchError } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    // Check inventory
    const product = (cartItem as any).product
    if (product.stock_quantity < quantity) {
      return NextResponse.json(
        { error: `Only ${product.stock_quantity} items available` },
        { status: 400 }
      )
    }

    // Update quantity
    type CartItemUpdate = Database['public']['Tables']['cart_items']['Update']
    const updateData: CartItemUpdate = {
      quantity,
      updated_at: new Date().toISOString()
    }
    
    const query = supabase.from('cart_items')
    const { error: updateError } = await (query.update as any)(updateData)
      .eq('id', params.id)

    if (updateError) throw updateError

    return NextResponse.json({ 
      success: true, 
      message: 'Cart item updated' 
    })
  } catch (error: any) {
    console.error('Update cart item error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update cart item' },
      { status: 500 }
    )
  }
}

/**
 * Delete cart item
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Item removed from cart' 
    })
  } catch (error: any) {
    console.error('Delete cart item error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove item from cart' },
      { status: 500 }
    )
  }
}
