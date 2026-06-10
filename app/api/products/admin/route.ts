import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Get all products for admin
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all products (variants are stored as JSONB in the products table)
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Products fetch error:', error)
      throw error
    }

    return NextResponse.json(products || [])
  } catch (error: any) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

/**
 * Create a new product
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get session from authorization header
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

    // Check if user has permission
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['content_manager', 'admin'].includes((userData as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Content manager access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Calculate prices and stock from variants if variants are provided
    let priceUSD = body.price_usd
    let priceIDR = body.price_idr
    let stockQuantity = body.stock_quantity || 0

    if (body.variants && Array.isArray(body.variants) && body.variants.length > 0) {
      priceUSD = body.variants.reduce((sum: number, v: any) => {
        return sum + (parseFloat(v.price_usd) || 0)
      }, 0)
      priceIDR = body.variants.reduce((sum: number, v: any) => {
        return sum + (parseFloat(v.price_idr) || 0)
      }, 0)
      stockQuantity = body.variants.reduce((sum: number, v: any) => {
        return sum + (parseInt(v.stock_quantity) || 0)
      }, 0)
    }

    // Validate required currency fields - only if no variants provided
    if ((!priceUSD || !priceIDR) && (!body.variants || body.variants.length === 0)) {
      return NextResponse.json(
        { error: 'Both USD and IDR prices are required when no variants are provided' },
        { status: 400 }
      )
    }
    
    // If variants exist but no base prices, set to 0 (will be calculated from variants)
    if (!priceUSD && body.variants && body.variants.length > 0) {
      priceUSD = 0
    }
    if (!priceIDR && body.variants && body.variants.length > 0) {
      priceIDR = 0
    }

    // Auto-generate slug from name if not provided
    const generateSlug = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' + Date.now().toString(36)

    // Prepare product data with all new fields
    const productData: any = {
      name: body.name,
      slug: body.slug || generateSlug(body.name),
      description: body.description || '',
      price_usd: priceUSD,
      price_idr: priceIDR,
      stock_quantity: stockQuantity,
      collection: body.collection || '',
      in_stock: body.in_stock !== undefined ? body.in_stock : true,
      volume_ml: body.volume_ml || null,
      weight_mg: body.weight_mg || null,
      shelf_life_months: body.shelf_life_months || null,
      formulation: body.formulation || null,
      gender: body.gender || null,
      bpom_number: body.bpom_number || null,
      ships_from: body.ships_from || 'KOTA JAKARTA TIMUR',
      image_urls: body.image_urls || [],
      size: body.volume_ml ? `${body.volume_ml}ml` : '',
      category: body.collection || '', // Use collection as category for backward compatibility
      is_new: false,
      pilih_lokal: body.pilih_lokal === true,
      rating: body.rating || 0,
      products_sold: body.products_sold || 0,
      is_popular: body.is_popular === true,
      is_best_selling: body.is_best_selling === true,
      new_product_duration_days: body.new_product_duration_days || 30,
      variants: body.variants || [],
      sku: body.sku || null,
      brand: body.brand || null,
      cost_price: body.cost_price || null,
      cost_price_idr: body.cost_price_idr || null,
      low_stock_threshold: body.low_stock_threshold || null,
      allow_backorder: body.allow_backorder || false,
      weight_grams: body.weight_grams || null,
      shipping_weight_grams: body.shipping_weight_grams || null,
      package_length_cm: body.package_length_cm || null,
      package_width_cm: body.package_width_cm || null,
      package_height_cm: body.package_height_cm || null,
      fragrance_family: body.fragrance_family || null,
      country_of_origin: body.country_of_origin || null,
      top_notes: body.top_notes || null,
      middle_notes: body.middle_notes || null,
      base_notes: body.base_notes || null,
      manufacturing_date: body.manufacturing_date || null,
      expiration_date: body.expiration_date || null,
      status: body.status || 'draft',
      is_featured: body.is_featured || false,
      is_visible: body.is_visible !== undefined ? body.is_visible : true,
      min_purchase_quantity: body.min_purchase_quantity || 1,
      max_purchase_quantity: body.max_purchase_quantity || null,
      is_pre_order: body.is_pre_order || false,
      pre_order_duration_days: body.pre_order_duration_days || null,
      pre_order_release_date: body.pre_order_release_date || null,
      scheduled_publish_date: body.scheduled_publish_date || null,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      meta_keywords: body.meta_keywords || null,
      tags: body.tags || null,
      image_alt_texts: body.image_alt_texts || [],
      bulk_discounts: body.bulk_discounts || [],
      video_urls: body.video_urls || null,
      tax_enabled: body.tax_enabled !== undefined ? body.tax_enabled : true,
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error('Product creation error:', error)
      throw error
    }

    // Revalidate product pages to reflect new product immediately
    try {
      revalidatePath('/products')
      revalidatePath(`/products/${product.slug}`)
      revalidateTag('products')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
      // Don't fail the request if revalidation fails
    }

    return NextResponse.json({
      message: 'Product created successfully',
      product,
    })
  } catch (error: any) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}
