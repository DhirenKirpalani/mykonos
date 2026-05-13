/**
 * DHL Express API Configuration
 * API Documentation: https://developer.dhl.com/api-reference/dhl-express-mydhl-api
 */

export const DHL_CONFIG = {
  // Base URLs
  SANDBOX_URL: 'https://express.api.dhl.com/mydhlapi/test',
  PRODUCTION_URL: 'https://express.api.dhl.com/mydhlapi',
  
  // API Version
  API_VERSION: '3.2.2',
  
  // Endpoints
  ENDPOINTS: {
    RATES: '/rates',
    PRODUCTS: '/products',
    SHIPMENTS: '/shipments',
    TRACKING: '/tracking',
    PICKUPS: '/pickups',
    ADDRESS_VALIDATE: '/address-validate',
    PROOF_OF_DELIVERY: '/shipments/{shipmentTrackingNumber}/proof-of-delivery',
    UPLOAD_IMAGE: '/shipments/{shipmentTrackingNumber}/upload-image',
    UPLOAD_INVOICE: '/shipments/{shipmentTrackingNumber}/upload-invoice-data',
  },
  
  // Default values
  DEFAULTS: {
    ACCOUNT_NUMBER: process.env.DHL_ACCOUNT_NUMBER || '',
    UNIT_OF_MEASUREMENT: 'metric', // or 'imperial'
    CURRENCY: 'USD',
    LANGUAGE_CODE: 'eng',
  },
} as const

/**
 * Get DHL API base URL based on environment
 */
export function getDHLBaseUrl(): string {
  return process.env.NODE_ENV === 'production' 
    ? DHL_CONFIG.PRODUCTION_URL 
    : DHL_CONFIG.SANDBOX_URL
}

/**
 * Get DHL API credentials
 */
export function getDHLCredentials() {
  const username = process.env.DHL_API_KEY || process.env.DHL_API_USERNAME
  const password = process.env.DHL_API_SECRET || process.env.DHL_API_PASSWORD
  
  if (!username || !password) {
    throw new Error('DHL API credentials not configured. Please set DHL_API_KEY and DHL_API_SECRET in environment variables.')
  }
  
  return {
    username,
    password,
    accountNumber: process.env.DHL_ACCOUNT_NUMBER || '',
  }
}

/**
 * Create Basic Auth header for DHL API
 */
export function getDHLAuthHeader(): string {
  const { username, password } = getDHLCredentials()
  const credentials = Buffer.from(`${username}:${password}`).toString('base64')
  return `Basic ${credentials}`
}
