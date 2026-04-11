import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email/order-emails'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Process order status changes from queue and send emails
 * This runs independently of Midtrans webhook
 * Can be called via cron job or manually
 */
export async function POST() {
  try {
    console.log('\n=== 📧 PROCESSING ORDER STATUS CHANGES ===')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get unprocessed status changes
    const { data: changes, error: fetchError } = await supabase
      .from('order_status_change_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50)
    
    if (fetchError) {
      console.error('❌ Error fetching status changes:', fetchError)
      throw fetchError
    }
    
    if (!changes || changes.length === 0) {
      console.log('✅ No pending status changes to process')
      return NextResponse.json({ 
        success: true, 
        processed: 0,
        message: 'No pending status changes'
      })
    }
    
    console.log(`📋 Found ${changes.length} status changes to process`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const change of changes) {
      try {
        console.log(`\n📧 Processing change ${change.id}:`, {
          order_id: change.order_id,
          old_status: change.old_status,
          new_status: change.new_status,
          old_payment_status: change.old_payment_status,
          new_payment_status: change.new_payment_status
        })
        
        // Fetch order details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, customer_email, user_id, shipping_address, status, payment_status')
          .eq('id', change.order_id)
          .single()
        
        if (orderError || !order) {
          console.error('❌ Order not found:', change.order_id)
          errorCount++
          continue
        }
        
        const typedOrder = order as any
        
        // Get customer name
        let customerName = 'Customer'
        
        if (typedOrder.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', typedOrder.user_id)
            .single()
          
          if (userData && (userData.first_name || userData.last_name)) {
            customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          }
        }
        
        if (customerName === 'Customer') {
          const shippingAddress = typedOrder.shipping_address || {}
          customerName = shippingAddress.full_name || typedOrder.customer_email?.split('@')[0] || 'Customer'
        }
        
        // Determine if we should send email
        const shouldSendEmail = 
          // Payment status changed to paid
          (change.old_payment_status !== 'paid' && change.new_payment_status === 'paid') ||
          // Order status changed to processing, packed, shipped, delivered
          (['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(change.new_status) && 
           change.old_status !== change.new_status) ||
          // Order cancelled
          (change.new_status === 'cancelled' && change.old_status !== 'cancelled')
        
        if (shouldSendEmail && typedOrder.customer_email) {
          console.log(`📧 Sending email for status change...`)
          
          await sendOrderConfirmationEmail({
            orderId: typedOrder.id,
            orderNumber: typedOrder.order_number,
            customerEmail: typedOrder.customer_email,
            customerName: customerName
          })
          
          console.log(`✅ Email sent for order ${typedOrder.order_number}`)
          successCount++
        } else {
          console.log(`⏭️ Skipping email - not a critical status change`)
        }
        
        // Mark as processed
        await supabase
          .from('order_status_change_queue')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString() 
          })
          .eq('id', change.id)
        
      } catch (error: any) {
        console.error(`❌ Error processing change ${change.id}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n=== 📧 PROCESSING COMPLETE ===`)
    console.log(`✅ Success: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    
    return NextResponse.json({ 
      success: true, 
      processed: changes.length,
      successCount,
      errorCount
    })
    
  } catch (error: any) {
    console.error('❌ Error processing status changes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process status changes' },
      { status: 500 }
    )
  }
}

// Also allow GET for cron jobs
export async function GET() {
  return POST()
}
