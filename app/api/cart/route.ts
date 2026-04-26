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
      // Get variant-specific price if variant exists
      let basePrice = item.product.price_idr
      const itemWithVariant = item as any
      
      if (itemWithVariant.variant_sku && (item.product as any).variants) {
        const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
        if (variant) {
          basePrice = variant.price_idr || variant.price_usd
        }
      }
      
      const price = getEffectivePrice(
        basePrice,
        null
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
    const { product_id, quantity = 1, variant_name, variant_sku } = body

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

    const typedProduct = product as Product & {
      min_purchase_quantity?: number | null
      max_purchase_quantity?: number | null
      variants?: Array<{
        sku: string
        name: string
        price_usd: number
        price_idr: number
        stock_quantity: number
        min_purchase_quantity?: number | null
        max_purchase_quantity?: number | null
      }>
    }

    // Get variant-specific data if variant is specified
    let variantStock: number | null = typedProduct.stock_quantity
    let basePrice = typedProduct.price_idr || typedProduct.price_usd
    let variantMinQty = typedProduct.min_purchase_quantity || 1
    let variantMaxQty = typedProduct.max_purchase_quantity
    
    console.log('🔍 [CART API] Stock validation debug:', {
      product_id,
      product_name: typedProduct.name,
      variant_sku,
      product_stock_quantity: typedProduct.stock_quantity,
      product_stock_is_null: typedProduct.stock_quantity === null,
      initial_variantStock: variantStock,
      requested_quantity: quantity,
      has_variants: !!typedProduct.variants,
      variants_count: typedProduct.variants?.length || 0
    })
    
    if (variant_sku && typedProduct.variants) {
      const variant = typedProduct.variants.find(v => v.sku === variant_sku)
      console.log('🔍 [CART API] Variant lookup:', {
        variant_sku,
        variant_found: !!variant,
        variant_stock: variant?.stock_quantity,
        variant_stock_is_null: variant?.stock_quantity === null
      })
      if (variant) {
        variantStock = variant.stock_quantity
        basePrice = variant.price_idr || variant.price_usd
        // Use variant-specific limits if available, otherwise fall back to product-level
        variantMinQty = variant.min_purchase_quantity ?? typedProduct.min_purchase_quantity ?? 1
        variantMaxQty = variant.max_purchase_quantity ?? typedProduct.max_purchase_quantity
        console.log('🔍 [CART API] Variant stock after processing:', {
          variantStock,
          variantMinQty,
          variantMaxQty
        })
      }
    }

    // Check if product/variant is explicitly out of stock (0, not null)
    const isExplicitlyOutOfStock = typedProduct.stock_quantity === 0 || (variant_sku && typedProduct.variants?.find(v => v.sku === variant_sku)?.stock_quantity === 0)
    console.log('🔍 [CART API] Out of stock check:', {
      isExplicitlyOutOfStock,
      product_stock_is_zero: typedProduct.stock_quantity === 0,
      variant_stock_is_zero: variant_sku ? typedProduct.variants?.find(v => v.sku === variant_sku)?.stock_quantity === 0 : 'N/A'
    })
    
    if (isExplicitlyOutOfStock) {
      console.error('❌ [CART API] Product is out of stock')
      return NextResponse.json(
        { error: 'This product is out of stock' },
        { status: 400 }
      )
    }

    // Validate quantity constraints (use variant-specific limits)
    const minQty = variantMinQty
    const maxQty = variantMaxQty

    // Check minimum quantity
    if (quantity < minQty) {
      return NextResponse.json(
        { error: `Minimum quantity is ${minQty}` },
        { status: 400 }
      )
    }

    // Check inventory (use variant stock if variant is specified)
    // Only validate if stock tracking is enabled (stock is not null)
    console.log('🔍 [CART API] Final stock validation:', {
      variantStock,
      quantity,
      stock_tracking_enabled: variantStock !== null,
      has_enough_stock: variantStock !== null ? variantStock >= quantity : true,
      stock_difference: variantStock !== null ? variantStock - quantity : 'N/A (no tracking)'
    })
    
    if (variantStock !== null && variantStock < quantity) {
      console.error('❌ [CART API] Insufficient stock:', {
        variantStock,
        quantity,
        product_name: typedProduct.name,
        variant_sku,
        error_message: `Only ${variantStock} items available`
      })
      return NextResponse.json(
        { error: `Only ${variantStock} items available` },
        { status: 400 }
      )
    }
    
    console.log('✅ [CART API] Stock validation passed')

    const priceAtAdd = getEffectivePrice(basePrice, null)

    // Check if item already in cart (same product AND same variant)
    let query = supabase
      .from('cart_items')
      .select('*')
      .eq('product_id', product_id)
      .eq('user_id', user.id)
    
    // If variant is specified, match on variant too
    if (variant_sku) {
      query = query.eq('variant_sku', variant_sku)
    } else {
      query = query.is('variant_sku', null)
    }
    
    const { data: existing } = await query.single()

    if (existing) {
      const typedExisting = existing as CartItem
      // Update quantity
      const newQuantity = typedExisting.quantity + quantity

      // Check maximum quantity for combined total (per variant, not per product)
      if (maxQty && newQuantity > maxQty) {
        return NextResponse.json(
          { error: `Maximum quantity is ${maxQty}` },
          { status: 400 }
        )
      }

      // Check stock for this specific variant
      if (newQuantity > variantStock) {
        return NextResponse.json(
          { error: `Only ${variantStock} items available` },
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
        variant_name: variant_name || null,
        variant_sku: variant_sku || null,
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
