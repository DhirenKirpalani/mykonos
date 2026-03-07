import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'
import { getEffectivePrice } from '@/lib/utils/pricing'

type CartItem = Database['public']['Tables']['cart_items']['Row']
type Product = Database['public']['Tables']['products']['Row']
type CartItemWithProduct = CartItem & { product: Product }

/**
 * Get cart items
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ items: [], item_count: 0, subtotal: 0 })
    }

    // Fetch cart for user (anonymous or registered)
    const { data: items, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate subtotal
    const typedItems = items as unknown as CartItemWithProduct[]
    const subtotal = (typedItems || []).reduce((total: number, item) => {
      const price = getEffectivePrice(
        item.product.price,
        item.product.sale_price
      )
      return total + (price * item.quantity)
    }, 0)

    const itemCount = (typedItems || []).reduce((count: number, item) => count + item.quantity, 0)

    return NextResponse.json({
      items: items || [],
      item_count: itemCount,
      subtotal,
    })
  } catch (error: any) {
    console.error('Cart fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

/**
 * Add item to cart
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    // Get auth header from request
    const authHeader = request.headers.get('authorization')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please refresh the page' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { product_id, quantity = 1 } = body

    if (!product_id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Get product to validate and get price
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const typedProduct = product as Product

    // Check inventory
    if ((typedProduct.stock_quantity ?? 0) < quantity) {
      return NextResponse.json(
        { error: `Only ${typedProduct.stock_quantity ?? 0} items available` },
        { status: 400 }
      )
    }

    const priceAtAdd = getEffectivePrice(typedProduct.price, typedProduct.sale_price)

    // Check if item already in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('product_id', product_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      const typedExisting = existing as CartItem
      // Update quantity
      const newQuantity = typedExisting.quantity + quantity

      if (newQuantity > (typedProduct.stock_quantity ?? 0)) {
        return NextResponse.json(
          { error: `Only ${typedProduct.stock_quantity ?? 0} items available` },
          { status: 400 }
        )
      }

      const { error: updateError } = await (supabase
        .from('cart_items')
        .update as any)({ 
          quantity: newQuantity
        })
        .eq('id', typedExisting.id)

      if (updateError) throw updateError

      return NextResponse.json({ 
        success: true, 
        message: 'Cart updated',
        action: 'updated'
      })
    } else {
      // Insert new item
      const insertData: Database['public']['Tables']['cart_items']['Insert'] = {
        product_id,
        quantity,
        price_at_add: priceAtAdd,
        user_id: user.id,
      }

      const query3 = supabase.from('cart_items')
      const { error: insertError } = await (query3.insert as any)(insertData)

      if (insertError) throw insertError

      return NextResponse.json({ 
        success: true, 
        message: 'Item added to cart',
        action: 'added'
      })
    }
  } catch (error: any) {
    console.error('Add to cart error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add item to cart' },
      { status: 500 }
    )
  }
}
