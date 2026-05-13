import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'
import type { DHLShipmentRequest } from '@/lib/dhl/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/shipping/dhl/shipment
 * Create a DHL Express shipment
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.shipper || !body.receiver || !body.packages || !body.productCode) {
      return NextResponse.json(
        { error: 'Missing required fields: shipper, receiver, packages, productCode' },
        { status: 400 }
      )
    }

    // Build DHL shipment request
    const shipmentRequest: DHLShipmentRequest = {
      plannedShippingDateAndTime: body.plannedShippingDate || new Date().toISOString(),
      pickup: {
        isRequested: body.pickup?.isRequested ?? false,
        closeTime: body.pickup?.closeTime,
        location: body.pickup?.location,
        specialInstructions: body.pickup?.specialInstructions,
      },
      productCode: body.productCode,
      localProductCode: body.localProductCode,
      getRateEstimates: body.getRateEstimates ?? false,
      accounts: [
        {
          typeCode: 'shipper',
          number: body.accountNumber || process.env.DHL_ACCOUNT_NUMBER || '',
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
            isRequested: body.isCustomsDeclarable ?? true,
          },
        ],
      },
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: body.shipper.postalCode,
            cityName: body.shipper.cityName,
            countryCode: body.shipper.countryCode,
            provinceCode: body.shipper.provinceCode,
            addressLine1: body.shipper.addressLine1,
            addressLine2: body.shipper.addressLine2,
          },
          contactInformation: {
            personName: body.shipper.contactName,
            companyName: body.shipper.companyName,
            phoneNumber: body.shipper.phoneNumber,
            emailAddress: body.shipper.emailAddress,
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: body.receiver.postalCode,
            cityName: body.receiver.cityName,
            countryCode: body.receiver.countryCode,
            provinceCode: body.receiver.provinceCode,
            addressLine1: body.receiver.addressLine1,
            addressLine2: body.receiver.addressLine2,
          },
          contactInformation: {
            personName: body.receiver.contactName,
            companyName: body.receiver.companyName || body.receiver.contactName,
            phoneNumber: body.receiver.phoneNumber,
            emailAddress: body.receiver.emailAddress,
          },
        },
      },
      content: {
        packages: body.packages.map((pkg: any, index: number) => ({
          weight: pkg.weight,
          dimensions: {
            length: pkg.dimensions.length,
            width: pkg.dimensions.width,
            height: pkg.dimensions.height,
          },
          customerReferences: pkg.customerReferences ? [
            {
              value: pkg.customerReferences,
              typeCode: 'CU',
            },
          ] : undefined,
          description: pkg.description || 'Fragrance Products',
        })),
        isCustomsDeclarable: body.isCustomsDeclarable ?? true,
        declaredValue: body.declaredValue,
        declaredValueCurrency: body.declaredValueCurrency || 'USD',
        exportDeclaration: body.isCustomsDeclarable ? {
          lineItems: body.lineItems?.map((item: any, index: number) => ({
            number: index + 1,
            description: item.description,
            price: item.price,
            quantity: {
              value: item.quantity,
              unitOfMeasurement: 'PCS',
            },
            commodityCodes: item.hsCode ? [
              {
                typeCode: 'outbound',
                value: item.hsCode,
              },
            ] : undefined,
            exportReasonType: 'permanent',
            manufacturerCountry: item.originCountry || body.shipper.countryCode,
            weight: {
              netValue: item.weight,
              grossValue: item.weight,
            },
          })) || [],
          invoice: {
            number: body.invoiceNumber || `INV-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
          },
        } : undefined,
        description: body.description || 'Fragrance Products',
        incoterm: body.incoterm || 'DAP',
        unitOfMeasurement: body.unitOfMeasurement || 'metric',
      },
    }

    // Create shipment with DHL
    const shipment = await dhlClient.createShipment(shipmentRequest)

    return NextResponse.json({
      success: true,
      shipmentTrackingNumber: shipment.shipmentTrackingNumber,
      trackingUrl: shipment.trackingUrl,
      packages: shipment.packages,
      documents: shipment.documents,
      dispatchConfirmationNumbers: shipment.dispatchConfirmationNumbers,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
    })
  } catch (error: any) {
    console.error('DHL Shipment API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create shipment',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
