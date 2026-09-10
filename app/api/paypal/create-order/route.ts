import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'
import { rateLimit } from '@/lib/paypal/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// PayPal-supported currencies
const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'SGD', 'HKD', 'NZD',
  'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'MXN',
  'BRL', 'MYR', 'PHP', 'THB', 'TWD', 'TRY', 'RUB', 'INR', 'IDR'
])

async function logPaymentAudit(orderId: string, action: string, status: string, metadata?: any) {
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: orderId,
      action: `paypal.${action}`,
      changes: { gateway: 'paypal', status, ...metadata },
      user_id: null,
      user_email: 'paypal-api',
    })
  } catch (err) {
    console.error('[PAYPAL-CREATE] Failed to write audit log:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 create-order requests per minute per IP
    const limited = rateLimit(request, 10, 60_000)
    if (limited) return limited

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { orderId, items, shippingCost, totalAmount, currency = 'USD' } = body

    if (!orderId || !items || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate currency
    const currencyUpper = currency.toUpperCase()
    if (!PAYPAL_SUPPORTED_CURRENCIES.has(currencyUpper)) {
      console.error(`[PAYPAL-CREATE] Unsupported currency: ${currencyUpper}`)
      return NextResponse.json(
        { error: `Unsupported currency: ${currencyUpper}` },
        { status: 400 }
      )
    }

    const accessToken = await getPayPalAccessToken()

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
            currency_code: currencyUpper,
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: { currency_code: currencyUpper, value: itemTotal.toFixed(2) },
              shipping: {
                currency_code: currencyUpper,
                value: (shippingCost || 0).toFixed(2),
              },
            },
          },
          items: items.map((item: any) => ({
            name: item.name,
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: currencyUpper,
              value: item.price.toFixed(2),
            },
          })),
        },
      ],
    }

    // Use idempotency key to prevent duplicate order creation on retries
    const requestId = `create-${orderId}`

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(paypalOrder),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[PAYPAL-CREATE] PayPal API error:', data.message || response.status)
      await logPaymentAudit(orderId, 'create.failed', 'failed', {
        error: data.message,
        currency: currencyUpper,
      })
      return NextResponse.json({ error: data.message || 'Failed to create PayPal order' }, { status: 500 })
    }

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
      console.error('[PAYPAL-CREATE] Failed to update order:', updateError.message)
    }

    await logPaymentAudit(orderId, 'create.success', 'pending_payment', {
      paypal_order_id: data.id,
      currency: currencyUpper,
      total: totalAmount,
    })

    return NextResponse.json({ orderID: data.id })
  } catch (error: any) {
    console.error('[PAYPAL-CREATE] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to create PayPal order' }, { status: 500 })
  }
}
