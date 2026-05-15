/**
 * DHL Express API Client
 * Handles all API calls to DHL Express MyDHL API
 */

import { getDHLBaseUrl, getDHLAuthHeader, DHL_CONFIG } from './config'
import type {
  DHLRateRequest,
  DHLRateResponse,
  DHLShipmentRequest,
  DHLShipmentResponse,
  DHLTrackingRequest,
  DHLTrackingResponse,
  DHLPickupRequest,
  DHLPickupResponse,
  DHLError,
  DHLAddress,
} from './types'

class DHLClient {
  private baseUrl: string
  private authHeader: string

  constructor() {
    this.baseUrl = getDHLBaseUrl()
    this.authHeader = getDHLAuthHeader()
  }

  /**
   * Make authenticated request to DHL API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const requestId = `DHL-${Date.now()}`
    
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }

    // Detailed request logging
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🚀 DHL API Request [${requestId}]`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📍 URL:', url)
    console.log('🔧 Method:', options.method || 'GET')
    console.log('🔑 Environment:', process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX')
    console.log('📦 Headers:', {
      ...headers,
      Authorization: headers.Authorization.substring(0, 20) + '...' // Mask credentials
    })
    if (options.body) {
      console.log('📄 Request Body:')
      console.log(JSON.stringify(JSON.parse(options.body as string), null, 2))
    }
    console.log('⏰ Timestamp:', new Date().toISOString())
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const startTime = Date.now()
      const response = await fetch(url, {
        ...options,
        headers,
      })
      const duration = Date.now() - startTime

      const data = await response.json()

      // Detailed response logging
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`✅ DHL API Response [${requestId}]`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 Status:', response.status, response.statusText)
      console.log('⏱️  Duration:', `${duration}ms`)
      console.log('📄 Response Data:', JSON.stringify(data, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      if (!response.ok) {
        const error = data as DHLError
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error(`❌ DHL API Error [${requestId}]`)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('🔴 Status:', response.status)
        console.error('💬 Message:', error.message || error.detail)
        console.error('📋 Title:', error.title)
        console.error('🔍 Instance:', error.instance)
        console.error('📝 Full Error:', JSON.stringify(error, null, 2))
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        throw new Error(error.message || error.detail || 'DHL API request failed')
      }

      return data as T
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error(`💥 DHL API Exception [${requestId}]`)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('⚠️  Error Type:', error.name)
      console.error('💬 Error Message:', error.message)
      console.error('📚 Stack Trace:', error.stack)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      throw error
    }
  }

  /**
   * Get shipping rates for a shipment
   * GET /rates - Single piece
   * POST /rates - Multi-piece
   */
  async getRates(request: DHLRateRequest): Promise<DHLRateResponse> {
    // Use POST for multi-piece shipments
    if (request.packages.length > 1) {
      return this.request<DHLRateResponse>(DHL_CONFIG.ENDPOINTS.RATES, {
        method: 'POST',
        body: JSON.stringify(request),
      })
    }

    // Use GET for single piece shipments
    const params = new URLSearchParams({
      accountNumber: request.accounts[0].number,
      originCountryCode: request.customerDetails.shipperDetails.postalAddress.countryCode,
      originPostalCode: request.customerDetails.shipperDetails.postalAddress.postalCode,
      originCityName: request.customerDetails.shipperDetails.postalAddress.cityName,
      destinationCountryCode: request.customerDetails.receiverDetails.postalAddress.countryCode,
      destinationPostalCode: request.customerDetails.receiverDetails.postalAddress.postalCode,
      destinationCityName: request.customerDetails.receiverDetails.postalAddress.cityName,
      weight: request.packages[0].weight.toString(),
      length: request.packages[0].dimensions.length.toString(),
      width: request.packages[0].dimensions.width.toString(),
      height: request.packages[0].dimensions.height.toString(),
      plannedShippingDate: request.plannedShippingDateAndTime.split('T')[0],
      isCustomsDeclarable: request.isCustomsDeclarable.toString(),
      unitOfMeasurement: request.unitOfMeasurement,
    })

    return this.request<DHLRateResponse>(
      `${DHL_CONFIG.ENDPOINTS.RATES}?${params.toString()}`
    )
  }

  /**
   * Get available DHL products for a route
   */
  async getProducts(params: {
    accountNumber: string
    originCountryCode: string
    originPostalCode: string
    originCityName: string
    destinationCountryCode: string
    destinationPostalCode: string
    destinationCityName: string
    weight: number
    length: number
    width: number
    height: number
    plannedShippingDate: string
    isCustomsDeclarable: boolean
    unitOfMeasurement: 'metric' | 'imperial'
  }): Promise<DHLRateResponse> {
    const queryParams = new URLSearchParams({
      accountNumber: params.accountNumber,
      originCountryCode: params.originCountryCode,
      originPostalCode: params.originPostalCode,
      originCityName: params.originCityName,
      destinationCountryCode: params.destinationCountryCode,
      destinationPostalCode: params.destinationPostalCode,
      destinationCityName: params.destinationCityName,
      weight: params.weight.toString(),
      length: params.length.toString(),
      width: params.width.toString(),
      height: params.height.toString(),
      plannedShippingDate: params.plannedShippingDate,
      isCustomsDeclarable: params.isCustomsDeclarable.toString(),
      unitOfMeasurement: params.unitOfMeasurement,
    })

    return this.request<DHLRateResponse>(
      `${DHL_CONFIG.ENDPOINTS.PRODUCTS}?${queryParams.toString()}`
    )
  }

  /**
   * Create a shipment
   */
  async createShipment(request: DHLShipmentRequest): Promise<DHLShipmentResponse> {
    return this.request<DHLShipmentResponse>(DHL_CONFIG.ENDPOINTS.SHIPMENTS, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Track shipment(s)
   */
  async trackShipment(trackingNumber: string, options?: {
    trackingView?: 'all-checkpoints' | 'last-checkpoint' | 'shipment-details-only'
    levelOfDetail?: 'all' | 'shipment' | 'piece'
  }): Promise<DHLTrackingResponse> {
    // Return mock data for test tracking numbers
    if (trackingNumber.startsWith('TEST-') || trackingNumber.startsWith('7777')) {
      console.log('🎭 Using mock tracking data for test number:', trackingNumber)
      return this.getMockTrackingData(trackingNumber)
    }

    const params = new URLSearchParams({
      shipmentTrackingNumber: trackingNumber,
    })

    if (options?.trackingView) {
      params.append('trackingView', options.trackingView)
    }
    if (options?.levelOfDetail) {
      params.append('levelOfDetail', options.levelOfDetail)
    }

    return this.request<DHLTrackingResponse>(
      `${DHL_CONFIG.ENDPOINTS.TRACKING}?${params.toString()}`
    )
  }

  /**
   * Get mock tracking data for testing
   */
  private getMockTrackingData(trackingNumber: string): DHLTrackingResponse {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const formatTime = (date: Date) => date.toISOString().split('T')[1].substring(0, 8)

    const baseShipment = {
      shipperDetails: {
        name: 'Mykonos Fragrance',
        postalAddress: {
          cityName: 'Jakarta',
          postalCode: '13920',
          countryCode: 'ID'
        }
      },
      receiverDetails: {
        name: 'Test Customer',
        postalAddress: {
          cityName: 'Jakarta',
          postalCode: '12345',
          countryCode: 'ID'
        }
      },
      totalWeight: 0.5,
      unitOfMeasurements: 'metric' as const,
      numberOfPieces: 1
    }

    // Different mock data based on tracking number
    if (trackingNumber === 'TEST-TRANSIT') {
      return {
        shipments: [{
          ...baseShipment,
          shipmentTrackingNumber: trackingNumber,
          status: 'Success',
          shipmentTimestamp: twoDaysAgo.toISOString(),
          productCode: 'N',
          description: 'Fragrance Products',
          events: [
            {
              date: formatDate(yesterday),
              time: formatTime(yesterday),
              typeCode: 'PU',
              description: 'Shipment picked up',
              serviceArea: [{
                code: 'JKT',
                description: 'Jakarta-ID'
              }]
            },
            {
              date: formatDate(now),
              time: formatTime(now),
              typeCode: 'PL',
              description: 'Processed at sort facility',
              serviceArea: [{
                code: 'JKT',
                description: 'Jakarta-ID'
              }]
            }
          ]
        }]
      }
    }

    // Default: Delivered status
    return {
      shipments: [{
        ...baseShipment,
        shipmentTrackingNumber: trackingNumber,
        status: 'Success',
        shipmentTimestamp: twoDaysAgo.toISOString(),
        productCode: 'N',
        description: 'Fragrance Products',
        events: [
          {
            date: formatDate(twoDaysAgo),
            time: '09:00:00',
            typeCode: 'PU',
            description: 'Shipment picked up',
            serviceArea: [{
              code: 'JKT',
              description: 'Jakarta-ID'
            }]
          },
          {
            date: formatDate(twoDaysAgo),
            time: '14:00:00',
            typeCode: 'PL',
            description: 'Processed at sort facility',
            serviceArea: [{
              code: 'JKT',
              description: 'Jakarta-ID'
            }]
          },
          {
            date: formatDate(yesterday),
            time: '23:00:00',
            typeCode: 'DF',
            description: 'Arrived at delivery facility',
            serviceArea: [{
              code: 'JKT',
              description: 'Jakarta-ID'
            }]
          },
          {
            date: formatDate(now),
            time: '08:30:00',
            typeCode: 'WC',
            description: 'With delivery courier',
            serviceArea: [{
              code: 'JKT',
              description: 'Jakarta-ID'
            }]
          },
          {
            date: formatDate(now),
            time: '10:00:00',
            typeCode: 'OK',
            description: 'Delivered',
            serviceArea: [{
              code: 'JKT',
              description: 'Jakarta-ID'
            }],
            signedBy: 'Customer'
          }
        ]
      }]
    }
  }

  /**
   * Track multiple shipments
   */
  async trackMultipleShipments(trackingNumbers: string[]): Promise<DHLTrackingResponse> {
    const params = new URLSearchParams()
    trackingNumbers.forEach(number => {
      params.append('shipmentTrackingNumber', number)
    })

    return this.request<DHLTrackingResponse>(
      `${DHL_CONFIG.ENDPOINTS.TRACKING}?${params.toString()}`
    )
  }

  /**
   * Create a pickup request
   */
  async createPickup(request: DHLPickupRequest): Promise<DHLPickupResponse> {
    return this.request<DHLPickupResponse>(DHL_CONFIG.ENDPOINTS.PICKUPS, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Cancel a pickup
   */
  async cancelPickup(
    dispatchConfirmationNumber: string,
    requestorName: string,
    reason: string
  ): Promise<void> {
    const params = new URLSearchParams({
      requestorName,
      reason,
    })

    await this.request<void>(
      `${DHL_CONFIG.ENDPOINTS.PICKUPS}/${dispatchConfirmationNumber}?${params.toString()}`,
      {
        method: 'DELETE',
      }
    )
  }

  /**
   * Validate an address
   */
  async validateAddress(params: {
    type: 'pickup' | 'delivery'
    countryCode: string
    postalCode: string
    cityName: string
    countyName?: string
    strictValidation?: boolean
  }): Promise<{
    warnings?: string[]
    address?: DHLAddress[]
  }> {
    const queryParams = new URLSearchParams({
      type: params.type,
      countryCode: params.countryCode,
      postalCode: params.postalCode,
      cityName: params.cityName,
    })

    if (params.countyName) {
      queryParams.append('countyName', params.countyName)
    }
    if (params.strictValidation !== undefined) {
      queryParams.append('strictValidation', params.strictValidation.toString())
    }

    return this.request<{ warnings?: string[]; address?: DHLAddress[] }>(
      `${DHL_CONFIG.ENDPOINTS.ADDRESS_VALIDATE}?${queryParams.toString()}`
    )
  }

  /**
   * Get proof of delivery
   */
  async getProofOfDelivery(shipmentTrackingNumber: string): Promise<{
    documents: Array<{
      content: string
      typeCode: string
    }>
  }> {
    const endpoint = DHL_CONFIG.ENDPOINTS.PROOF_OF_DELIVERY.replace(
      '{shipmentTrackingNumber}',
      shipmentTrackingNumber
    )

    return this.request<{
      documents: Array<{
        content: string
        typeCode: string
      }>
    }>(endpoint)
  }
}

// Export singleton instance
export const dhlClient = new DHLClient()
