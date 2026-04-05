import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get product details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
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

    const { id } = params

    // Get product
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      product,
    })
  } catch (error: any) {
    console.error('Product fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

/**
 * Update product
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
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

    const { id } = params
    const body = await request.json()

    // Update product - only include valid fields and remove undefined/null values
    const updateData: any = {}
    
    // Map of allowed fields to update
    const allowedFields = [
      'name', 'slug', 'sku', 'description', 'brand',
      'price_usd', 'price_idr', 'cost_price', 'cost_price_idr', 'compare_at_price', 'compare_at_price_idr',
      'stock_quantity', 'low_stock_threshold', 'allow_backorder', 'in_stock',
      'volume_ml', 'weight_grams', 'shipping_weight_grams',
      'package_length_cm', 'package_width_cm', 'package_height_cm',
      'shelf_life_months', 'formulation', 'gender',
      'fragrance_family', 'country_of_origin', 'top_notes', 'middle_notes', 'base_notes',
      'bpom_number', 'manufacturing_date', 'expiration_date',
      'ships_from', 'status', 'is_featured', 'is_visible',
      'min_purchase_quantity', 'max_purchase_quantity',
      'is_pre_order', 'pre_order_duration_days', 'pre_order_release_date', 'scheduled_publish_date',
      'meta_title', 'meta_description', 'meta_keywords', 'tags',
      'image_urls', 'video_urls', 'image_alt_texts', 'bulk_discounts', 'variants',
      'collection', 'size', 'category',
      'pilih_lokal', 'rating', 'products_sold', 'is_popular', 'is_best_selling',
      'sale_price', 'new_product_duration_days'
    ]
    
    // Only include allowed fields that are present in the body
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // If variants are provided, calculate total prices and stock from variants
    if (body.variants && Array.isArray(body.variants) && body.variants.length > 0) {
      const totalPriceUSD = body.variants.reduce((sum: number, v: any) => {
        return sum + (parseFloat(v.price_usd) || 0)
      }, 0)
      const totalPriceIDR = body.variants.reduce((sum: number, v: any) => {
        return sum + (parseFloat(v.price_idr) || 0)
      }, 0)
      const totalStock = body.variants.reduce((sum: number, v: any) => {
        return sum + (parseInt(v.stock_quantity) || 0)
      }, 0)
      
      // Always update product-level prices and stock to match variant totals
      updateData.price_usd = totalPriceUSD
      updateData.price_idr = totalPriceIDR
      updateData.stock_quantity = totalStock
    }

    const query = supabase.from('products')
    const { data: product, error } = await (query.update as any)(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create audit log entry
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'product',
        entity_id: id,
        action: 'updated',
        changes: updateData,
        user_id: user.id,
        user_email: user.email || 'unknown'
      })
    } catch (auditError) {
      console.error('Audit log creation error:', auditError)
      // Don't fail the request if audit logging fails
    }

    // Revalidate product pages to reflect changes immediately
    try {
      revalidatePath('/products')
      revalidatePath(`/products/${product.slug}`)
      revalidateTag('products')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
      // Don't fail the request if revalidation fails
    }

    return NextResponse.json({
      message: 'Product updated successfully',
      product,
    })
  } catch (error: any) {
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * Delete product
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
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

    if (!userData || (userData as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      message: 'Product deleted successfully',
    })
  } catch (error: any) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}
