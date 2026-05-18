import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderShippedEmail } from '@/lib/email/order-emails'
import { dhlClient } from '@/lib/dhl/client'
import { orderToShipmentRequest, getProductCode } from '@/lib/dhl/helpers'
import type { DHLShipmentRequest } from '@/lib/dhl/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/[orderId]/create-shipment
 * Create DHL shipment for an order (triggered by "Mark as Shipped" button)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requestId = `SHIP-${Date.now()}`
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📦 Creating DHL Shipment [${requestId}]`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🆔 Order ID:', params.id)
  console.log('⏰ Timestamp:', new Date().toISOString())
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get order details with all necessary information
    console.log('📥 Fetching order details...')
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError)
      return NextResponse.json(
        { error: 'Order not found', details: orderError },
        { status: 404 }
      )
    }

    // shipping_address is stored as JSONB in the orders table
    const shippingAddress = order.shipping_address

    console.log('✅ Order fetched:', {
      orderNumber: order.order_number,
      itemCount: order.items?.length || 0,
      total: order.total_amount,
      currency: order.currency_code,
      destination: shippingAddress?.country,
      hasShippingAddress: !!shippingAddress,
    })

    // Check if shipment already exists
    if (order.dhl_shipment_number) {
      console.log('⚠️  Shipment already exists:', order.dhl_shipment_number)
      return NextResponse.json({
        success: false,
        error: 'Shipment already created',
        trackingNumber: order.dhl_shipment_number,
        trackingUrl: order.dhl_tracking_url,
      })
    }

    // Validate shipping address
    if (!shippingAddress) {
      console.error('❌ No shipping address found')
      return NextResponse.json(
        { error: 'No shipping address found for this order' },
        { status: 400 }
      )
    }

    console.log('📍 Shipping Address:', {
      name: shippingAddress.name,
      address: shippingAddress.address_line1 || shippingAddress.address,
      city: shippingAddress.city,
      country: shippingAddress.country,
      postalCode: shippingAddress.postal_code,
    })

    // Get service level from request body or use default
    const body = await request.json().catch(() => ({}))
    const serviceLevel = body.serviceLevel || 'standard'
    const productCode = getProductCode(serviceLevel)

    console.log('🚚 Service Level:', serviceLevel, '→ Product Code:', productCode)

    // Fetch DHL auto-pickup setting
    let autoPickup = false
    let pickupCloseTime = '18:00'
    let pickupLocation = 'reception'
    
    try {
      const { data: pickupSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'dhl_auto_pickup')
        .single()
      
      autoPickup = pickupSetting?.setting_value?.enabled ?? false
      pickupCloseTime = pickupSetting?.setting_value?.closeTime ?? '18:00'
      pickupLocation = pickupSetting?.setting_value?.location ?? 'reception'
      
      console.log('📦 DHL Auto-Pickup Configuration:', {
        enabled: autoPickup,
        closeTime: pickupCloseTime,
        location: pickupLocation
      })
    } catch (error) {
      console.log('⚠️  Could not fetch auto-pickup setting, using defaults')
    }

    // Layer 3: Pre-shipment address validation
    console.log('🔍 Validating shipping address with DHL...')
    try {
      const addressValidation = await dhlClient.validateAddress({
        type: 'delivery',
        countryCode: shippingAddress.country,
        postalCode: shippingAddress.postal_code || shippingAddress.postalCode,
        cityName: shippingAddress.city,
        strictValidation: false, // Allow warnings but still proceed
      })

      if (addressValidation.warnings && addressValidation.warnings.length > 0) {
        console.log('⚠️  Address validation warnings:', addressValidation.warnings)
        // Log warnings but continue - admin can override
      } else {
        console.log('✅ Address validated successfully')
      }
    } catch (validationError: any) {
      console.log('⚠️  Address validation failed, proceeding anyway:', validationError.message)
      // Don't block shipment creation if validation fails
      // Admin has already reviewed the order
    }

    // Build DHL shipment request
    console.log('🔨 Building DHL shipment request...')
    const baseRequest = orderToShipmentRequest(order, { 
      autoPickup,
      pickupCloseTime,
      pickupLocation
    })
    
    const shipmentRequest: DHLShipmentRequest = {
      ...baseRequest as DHLShipmentRequest,
      productCode,
      accounts: [
        {
          typeCode: 'shipper',
          number: process.env.DHL_ACCOUNT_NUMBER || '',
        },
      ],
      outputImageProperties: {
        imageOptions: [
          {
            typeCode: 'label',
            isRequested: true,
          },
          {
            typeCode: 'invoice',
            isRequested: baseRequest.content?.isCustomsDeclarable || false,
          },
        ],
      },
    }

    console.log('📋 Shipment Request Summary:', {
      productCode: shipmentRequest.productCode,
      isCustomsDeclarable: shipmentRequest.content?.isCustomsDeclarable,
      packageCount: shipmentRequest.content?.packages?.length || 0,
      declaredValue: shipmentRequest.content?.declaredValue,
      currency: shipmentRequest.content?.declaredValueCurrency,
    })

    // Log full shipment request for debugging
    console.log('📄 Full Shipment Request:', JSON.stringify(shipmentRequest, null, 2))

    // Create shipment with DHL
    console.log('🚀 Calling DHL API to create shipment...')
    const shipment = await dhlClient.createShipment(shipmentRequest)

    console.log('✅ DHL Shipment Created Successfully!')
    console.log('📦 Tracking Number:', shipment.shipmentTrackingNumber)
    console.log('🔗 Tracking URL:', shipment.trackingUrl)
    console.log('📄 Documents:', shipment.documents?.length || 0)

    // Update order with DHL shipment information
    console.log('💾 Updating order in database...')
    
    // Create public tracking URL for customers
    const publicTrackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${shipment.shipmentTrackingNumber}&brand=DHL`
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        dhl_shipment_number: shipment.shipmentTrackingNumber,
        dhl_tracking_url: shipment.trackingUrl, // API tracking URL (for admin)
        dhl_label_pdf: shipment.documents?.find((d: any) => d.typeCode === 'label')?.content,
        dhl_product_code: productCode,
        dhl_service_name: shipment.shipmentDetails?.[0]?.productShortName,
        tracking_number: shipment.shipmentTrackingNumber,
        tracking_url: publicTrackingUrl, // Public tracking URL (for customers)
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('⚠️  Failed to update order:', updateError)
      // Shipment was created but DB update failed
      return NextResponse.json({
        success: true,
        warning: 'Shipment created but failed to update order',
        shipmentTrackingNumber: shipment.shipmentTrackingNumber,
        trackingUrl: shipment.trackingUrl,
        updateError: updateError.message,
      })
    }

    console.log('✅ Order updated successfully')
    
    // Send shipping notification email to customer
    console.log('📧 Sending shipping notification email...')
    try {
      const customerName = order.shipping_address?.full_name || order.customer_email?.split('@')[0] || 'Customer'
      await sendOrderShippedEmail({
        orderId: order.id,
        orderNumber: order.order_number,
        customerEmail: order.customer_email,
        customerName,
        trackingNumber: shipment.shipmentTrackingNumber,
        trackingUrl: publicTrackingUrl
      })
      console.log('✅ Shipping notification email sent')
    } catch (emailError: any) {
      console.error('⚠️  Failed to send shipping email:', emailError.message)
      // Don't fail the whole request if email fails
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✨ Shipment Creation Complete [${requestId}]`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      shipmentTrackingNumber: shipment.shipmentTrackingNumber,
      trackingUrl: shipment.trackingUrl,
      packages: shipment.packages,
      documents: shipment.documents?.map((doc: any) => ({
        typeCode: doc.typeCode,
        imageFormat: doc.imageFormat,
        // Don't send full base64 in response, just indicate it exists
        hasContent: !!doc.content,
      })),
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      dispatchConfirmationNumbers: shipment.dispatchConfirmationNumbers,
    })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`💥 Shipment Creation Failed [${requestId}]`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('⚠️  Error Type:', error.name)
    console.error('💬 Error Message:', error.message)
    console.error('📚 Stack Trace:', error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create DHL shipment',
        details: error.toString(),
        orderId: params.id,
      },
      { status: 500 }
    )
  }
}
