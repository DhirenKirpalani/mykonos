import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'
import { verifyUserAuth } from '@/lib/auth/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipping/dhl/validate-address
 * Validate complete customer address with DHL using /rates endpoint.
 * Unlike /address-validate (which only checks city/postal/country),
 * /rates validates the FULL address: street, city, postal, country.
 * A dummy 1kg package is used for the rate request.
 *
 * Requires authentication — any logged-in user can validate an address.
 *
 * NOTE: POST /rates uses a FLAT customerDetails structure:
 *   shipperDetails: { postalCode, cityName, countryCode, addressLine1, ... }
 * NOT the nested { postalAddress: {...}, contactInformation: {...} } structure.
 */
export async function POST(request: Request) {
  const requestId = `VALIDATE-${Date.now()}`
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    console.log(`[DHL Validate] Address validation [${requestId}]`)
  }

  try {
    const auth = await verifyUserAuth(request)
    if (!auth.ok) return auth.response

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

    if (!isProduction) {
      console.log(`[DHL Validate] Country: ${body.countryCode}, Postal: ${body.postalCode}, City: ${body.cityName}`)
    }

    // Build DHL Rate Request with FULL receiver address
    // Shipper = company address from env vars (required — no silent fallback)
    // Receiver = customer's complete address (street, name, phone, city, postal, country)
    const shipperPostalCode = process.env.DHL_SHIPPER_POSTAL_CODE
    const shipperCity = process.env.DHL_SHIPPER_CITY
    const shipperCountry = process.env.DHL_SHIPPER_COUNTRY
    const shipperAddress = process.env.DHL_SHIPPER_ADDRESS

    if (!shipperPostalCode || !shipperCity || !shipperCountry || !shipperAddress) {
      console.error(`[DHL Validate] Missing DHL_SHIPPER_* env vars [${requestId}]`)
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          warnings: ['Shipping configuration error. Please contact support.'],
          suggestions: [],
          message: 'Shipper address not configured',
        },
        { status: 500 }
      )
    }

    const rateRequest = {
      customerDetails: {
        shipperDetails: {
          postalCode: shipperPostalCode,
          cityName: shipperCity,
          countryCode: shipperCountry,
          addressLine1: shipperAddress.substring(0, 45),
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

    // Use POST /rates directly (not getRates() which falls back to GET for 1 package)
    // POST sends the full JSON body including street, name, phone
    const rates = await (dhlClient as any).request('/rates', {
      method: 'POST',
      body: JSON.stringify(rateRequest),
    })

    if (!isProduction) {
      console.log(`[DHL Validate] Address is VALID, products: ${rates.products?.length || 0}`)
    }

    return NextResponse.json({
      success: true,
      isValid: true,
      warnings: [],
      suggestions: [],
      message: 'Address is valid for DHL shipping',
      products: rates.products?.map((p: any) => p.productName) || [],
    })
  } catch (error: any) {
    if (!isProduction) {
      console.error(`[DHL Validate] Failed [${requestId}]: ${error.message}`)
    }

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
