import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('🔄 [API ORDER DETAILS] Route called for order ID:', params.id)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ [API ORDER DETAILS] Supabase client created with service role')

    // Fetch order with full details
    console.log('📡 [API ORDER DETAILS] Fetching order from database...')
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (orderError) {
      console.error('❌ [API ORDER DETAILS] Error fetching order:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('✅ [API ORDER DETAILS] Order found:', (order as any).order_number)
    console.log('📍 [API ORDER DETAILS] Shipping address:', (order as any).shipping_address)
    
    // Fetch user data if user_id exists
    let userData = null
    if ((order as any).user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById((order as any).user_id)
      if (authUser?.user) {
        userData = {
          first_name: authUser.user.user_metadata?.first_name || '',
          last_name: authUser.user.user_metadata?.last_name || '',
          email: authUser.user.email || ''
        }
      }
    }

    // Fetch order items
    console.log('📡 [API ORDER DETAILS] Fetching order items...')
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_id, variant_name, variant_sku, quantity, price_at_purchase')
      .eq('order_id', params.id)

    if (itemsError) {
      console.error('❌ [API ORDER DETAILS] Error fetching order items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
    }

    console.log('✅ [API ORDER DETAILS] Order items found:', items?.length || 0)

    // Fetch product details for each item
    const transformedItems = await Promise.all(
      (items || []).map(async (item: any, index: number) => {
        let productName = 'Unknown Product'
        let imageUrl = null
        
        console.log(`📦 [API ORDER DETAILS] Fetching product ${index + 1}/${items.length}:`, item.product_id)
        
        if (item.product_id) {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name, image_urls')
            .eq('id', item.product_id)
            .single()
          
          if (productError) {
            console.error(`❌ [API ORDER DETAILS] Error fetching product ${item.product_id}:`, productError)
          }
          
          if (product) {
            productName = product.name
            imageUrl = product.image_urls?.[0] || null
            console.log(`✅ [API ORDER DETAILS] Product found:`, product.name)
          } else {
            console.warn(`⚠️ [API ORDER DETAILS] Product not found for ID:`, item.product_id)
          }
        } else {
          console.warn(`⚠️ [API ORDER DETAILS] No product_id for item:`, item.id)
        }
        
        return {
          id: item.id,
          product_name: productName,
          variant_name: item.variant_name,
          quantity: item.quantity,
          price: item.price_at_purchase,
          image_url: imageUrl
        }
      })
    )

    // Extract discount and voucher info from pricing_snapshot if available
    let discountInfo = null
    let voucherInfo = null
    
    if ((order as any).pricing_snapshot) {
      const snapshot = (order as any).pricing_snapshot
      if (snapshot.discount && snapshot.discount > 0) {
        discountInfo = {
          amount: snapshot.discount,
          type: snapshot.discount_type || 'unknown'
        }
      }
      if (snapshot.voucher_discount && snapshot.voucher_discount > 0) {
        voucherInfo = {
          amount: snapshot.voucher_discount,
          code: snapshot.voucher_code || 'N/A'
        }
      }
    }

    console.log('🎉 [API ORDER DETAILS] Returning response with', transformedItems.length, 'items')
    return NextResponse.json({
      order: {
        ...order,
        user: userData
      },
      items: transformedItems,
      discount: discountInfo,
      voucher: voucherInfo
    })
  } catch (error) {
    console.error('💥 [API ORDER DETAILS] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
