import { NextResponse } from 'next/server'
import { dhlClient } from '@/lib/dhl/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipping/dhl/tracking?trackingNumber=XXX
 * Track DHL Express shipment(s)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingNumber = searchParams.get('trackingNumber')
    const trackingNumbers = searchParams.getAll('trackingNumber')
    
    if (!trackingNumber && trackingNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Missing trackingNumber parameter' },
        { status: 400 }
      )
    }

    const trackingView = searchParams.get('trackingView') as 'all-checkpoints' | 'last-checkpoint' | 'shipment-details-only' | null
    const levelOfDetail = searchParams.get('levelOfDetail') as 'all' | 'shipment' | 'piece' | null

    let tracking
    
    if (trackingNumbers.length > 1) {
      // Track multiple shipments
      tracking = await dhlClient.trackMultipleShipments(trackingNumbers)
    } else {
      // Track single shipment
      tracking = await dhlClient.trackShipment(trackingNumber!, {
        trackingView: trackingView || undefined,
        levelOfDetail: levelOfDetail || undefined,
      })
    }

    // Transform response for frontend
    const transformedShipments = tracking.shipments.map(shipment => ({
      trackingNumber: shipment.shipmentTrackingNumber,
      status: shipment.status,
      productCode: shipment.productCode,
      description: shipment.description,
      shipper: {
        name: shipment.shipperDetails.name,
        address: shipment.shipperDetails.postalAddress,
      },
      receiver: {
        name: shipment.receiverDetails.name,
        address: shipment.receiverDetails.postalAddress,
      },
      weight: shipment.totalWeight,
      numberOfPieces: shipment.numberOfPieces,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      events: shipment.events?.map(event => ({
        date: event.date,
        time: event.time,
        description: event.description,
        location: event.serviceArea?.[0]?.description,
        signedBy: event.signedBy,
      })) || [],
      pieces: shipment.pieces?.map(piece => ({
        number: piece.number,
        trackingNumber: piece.trackingNumber,
        weight: piece.weight,
        events: piece.events?.map(event => ({
          date: event.date,
          time: event.time,
          description: event.description,
          location: event.serviceArea?.[0]?.description,
          signedBy: event.signedBy,
        })) || [],
      })) || [],
    }))

    return NextResponse.json({
      success: true,
      shipments: transformedShipments,
    })
  } catch (error: any) {
    console.error('DHL Tracking API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to track shipment',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
