import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('🔄 [API ORDER DETAILS] Route called for order ID:', params.id)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    console.log('✅ [API ORDER DETAILS] Supabase client created with service role')

    // Fetch order with full details (explicit columns instead of *)
    console.log('📡 [API ORDER DETAILS] Fetching order from database...')
    console.log('📡 [API ORDER DETAILS] Order ID:', params.id)
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

    // Fetch user data and order items in parallel
    const typedOrder = order as any
    const [authUserRes, itemsRes] = await Promise.all([
      typedOrder.user_id
        ? supabase.auth.admin.getUserById(typedOrder.user_id)
        : Promise.resolve({ data: { user: null }, error: null }),
      supabase.from('order_items')
        .select('id, product_id, variant_name, variant_sku, quantity, price_at_purchase')
        .eq('order_id', params.id)
    ])

    let userData = null
    if (authUserRes.data?.user) {
      userData = {
        first_name: authUserRes.data.user.user_metadata?.first_name || '',
        last_name: authUserRes.data.user.user_metadata?.last_name || '',
        email: authUserRes.data.user.email || ''
      }
    }

    const items = itemsRes.data || []
    const itemsError = itemsRes.error

    if (itemsError) {
      console.error('❌ [API ORDER DETAILS] Error fetching order items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
    }

    console.log('✅ [API ORDER DETAILS] Order items found:', items.length)

    // Batch-fetch all product details in a single query (fixes N+1)
    const productIds = Array.from(new Set(items.map((item: any) => item.product_id).filter(Boolean)))
    let productsMap = new Map<string, any>()

    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, image_urls, variants')
        .in('id', productIds)

      ;(products || []).forEach((p: any) => productsMap.set(p.id, p))
    }

    const transformedItems = items.map((item: any) => {
      let productName = 'Unknown Product'
      let imageUrl = null

      if (item.product_id) {
        const product = productsMap.get(item.product_id)
        if (product) {
          productName = product.name

          let variants = product.variants
          if (typeof variants === 'string') {
            try { variants = JSON.parse(variants) } catch { variants = null }
          }

          if (item.variant_name && Array.isArray(variants)) {
            const variant = variants.find((v: any) => v.name === item.variant_name)
            if (variant?.image_url) {
              imageUrl = variant.image_url
            }
          }

          if (!imageUrl) {
            let imageUrls = product.image_urls
            if (typeof imageUrls === 'string') {
              try { imageUrls = JSON.parse(imageUrls) } catch { imageUrls = [] }
            }
            const urls = Array.isArray(imageUrls) ? imageUrls : []
            const validUrls = urls.filter((url: string) => url && !url.includes('placehold.co'))
            imageUrl = validUrls[0] || null
          }
        }
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
