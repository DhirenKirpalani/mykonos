import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipping/dhl/validate-address
 * Validate complete customer address with DHL using /rates endpoint.
 * Unlike /address-validate (which only checks city/postal/country),
 * /rates validates the FULL address: street, city, postal, country.
 * A dummy 1kg package is used for the rate request.
 *
 * NOTE: POST /rates uses a FLAT customerDetails structure:
 *   shipperDetails: { postalCode, cityName, countryCode, addressLine1, ... }
 * NOT the nested { postalAddress: {...}, contactInformation: {...} } structure.
 */
export async function POST(request: Request) {
  const requestId = `VALIDATE-${Date.now()}`

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📍 DHL Full Address Validation [${requestId}]`)
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

    console.log('📋 Validating Full Address:', {
      country: body.countryCode,
      postalCode: body.postalCode,
      city: body.cityName,
      addressLine1: body.addressLine1,
      countyName: body.countyName,
      fullName: body.full_name,
      phone: body.phone,
      type: body.type || 'delivery',
    })
    console.log('📥 Incoming Request Body:', JSON.stringify(body, null, 2))

    // Build DHL Rate Request with FULL receiver address
    // Shipper = company address from env vars
    // Receiver = customer's complete address (street, name, phone, city, postal, country)
    const rateRequest = {
      customerDetails: {
        shipperDetails: {
          postalCode: process.env.DHL_SHIPPER_POSTAL_CODE || '13920',
          cityName: process.env.DHL_SHIPPER_CITY || 'Jakarta',
          countryCode: process.env.DHL_SHIPPER_COUNTRY || 'ID',
          addressLine1: (process.env.DHL_SHIPPER_ADDRESS || 'Kawasan Industri Pulogadung').substring(0, 45),
        },
        receiverDetails: {
          postalCode: body.postalCode,
          cityName: body.cityName,
          countryCode: body.countryCode,
          addressLine1: body.addressLine1 ? body.addressLine1.substring(0, 45) : undefined,
          countyName: body.countyName,
        },
      },
      accounts: [
        {
          typeCode: 'shipper',
          number: process.env.DHL_ACCOUNT_NUMBER || '',
        },
      ],
      plannedShippingDateAndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      unitOfMeasurement: 'metric',
      isCustomsDeclarable: false,
      packages: [
        {
          weight: 1,
          dimensions: { length: 10, width: 10, height: 10 },
        },
      ],
    }

    console.log('🚀 Calling DHL /rates (POST) with full address...')
    console.log('📤 Outgoing DHL Rate Request:', JSON.stringify(rateRequest, null, 2))
    // Use POST /rates directly (not getRates() which falls back to GET for 1 package)
    // POST sends the full JSON body including street, name, phone
    const rates = await (dhlClient as any).request('/rates', {
      method: 'POST',
      body: JSON.stringify(rateRequest),
    })

    console.log('✅ DHL /rates returned rates — address is VALID')
    console.log('📊 Products found:', rates.products?.length || 0)
    console.log('📥 DHL Response Body:', JSON.stringify(rates, null, 2))

    return NextResponse.json({
      success: true,
      isValid: true,
      warnings: [],
      suggestions: [],
      message: 'Address is valid for DHL shipping',
      products: rates.products?.map((p: any) => p.productName) || [],
    })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`❌ DHL Full Address Validation Failed [${requestId}]`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💬 Error:', error.message)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Extract validation warnings from DHL error messages
    const warnings: string[] = []
    if (error.message) {
      // Common DHL error patterns that indicate address issues
      const msg = error.message
      if (msg.includes('address') || msg.includes('Address')) {
        warnings.push(msg)
      } else if (msg.includes('postalCode') || msg.includes('postal code')) {
        warnings.push(`Invalid postal code: ${msg}`)
      } else if (msg.includes('cityName') || msg.includes('city')) {
        warnings.push(`Invalid city: ${msg}`)
      } else if (msg.includes('countryCode') || msg.includes('country')) {
        warnings.push(`Invalid country: ${msg}`)
      } else if (msg.includes('phone') || msg.includes('Phone')) {
        warnings.push(`Invalid phone number: ${msg}`)
      } else if (msg.includes('fullName') || msg.includes('name')) {
        warnings.push(`Invalid name: ${msg}`)
      } else {
        warnings.push(msg)
      }
    }

    return NextResponse.json(
      {
        success: false,
        isValid: false,
        warnings: warnings.length > 0 ? warnings : ['Address validation failed. Please check your shipping address.'],
        suggestions: [],
        message: error.message || 'Address validation failed',
      },
      { status: 200 } // Return 200 so the hook can read the JSON body
    )
  }
}
