import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipping/dhl/validate-address
 * Validate customer address with DHL before allowing checkout/shipment
 */
export async function POST(request: Request) {
  const requestId = `VALIDATE-${Date.now()}`
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📍 DHL Address Validation [${requestId}]`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.countryCode || !body.postalCode || !body.cityName) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: countryCode, postalCode, cityName',
          isValid: false,
        },
        { status: 400 }
      )
    }

    console.log('📋 Validating Address:', {
      country: body.countryCode,
      postalCode: body.postalCode,
      city: body.cityName,
      type: body.type || 'delivery',
    })

    // Call DHL address validation API
    const validation = await dhlClient.validateAddress({
      type: body.type || 'delivery', // 'pickup' or 'delivery'
      countryCode: body.countryCode,
      postalCode: body.postalCode,
      cityName: body.cityName,
      countyName: body.countyName,
      strictValidation: body.strictValidation ?? true, // Strict by default
    })

    console.log('✅ Validation Result:', {
      hasWarnings: !!validation.warnings && validation.warnings.length > 0,
      warningCount: validation.warnings?.length || 0,
      hasAddressSuggestions: !!validation.address && validation.address.length > 0,
    })

    // Check if address is valid
    const isValid = !validation.warnings || validation.warnings.length === 0
    
    return NextResponse.json({
      success: true,
      isValid,
      warnings: validation.warnings || [],
      suggestions: validation.address || [],
      message: isValid 
        ? 'Address is valid for DHL shipping' 
        : 'Address has validation warnings',
    })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`❌ Address Validation Failed [${requestId}]`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💬 Error:', error.message)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json(
      {
        success: false,
        isValid: false,
        error: error.message || 'Failed to validate address',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
