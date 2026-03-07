import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { getMidtransSnapClient } from '@/lib/midtrans/config'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    // Get authorization header (optional for guest checkout)
    const authHeader = request.headers.get('authorization')
    
    // Create Supabase client with auth header if provided
    const supabase = authHeader 
      ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        })
      : createClient<Database>(supabaseUrl, supabaseAnonKey)
    
    // Verify user if auth header is provided (authenticated checkout)
    // For guest checkout, skip user verification
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid token' },
          { status: 401 }
        )
      }
    }

    const body = await request.json()
    const { orderId, amount, customerDetails, items } = body

    if (!orderId || !amount || !customerDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const snap = getMidtransSnapClient()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: customerDetails.firstName,
        last_name: customerDetails.lastName || '',
        email: customerDetails.email,
        phone: customerDetails.phone,
      },
      item_details: items?.map((item: any) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })) || [],
      callbacks: {
        finish: `${baseUrl}/api/midtrans/callback?order_id=${orderId}`,
      },
    }

    const transaction = await snap.createTransaction(parameter)
    
    return NextResponse.json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    })
  } catch (error: any) {
    console.error('Midtrans token creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment token' },
      { status: 500 }
    )
  }
}
