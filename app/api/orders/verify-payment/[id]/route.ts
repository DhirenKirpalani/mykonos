import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const midtransServerKey = process.env.MIDTRANS_SERVER_KEY || ''
const midtransApiUrl = process.env.MIDTRANS_API_URL || 'https://api.midtrans.com'

/**
 * IMPROVEMENT #3: Manual Payment Verification Endpoint
 * 
 * This endpoint manually verifies payment status with Midtrans API
 * Use when webhook fails or for manual reconciliation
 * 
 * GET /api/orders/verify-payment/[order_id]
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    console.log('🔍 [VERIFY] Verifying payment for order:', orderId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, payment_intent_id, total_amount, currency_code, expiry_time')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ [VERIFY] Order not found:', orderId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const typedOrder = order as any

    // If already completed, return current status
    if (typedOrder.payment_status === 'completed') {
      console.log('✅ [VERIFY] Order already completed')
      return NextResponse.json({
        order_id: typedOrder.id,
        order_number: typedOrder.order_number,
        payment_status: typedOrder.payment_status,
        verified: true,
        message: 'Order already completed'
      })
    }

    // Call Midtrans API to check actual payment status
    console.log('📞 [VERIFY] Calling Midtrans API for order:', typedOrder.order_number)
    
    const authString = Buffer.from(midtransServerKey + ':').toString('base64')
    const midtransResponse = await fetch(
      `${midtransApiUrl}/v2/${typedOrder.order_number}/status`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        }
      }
    )

    if (!midtransResponse.ok) {
      console.error('❌ [VERIFY] Midtrans API error:', midtransResponse.status)
      return NextResponse.json({
        order_id: typedOrder.id,
        order_number: typedOrder.order_number,
        payment_status: typedOrder.payment_status,
        verified: false,
        error: 'Failed to verify with Midtrans',
        midtrans_status: midtransResponse.status
      })
    }

    const midtransData = await midtransResponse.json()
    console.log('📊 [VERIFY] Midtrans response:', midtransData)

    const {
      transaction_status,
      fraud_status,
      gross_amount,
      currency,
      transaction_id
    } = midtransData

    // Verify signature
    const signatureKey = crypto
      .createHash('sha512')
      .update(`${typedOrder.order_number}${transaction_status}${gross_amount}${midtransServerKey}`)
      .digest('hex')

    const isSignatureValid = signatureKey === midtransData.signature_key

    // Check if payment status differs from our database
    const needsUpdate = (
      (transaction_status === 'capture' || transaction_status === 'settlement') &&
      typedOrder.payment_status !== 'completed'
    )

    if (needsUpdate) {
      console.log('⚠️ [VERIFY] Payment status mismatch detected!')
      console.log('Database:', typedOrder.payment_status)
      console.log('Midtrans:', transaction_status)

      // Update order via complete_order_payment function
      const { error: updateError } = await supabase.rpc('complete_order_payment', {
        p_order_id: typedOrder.id,
        p_payment_intent_id: transaction_id,
        p_transaction_status: transaction_status,
        p_gross_amount: parseFloat(gross_amount),
        p_currency: currency
      } as any)

      if (updateError) {
        console.error('❌ [VERIFY] Failed to update order:', updateError)
        return NextResponse.json({
          order_id: typedOrder.id,
          order_number: typedOrder.order_number,
          payment_status: typedOrder.payment_status,
          midtrans_status: transaction_status,
          verified: true,
          updated: false,
          error: updateError.message
        })
      }

      console.log('✅ [VERIFY] Order updated successfully')
      return NextResponse.json({
        order_id: typedOrder.id,
        order_number: typedOrder.order_number,
        payment_status: 'completed',
        midtrans_status: transaction_status,
        verified: true,
        updated: true,
        message: 'Payment verified and order updated'
      })
    }

    // Status matches, no update needed
    return NextResponse.json({
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      payment_status: typedOrder.payment_status,
      midtrans_status: transaction_status,
      fraud_status,
      verified: true,
      updated: false,
      signature_valid: isSignatureValid,
      message: 'Payment status verified, no update needed'
    })

  } catch (error: any) {
    console.error('❌ [VERIFY] Payment verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
