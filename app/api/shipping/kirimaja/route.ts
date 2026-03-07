import { NextResponse } from 'next/server'

/**
 * Kirimaja API integration for shipping cost calculation
 * This endpoint calculates shipping costs based on origin, destination, and package details
 */

interface ShippingRequest {
  origin: string // Origin city/postal code
  destination: string // Destination city/postal code
  weight: number // Weight in grams
  length?: number // Length in cm
  width?: number // Width in cm
  height?: number // Height in cm
  courier?: string // Courier code (e.g., 'jne', 'tiki', 'pos')
}

interface ShippingCost {
  courier: string
  service: string
  description: string
  cost: number
  etd: string // Estimated time of delivery
}

export async function POST(request: Request) {
  try {
    const body: ShippingRequest = await request.json()
    const { origin, destination, weight, length, width, height, courier } = body

    // Validate required fields
    if (!origin || !destination || !weight) {
      return NextResponse.json(
        { error: 'Origin, destination, and weight are required' },
        { status: 400 }
      )
    }

    // Get Kirimaja API credentials from environment
    const apiKey = process.env.KIRIMAJA_API_KEY
    const apiUrl = process.env.KIRIMAJA_API_URL || 'https://api.kirim.aja/v1'

    if (!apiKey) {
      console.error('Kirimaja API key not configured')
      // Return fallback shipping cost if API is not configured
      return NextResponse.json({
        costs: [
          {
            courier: 'standard',
            service: 'Standard Shipping',
            description: 'Standard delivery',
            cost: 15,
            etd: '3-5 days',
          },
        ],
      })
    }

    // Call Kirimaja API
    const response = await fetch(`${apiUrl}/shipping/cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        origin,
        destination,
        weight,
        length,
        width,
        height,
        courier: courier || 'all', // Get all couriers if not specified
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Kirimaja API error:', errorData)
      
      // Return fallback shipping cost on API error
      return NextResponse.json({
        costs: [
          {
            courier: 'standard',
            service: 'Standard Shipping',
            description: 'Standard delivery',
            cost: 15,
            etd: '3-5 days',
          },
        ],
      })
    }

    const data = await response.json()

    // Transform Kirimaja response to our format
    const costs: ShippingCost[] = data.costs?.map((cost: any) => ({
      courier: cost.courier || 'standard',
      service: cost.service || 'Standard',
      description: cost.description || 'Standard delivery',
      cost: cost.cost || 15,
      etd: cost.etd || '3-5 days',
    })) || []

    return NextResponse.json({
      costs: costs.length > 0 ? costs : [
        {
          courier: 'standard',
          service: 'Standard Shipping',
          description: 'Standard delivery',
          cost: 15,
          etd: '3-5 days',
        },
      ],
    })
  } catch (error: any) {
    console.error('Shipping calculation error:', error)
    
    // Return fallback shipping cost on error
    return NextResponse.json({
      costs: [
        {
          courier: 'standard',
          service: 'Standard Shipping',
          description: 'Standard delivery',
          cost: 15,
          etd: '3-5 days',
        },
      ],
    })
  }
}
