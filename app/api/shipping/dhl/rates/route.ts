import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipping/dhl/rates
 * Get shipping rates from DHL Express using flat POST /rates structure
 * NOTE: POST /rates uses flat customerDetails (no postalAddress/contactInformation wrappers)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.origin || !body.destination || !body.packages) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination, packages' },
        { status: 400 }
      )
    }

    // Build flat DHL POST /rates request body
    const rateRequest = {
      customerDetails: {
        shipperDetails: {
          postalCode: body.origin.postalCode,
          cityName: body.origin.cityName,
          countryCode: body.origin.countryCode,
          addressLine1: body.origin.addressLine1,
          addressLine2: body.origin.addressLine2,
          addressLine3: body.origin.addressLine3,
          countyName: body.origin.countyName,
        },
        receiverDetails: {
          postalCode: body.destination.postalCode,
          cityName: body.destination.cityName,
          countryCode: body.destination.countryCode,
          addressLine1: body.destination.addressLine1,
          addressLine2: body.destination.addressLine2,
          addressLine3: body.destination.addressLine3,
          countyName: body.destination.countyName,
        },
      },
      accounts: [
        {
          typeCode: 'shipper',
          number: body.accountNumber || process.env.DHL_ACCOUNT_NUMBER || '',
        },
      ],
      plannedShippingDateAndTime: body.plannedShippingDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      unitOfMeasurement: body.unitOfMeasurement || 'metric',
      isCustomsDeclarable: body.isCustomsDeclarable ?? false,
      packages: body.packages.map((pkg: any) => ({
        weight: pkg.weight,
        dimensions: {
          length: pkg.dimensions.length,
          width: pkg.dimensions.width,
          height: pkg.dimensions.height,
        },
      })),
    }

    console.log('🚀 [DHL RATES] Calling POST /rates with flat structure')
    console.log('📤 Request:', JSON.stringify(rateRequest, null, 2))

    // Use POST /rates directly with flat structure
    const rates = await (dhlClient as any).request('/rates', {
      method: 'POST',
      body: JSON.stringify(rateRequest),
    })

    console.log('✅ [DHL RATES] Response:', JSON.stringify(rates, null, 2))

    // Transform response for frontend
    // Filter out products with price 0 (customer agreement products like EXPRESS EASY)
    // Prefer BILLC (billing currency) over PULCL or BASEC
    const transformedRates = (rates.products || [])
      .map((product: any) => {
        // Find BILLC price first, fallback to first available
        const billcPrice = product.totalPrice?.find((p: any) => p.currencyType === 'BILLC')
        const priceEntry = billcPrice || product.totalPrice?.[0]
        return {
          serviceType: product.productName,
          serviceCode: product.productCode,
          localServiceCode: product.localProductCode,
          totalPrice: priceEntry?.price ?? 0,
          currency: priceEntry?.priceCurrency || 'USD',
          estimatedDelivery: product.deliveryCapabilities?.estimatedDeliveryDateAndTime,
          transitDays: product.deliveryCapabilities?.totalTransitDays,
          pickupDate: product.pickupCapabilities?.localCutoffDateAndTime,
          priceBreakdown: product.totalPriceBreakdown?.[0]?.priceBreakdown || [],
        }
      })
      .filter((rate: any) => rate.totalPrice > 0)

    return NextResponse.json({
      success: true,
      rates: transformedRates,
      exchangeRates: rates.exchangeRates,
    })
  } catch (error: any) {
    console.error('❌ DHL Rates API Error:', error.message)
    console.error('📋 Details:', error.toString())
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get shipping rates',
        details: error.toString(),
      },
      { status: 200 } // Return 200 so client can read the JSON body
    )
  }
}
