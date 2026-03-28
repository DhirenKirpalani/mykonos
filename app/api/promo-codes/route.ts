import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get all promo codes (admin)
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    // Use service role key to bypass RLS for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: promoCodes, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(promoCodes || [])
  } catch (error: any) {
    console.error('Fetch promo codes error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promo codes' },
      { status: 500 }
    )
  }
}

/**
 * Create a new promo code / voucher
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    // Use service role key to bypass RLS for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const body = await request.json()

    // Server-side validation
    const errors: string[] = []

    if (!body.name || !body.name.trim()) {
      errors.push('Voucher name is required')
    }
    if (!body.code || !body.code.trim()) {
      errors.push('Voucher code is required')
    }
    if (!body.discount_type || !['percentage', 'fixed'].includes(body.discount_type)) {
      errors.push('Invalid discount type')
    }
    if (!body.discount_value || body.discount_value <= 0) {
      errors.push('Discount value must be greater than 0')
    }
    if (body.discount_type === 'percentage' && body.discount_value > 100) {
      errors.push('Percentage discount cannot exceed 100%')
    }
    if (body.max_discount_cap !== null && body.max_discount_cap !== undefined && body.max_discount_cap < 0) {
      errors.push('Maximum discount cap must be 0 or greater')
    }
    if (body.min_purchase_amount !== null && body.min_purchase_amount !== undefined && body.min_purchase_amount < 0) {
      errors.push('Minimum purchase amount must be 0 or greater')
    }
    if (body.valid_from && body.valid_until && new Date(body.valid_until) <= new Date(body.valid_from)) {
      errors.push('End date must be after start date')
    }
    if (body.usage_limit && body.max_uses_per_user && body.max_uses_per_user > body.usage_limit) {
      errors.push('Max uses per user cannot exceed total usage limit')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', message: errors.join('. ') },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', body.code.trim().toUpperCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Voucher code already exists', message: 'A voucher with this code already exists' },
        { status: 409 }
      )
    }

    // Map form fields to DB columns
    const insertData: any = {
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      discount_type: body.discount_type,
      discount_value: body.discount_value,
      min_purchase_amount: body.min_purchase_amount || null,
      max_discount_amount: body.max_discount_cap || null,
      usage_limit_global: body.usage_limit || null,
      usage_limit_per_user: body.max_uses_per_user || null,
      usage_count: 0,
      valid_from: body.valid_from || null,
      valid_until: body.valid_until || null,
      is_active: body.is_active ?? true,
      scope: body.scope || 'all',
      applicable_product_ids: body.applicable_product_ids || null,
      applicable_category: body.applicable_category || null,
    }

    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Voucher created successfully',
      promo_code: promoCode,
    })
  } catch (error: any) {
    console.error('Create promo code error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create voucher' },
      { status: 500 }
    )
  }
}
