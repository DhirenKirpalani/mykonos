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
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        })
      : createClient(supabaseUrl, supabaseAnonKey)
    
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
    const { orderId, amount, customerDetails, items, shippingAddress } = body

    console.log('\n=== 💳 MIDTRANS TOKEN CREATION START ===')
    console.log('📋 [MIDTRANS] Request Body:', JSON.stringify(body, null, 2))
    console.log('📋 [MIDTRANS] Order ID:', orderId)
    console.log('📋 [MIDTRANS] Amount:', amount)
    console.log('📋 [MIDTRANS] Customer Details:', customerDetails)
    console.log('📋 [MIDTRANS] Items Count:', items?.length || 0)
    console.log('📋 [MIDTRANS] Has Shipping Address:', !!shippingAddress)

    // Detailed field validation
    const missingFields = []
    if (!orderId) missingFields.push('orderId')
    if (!amount) missingFields.push('amount')
    if (!customerDetails) {
      missingFields.push('customerDetails')
    } else {
      if (!customerDetails.firstName) missingFields.push('customerDetails.firstName')
      if (!customerDetails.email) missingFields.push('customerDetails.email')
      if (!customerDetails.phone) missingFields.push('customerDetails.phone')
    }

    if (missingFields.length > 0) {
      console.error('❌ [MIDTRANS] Missing required fields:', missingFields)
      console.error('❌ [MIDTRANS] Received body:', JSON.stringify(body, null, 2))
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields: missingFields,
          receivedFields: Object.keys(body)
        },
        { status: 400 }
      )
    }

    console.log('✅ [MIDTRANS] All required fields present')

    const snap = getMidtransSnapClient()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const parameter: any = {
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

    // Add shipping address if provided
    if (shippingAddress) {
      parameter.customer_details.shipping_address = {
        first_name: shippingAddress.firstName || customerDetails.firstName,
        last_name: shippingAddress.lastName || customerDetails.lastName || '',
        email: shippingAddress.email || customerDetails.email,
        phone: shippingAddress.phone || customerDetails.phone,
        address: shippingAddress.address,
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        country_code: shippingAddress.countryCode || 'IDN',
      }
      console.log('📦 [MIDTRANS] Shipping address added to transaction')
    }

    console.log('📤 [MIDTRANS] Sending transaction to Midtrans API...')
    console.log('📋 [MIDTRANS] Transaction Parameters:', JSON.stringify(parameter, null, 2))

    const transaction = await snap.createTransaction(parameter)
    
    console.log('✅ [MIDTRANS] Transaction created successfully!')
    console.log('🎫 [MIDTRANS] Token:', transaction.token?.substring(0, 20) + '...')
    console.log('🔗 [MIDTRANS] Redirect URL:', transaction.redirect_url)
    console.log('=== 💳 MIDTRANS TOKEN CREATION END (SUCCESS) ===\n')
    
    return NextResponse.json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    })
  } catch (error: any) {
    console.error('\n❌ [MIDTRANS] EXCEPTION in token creation')
    console.error('❌ [MIDTRANS] Error:', error)
    console.error('❌ [MIDTRANS] Error Message:', error.message)
    console.error('❌ [MIDTRANS] Error Stack:', error.stack)
    if (error.ApiResponse) {
      console.error('❌ [MIDTRANS] API Response:', JSON.stringify(error.ApiResponse, null, 2))
    }
    console.error('=== 💳 MIDTRANS TOKEN CREATION END (FAILED) ===\n')
    
    return NextResponse.json(
      { error: error.message || 'Failed to create payment token' },
      { status: 500 }
    )
  }
}
