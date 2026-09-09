import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, items, shippingCost, totalAmount, currency = 'USD' } = body

    console.log('🔵 [PAYPAL-CREATE] POST /api/paypal/create-order')
    console.log('🔵 [PAYPAL-CREATE] Request body:', { orderId, items: items?.length, shippingCost, totalAmount, currency })

    if (!orderId || !items || !totalAmount) {
      console.error('❌ [PAYPAL-CREATE] Missing required fields:', { orderId: !!orderId, items: !!items, totalAmount: !!totalAmount })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('🔵 [PAYPAL-CREATE] Getting PayPal access token...')
    const accessToken = await getPayPalAccessToken()
    console.log('✅ [PAYPAL-CREATE] Access token obtained')

    // Build PayPal order payload
    const itemTotal = items.reduce((sum: number, item: any) => {
      return sum + item.price * item.quantity
    }, 0)

    const paypalOrder = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          amount: {
            currency_code: currency.toUpperCase(),
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: { currency_code: currency.toUpperCase(), value: itemTotal.toFixed(2) },
              shipping: {
                currency_code: currency.toUpperCase(),
                value: (shippingCost || 0).toFixed(2),
              },
            },
          },
          items: items.map((item: any) => ({
            name: item.name,
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: item.price.toFixed(2),
            },
          })),
        },
      ],
    }

    console.log('🔵 [PAYPAL-CREATE] Item total:', itemTotal.toFixed(2))
    console.log('🔵 [PAYPAL-CREATE] PayPal order payload:', JSON.stringify(paypalOrder, null, 2))

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paypalOrder),
    })

    console.log('📡 [PAYPAL-CREATE] PayPal API response status:', response.status)
    const data = await response.json()
    console.log('📡 [PAYPAL-CREATE] PayPal API response:', data)

    if (!response.ok) {
      console.error('❌ [PAYPAL-CREATE] PayPal API error:', data)
      return NextResponse.json({ error: data.message || 'Failed to create PayPal order' }, { status: 500 })
    }

    console.log('✅ [PAYPAL-CREATE] PayPal order created, ID:', data.id)

    // Update order with PayPal order ID
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paypal_order_id: data.id,
        payment_gateway: 'paypal',
        expiry_time: expiryTime,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ [PAYPAL-CREATE] Failed to update order with PayPal ID:', updateError)
    } else {
      console.log('✅ [PAYPAL-CREATE] Order updated with PayPal order ID:', data.id)
    }

    return NextResponse.json({ orderID: data.id })
  } catch (error: any) {
    console.error('❌ [PAYPAL-CREATE] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create PayPal order' }, { status: 500 })
  }
}
