import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'
import type { DHLRateRequest } from '@/lib/dhl/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipping/dhl/rates
 * Get shipping rates from DHL Express
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

    // Build DHL rate request
    const rateRequest: DHLRateRequest = {
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: body.origin.postalCode,
            cityName: body.origin.cityName,
            countryCode: body.origin.countryCode,
            provinceCode: body.origin.provinceCode,
            addressLine1: body.origin.addressLine1,
          },
          contactInformation: {
            fullName: body.origin.contactName || 'Shipper',
            companyName: body.origin.companyName || 'Mykonos',
            phone: body.origin.phoneNumber || '+1234567890',
            email: body.origin.emailAddress,
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: body.destination.postalCode,
            cityName: body.destination.cityName,
            countryCode: body.destination.countryCode,
            provinceCode: body.destination.provinceCode,
            addressLine1: body.destination.addressLine1,
          },
          contactInformation: {
            fullName: body.destination.contactName || 'Receiver',
            companyName: body.destination.companyName || 'Customer',
            phone: body.destination.phoneNumber || '+1234567890',
            email: body.destination.emailAddress,
          },
        },
      },
      accounts: [
        {
          typeCode: 'shipper',
          number: body.accountNumber || process.env.DHL_ACCOUNT_NUMBER || '',
        },
      ],
      plannedShippingDateAndTime: body.plannedShippingDate || new Date().toISOString(),
      unitOfMeasurement: body.unitOfMeasurement || 'metric',
      isCustomsDeclarable: body.isCustomsDeclarable ?? true,
      packages: body.packages.map((pkg: any) => ({
        weight: pkg.weight,
        dimensions: {
          length: pkg.dimensions.length,
          width: pkg.dimensions.width,
          height: pkg.dimensions.height,
        },
        customerReferences: pkg.customerReferences,
        description: pkg.description,
      })),
    }

    // Get rates from DHL
    const rates = await dhlClient.getRates(rateRequest)

    // Transform response for frontend
    const transformedRates = rates.products.map(product => ({
      serviceType: product.productName,
      serviceCode: product.productCode,
      localServiceCode: product.localProductCode,
      totalPrice: product.totalPrice[0]?.price || 0,
      currency: product.totalPrice[0]?.priceCurrency || 'USD',
      estimatedDelivery: product.deliveryCapabilities.estimatedDeliveryDateAndTime,
      transitDays: product.deliveryCapabilities.totalTransitDays,
      pickupDate: product.pickupCapabilities.localCutoffDateAndTime,
      priceBreakdown: product.totalPriceBreakdown?.[0]?.priceBreakdown || [],
    }))

    return NextResponse.json({
      success: true,
      rates: transformedRates,
      exchangeRates: rates.exchangeRates,
    })
  } catch (error: any) {
    console.error('DHL Rates API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get shipping rates',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
