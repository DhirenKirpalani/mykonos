import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Get discount by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id } = params

    const { data: discount, error } = await supabase
      .from('discounts')
      .select(`
        *,
        discount_products(
          *,
          products(id, name, image_urls, price_usd)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(discount)
  } catch (error: any) {
    console.error('Error fetching discount:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update discount
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id } = params
    const body = await request.json()

    // Update discount header
    const { error } = await supabase
      .from('discounts')
      .update({
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: body.is_active
      })
      .eq('id', id)

    if (error) throw error

    // Sync discount_products: delete all then re-insert
    if (Array.isArray(body.products)) {
      const { error: delError } = await supabase
        .from('discount_products')
        .delete()
        .eq('discount_id', id)

      if (delError) throw delError

      if (body.products.length > 0) {
        const rows = body.products.map((p: any) => ({
          discount_id: id,
          product_id: p.product_id,
          variant_id: p.variant_id || null,
          discount_type: p.discount_type || 'fixed',
          discount_value: p.discount_value || 0,
          discounted_price: p.discounted_price,
          original_price: p.original_price ?? null,
          promo_stock: p.promo_stock || null,
          min_purchase: p.min_purchase || null,
          is_active: p.is_active ?? true
        }))

        const { error: insError } = await supabase
          .from('discount_products')
          .insert(rows)

        if (insError) throw insError
      }
    }

    return NextResponse.json({
      message: 'Discount updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating discount:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Delete discount
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id } = params

    // Delete discount (cascade will delete discount_products)
    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      message: 'Discount deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting discount:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
