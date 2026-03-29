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
      .select('*, discount_products(*)')
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

    // Update discount
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
