import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore - called from Route Handler
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore - called from Route Handler
            }
          },
        },
      }
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)
    
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i]
        const product: any = {}

        headers.forEach((header, index) => {
          const cleanHeader = header.replace('*', '').trim()
          product[cleanHeader] = row[index]?.trim() || null
        })

        // Convert boolean strings
        const booleanFields = ['allow_backorder', 'halal_certified', 'is_featured', 'is_pre_order']
        booleanFields.forEach(field => {
          if (product[field]) {
            product[field] = product[field].toLowerCase() === 'true'
          } else {
            product[field] = false
          }
        })

        // Convert numeric fields
        const numericFields = {
          price_usd: 'price',
          price_idr: 'price_idr',
          cost_price: 'cost_price',
          compare_at_price: 'compare_at_price',
          stock_quantity: 'stock_quantity',
          low_stock_threshold: 'low_stock_threshold',
          volume_ml: 'volume_ml',
          weight_grams: 'weight_grams',
          shipping_weight_grams: 'shipping_weight_grams',
          package_length_cm: 'package_length_cm',
          package_width_cm: 'package_width_cm',
          package_height_cm: 'package_height_cm',
          shelf_life_months: 'shelf_life_months',
          min_purchase_quantity: 'min_purchase_quantity',
          max_purchase_quantity: 'max_purchase_quantity',
          pre_order_duration_days: 'pre_order_duration_days'
        }

        Object.entries(numericFields).forEach(([csvField, dbField]) => {
          if (product[csvField]) {
            const value = parseFloat(product[csvField])
            product[dbField] = isNaN(value) ? null : value
          } else {
            product[dbField] = null
          }
        })

        // Handle price_usd mapping
        if (product.price_usd) {
          product.price = parseFloat(product.price_usd)
          delete product.price_usd
        }

        // Set defaults
        product.status = product.status || 'draft'
        product.in_stock = true
        product.is_active = product.status === 'active'
        product.min_purchase_quantity = product.min_purchase_quantity || 1

        // Required fields
        if (!product.name || !product.sku || !product.brand || !product.slug || !product.price || !product.price_idr || product.stock_quantity === null) {
          throw new Error('Missing required fields')
        }

        // Insert product
        const { error: insertError } = await supabase
          .from('products')
          .insert(product)

        if (insertError) {
          throw insertError
        }

        successCount++
      } catch (error: any) {
        errorCount++
        errors.push({
          row: i + 2,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: successCount,
      errors: errorCount,
      errorDetails: errors
    })

  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process bulk upload' },
      { status: 500 }
    )
  }
}

function parseCSV(text: string): string[][] {
  const lines = text.split('\n').filter(line => line.trim())
  return lines.map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  })
}
