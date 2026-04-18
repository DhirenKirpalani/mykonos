import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'

// Use server-side Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      orderId,
      customerEmail,
      customerName,
      items,
      shippingCost,
      totalAmount,
      currency = 'usd'
    } = body

    if (!orderId || !customerEmail || !items || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get base URL - detect localhost for development
    const host = request.headers.get('host') || ''
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
    
    let baseUrl: string
    if (isLocalhost) {
      // Use localhost for development
      baseUrl = `http://${host}`
    } else {
      // Use configured URL for production
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                process.env.NEXT_PUBLIC_APP_URL ||
                `${request.headers.get('x-forwarded-proto') || 'https'}://${host}`
    }
    
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Base URL not configured' },
        { status: 500 }
      )
    }

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.name,
          description: item.variant_name ? `Variant: ${item.variant_name}` : undefined,
          images: item.image_url ? [item.image_url] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }))

    // Add shipping as a line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: 'Shipping',
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${baseUrl}/track-order?payment_canceled=true`,
      customer_email: customerEmail,
      metadata: {
        order_id: orderId,
        customer_name: customerName || '',
      },
      payment_intent_data: {
        metadata: {
          order_id: orderId,
        },
      },
      // Customization options
      billing_address_collection: 'auto',
      // Don't collect shipping address - we already have it from the order
      phone_number_collection: {
        enabled: true,
      },
      custom_text: {
        submit: {
          message: 'Complete your Mykonos order',
        },
      },
      // You can add your logo/branding in Stripe Dashboard > Settings > Branding
    })

    // Update order with Stripe session ID
    console.log('💾 [STRIPE] ========== UPDATING ORDER WITH SESSION ID ==========')
    console.log('💾 [STRIPE] Order ID:', orderId)
    console.log('💾 [STRIPE] Session ID:', session.id)
    console.log('💾 [STRIPE] Payment Intent ID:', session.payment_intent)
    console.log('💾 [STRIPE] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('💾 [STRIPE] Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // First, verify the order exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, stripe_session_id, stripe_payment_intent_id')
      .eq('id', orderId)
      .single()
    
    if (fetchError) {
      console.error('❌ [STRIPE] Failed to fetch order before update:', fetchError)
    } else {
      console.log('✅ [STRIPE] Order found before update:', existingOrder)
    }
    
    // Calculate expiry time (24 hours from now, matching Stripe's default session expiry)
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    
    // Now update the order
    const { data: updateData, error: updateError } = await supabase
      .from('orders')
      .update({
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        payment_gateway: 'stripe',
        expiry_time: expiryTime,
      })
      .eq('id', orderId)
      .select()
    
    if (updateError) {
      console.error('❌ [STRIPE] Failed to update order with session ID:', updateError)
      console.error('❌ [STRIPE] Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      // Don't fail the request, but log the error
    } else {
      console.log('✅ [STRIPE] Order updated successfully!')
      console.log('✅ [STRIPE] Updated data:', updateData)
      
      // Verify the update by fetching again
      const { data: verifyData, error: verifyError } = await supabase
        .from('orders')
        .select('id, order_number, stripe_session_id, stripe_payment_intent_id')
        .eq('id', orderId)
        .single()
      
      if (verifyError) {
        console.error('❌ [STRIPE] Failed to verify update:', verifyError)
      } else {
        console.log('✅ [STRIPE] Verification - Order after update:', verifyData)
        if (verifyData.stripe_session_id === session.id) {
          console.log('✅✅✅ [STRIPE] SUCCESS! stripe_session_id was saved correctly!')
        } else {
          console.error('❌❌❌ [STRIPE] FAILED! stripe_session_id was NOT saved!')
          console.error('Expected:', session.id)
          console.error('Got:', verifyData.stripe_session_id)
        }
      }
    }
    console.log('💾 [STRIPE] ========== UPDATE COMPLETE ==========')


    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Stripe checkout session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
