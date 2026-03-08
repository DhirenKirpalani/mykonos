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

    // Fetch all products ordered by created_at (bypasses RLS with service role key)
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

    // Validate required currency fields
    if (!body.price_usd || !body.price_idr) {
      return NextResponse.json(
        { error: 'Both USD and IDR prices are required' },
        { status: 400 }
      )
    }

    // Prepare product data with all new fields
    const productData: any = {
      name: body.name,
      slug: body.slug,
      description: body.description || '',
      price_usd: body.price_usd,
      price_idr: body.price_idr,
      stock_quantity: body.stock_quantity || 0,
      collection: body.collection || '',
      in_stock: body.in_stock !== undefined ? body.in_stock : true,
      volume_ml: body.volume_ml || null,
      weight_mg: body.weight_mg || null,
      shelf_life_months: body.shelf_life_months || null,
      formulation: body.formulation || null,
      gender: body.gender || null,
      edition_type: body.edition_type || null,
      bpom_number: body.bpom_number || null,
      ships_from: body.ships_from || 'KOTA JAKARTA TIMUR',
      image_urls: body.image_urls || [],
      size: body.volume_ml ? `${body.volume_ml}ml` : '',
      category: body.collection || '', // Use collection as category for backward compatibility
      is_new: false,
      sale_price: body.sale_price || null,
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
