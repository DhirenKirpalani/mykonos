/**
 * DHL Integration Helpers
 * Utility functions to integrate DHL with Mykonos e-commerce
 */

import type { DHLRateRequest, DHLShipmentRequest } from './types'

/**
 * Convert Mykonos order to DHL rate request
 */
export function orderToRateRequest(order: {
  shipping_address: any
  items: Array<{
    product: any
    quantity: number
    variant_name?: string
  }>
  region_code?: string
}): Partial<DHLRateRequest> {
  // Calculate total weight and dimensions
  const packages = calculatePackages(order.items)
  
  return {
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          postalCode: process.env.DHL_SHIPPER_POSTAL_CODE || '',
          cityName: process.env.DHL_SHIPPER_CITY || '',
          countryCode: process.env.DHL_SHIPPER_COUNTRY || 'ID',
          addressLine1: (process.env.DHL_SHIPPER_ADDRESS || '').substring(0, 45),
        },
        contactInformation: {
          fullName: process.env.DHL_SHIPPER_NAME || 'Mykonos',
          companyName: 'Mykonos Fragrance',
          phone: process.env.DHL_SHIPPER_PHONE || '',
          email: process.env.DHL_SHIPPER_EMAIL || '',
        },
      },
      receiverDetails: {
        postalAddress: {
          postalCode: order.shipping_address.postal_code,
          cityName: order.shipping_address.city,
          countryCode: order.shipping_address.country,
          provinceCode: order.shipping_address.state,
          addressLine1: (order.shipping_address.address_line1 || order.shipping_address.address || '').substring(0, 45),
          addressLine2: order.shipping_address.address_line2 || undefined,
        },
        contactInformation: {
          fullName: order.shipping_address.full_name || order.shipping_address.name || order.shipping_address.recipient_name || 'Customer',
          companyName: order.shipping_address.company || order.shipping_address.full_name || order.shipping_address.name || 'Individual',
          phone: (order.shipping_address.phone || order.shipping_address.phone_number || '+6281234567890').trim() || '+6281234567890',
          email: order.shipping_address.email || 'customer@example.com',
        },
      },
    },
    packages,
    isCustomsDeclarable: order.shipping_address.country !== (process.env.DHL_SHIPPER_COUNTRY || 'ID'),
    unitOfMeasurement: 'metric',
  }
}

/**
 * Convert Mykonos order to DHL shipment request
 */
export function orderToShipmentRequest(order: {
  id: string
  order_number: string
  shipping_address: any
  items: Array<{
    product: any
    quantity: number
    variant_name?: string
    price_at_purchase: number
  }>
  total_amount: number
  currency_code?: string
  region_code?: string
}, options?: {
  autoPickup?: boolean
}): Partial<DHLShipmentRequest> {
  const packages = calculatePackages(order.items)
  const isInternational = order.shipping_address.country !== (process.env.DHL_SHIPPER_COUNTRY || 'ID')
  
  // Format date as DHL requires: '2010-02-11T17:10:09 GMT+01:00'
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  // Get timezone offset in format GMT+HH:MM
  const offset = -now.getTimezoneOffset()
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0')
  const offsetSign = offset >= 0 ? '+' : '-'
  const timezone = `GMT${offsetSign}${offsetHours}:${offsetMinutes}`
  
  const plannedShippingDateAndTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds} ${timezone}`
  
  return {
    plannedShippingDateAndTime,
    pickup: {
      isRequested: options?.autoPickup ?? false,
    },
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          postalCode: process.env.DHL_SHIPPER_POSTAL_CODE || '',
          cityName: process.env.DHL_SHIPPER_CITY || '',
          countryCode: process.env.DHL_SHIPPER_COUNTRY || 'ID',
          addressLine1: (process.env.DHL_SHIPPER_ADDRESS || '').substring(0, 45),
        },
        contactInformation: {
          fullName: process.env.DHL_SHIPPER_NAME || 'Mykonos',
          companyName: 'Mykonos Fragrance',
          phone: process.env.DHL_SHIPPER_PHONE || '',
          email: process.env.DHL_SHIPPER_EMAIL || '',
        },
      },
      receiverDetails: {
        postalAddress: {
          postalCode: order.shipping_address.postal_code || order.shipping_address.postalCode,
          cityName: order.shipping_address.city,
          countryCode: order.shipping_address.country,
          provinceCode: order.shipping_address.state || order.shipping_address.province,
          addressLine1: (order.shipping_address.address_line1 || order.shipping_address.address || '').substring(0, 45),
          addressLine2: order.shipping_address.address_line2 || undefined,
        },
        contactInformation: {
          fullName: order.shipping_address.full_name || order.shipping_address.name || order.shipping_address.recipient_name || 'Customer',
          companyName: order.shipping_address.company || order.shipping_address.full_name || order.shipping_address.name || 'Individual',
          phone: (order.shipping_address.phone || order.shipping_address.phone_number || '+6281234567890').trim() || '+6281234567890',
          email: order.shipping_address.email || 'customer@example.com',
        },
      },
    },
    content: {
      packages,
      isCustomsDeclarable: isInternational,
      declaredValue: order.total_amount,
      declaredValueCurrency: order.currency_code || 'USD',
      exportDeclaration: isInternational ? {
        lineItems: order.items.map((item, index) => ({
          number: index + 1,
          description: `${item.product.name}${item.variant_name ? ` - ${item.variant_name}` : ''}`,
          price: item.price_at_purchase,
          quantity: {
            value: item.quantity,
            unitOfMeasurement: 'PCS',
          },
          commodityCodes: item.product.hs_code ? [
            {
              typeCode: 'outbound',
              value: item.product.hs_code,
            },
          ] : undefined,
          exportReasonType: 'permanent',
          manufacturerCountry: item.product.country_of_origin || process.env.DHL_SHIPPER_COUNTRY || 'ID',
          weight: {
            netValue: item.product.product_weight || 0.5,
            grossValue: item.product.shipping_weight || 0.6,
          },
        })),
        invoice: {
          number: order.order_number,
          date: new Date().toISOString().split('T')[0],
        },
      } : undefined,
      description: 'Fragrance Products',
      incoterm: 'DAP',
      unitOfMeasurement: 'metric',
    },
  }
}

/**
 * Calculate packages from order items
 * Groups items into packages based on weight and dimensions
 */
function calculatePackages(items: Array<{
  product: any
  quantity: number
}>): Array<{
  weight: number
  dimensions: {
    length: number
    width: number
    height: number
  }
  description?: string
}> {
  // For simplicity, create one package per order
  // In production, you might want to optimize packaging
  
  const totalWeight = items.reduce((sum, item) => {
    const itemWeight = item.product.shipping_weight || item.product.product_weight || 0.5
    return sum + (itemWeight * item.quantity)
  }, 0)

  // Default package dimensions (can be customized)
  const defaultDimensions = {
    length: 30, // cm
    width: 20,  // cm
    height: 15, // cm
  }

  return [
    {
      weight: Math.max(totalWeight, 0.1), // Minimum 0.1 kg
      dimensions: defaultDimensions,
      description: `${items.length} item(s)`,
    },
  ]
}

/**
 * Get DHL product code based on service level
 */
export function getProductCode(serviceLevel: 'express' | 'economy' | 'standard'): string {
  switch (serviceLevel) {
    case 'express':
      return 'P' // DHL Express Worldwide
    case 'economy':
      return 'Y' // DHL Economy Select
    case 'standard':
    default:
      return 'N' // DHL Express 12:00
  }
}

/**
 * Format DHL tracking URL
 */
export function getTrackingUrl(trackingNumber: string): string {
  return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`
}

/**
 * Parse DHL delivery status to user-friendly message
 */
export function parseDeliveryStatus(status: string): {
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
  message: string
} {
  const statusLower = status.toLowerCase()
  
  if (statusLower.includes('delivered')) {
    return {
      status: 'delivered',
      message: 'Package delivered',
    }
  }
  
  if (statusLower.includes('out for delivery')) {
    return {
      status: 'out_for_delivery',
      message: 'Out for delivery',
    }
  }
  
  if (statusLower.includes('in transit') || statusLower.includes('transit')) {
    return {
      status: 'in_transit',
      message: 'Package in transit',
    }
  }
  
  if (statusLower.includes('exception') || statusLower.includes('delay')) {
    return {
      status: 'exception',
      message: 'Delivery exception',
    }
  }
  
  return {
    status: 'pending',
    message: 'Shipment created',
  }
}

/**
 * Calculate estimated delivery date range
 */
export function getDeliveryDateRange(transitDays: number): {
  minDate: Date
  maxDate: Date
} {
  const now = new Date()
  const minDate = new Date(now)
  minDate.setDate(now.getDate() + transitDays)
  
  const maxDate = new Date(minDate)
  maxDate.setDate(minDate.getDate() + 2) // Add 2 days buffer
  
  return { minDate, maxDate }
}
