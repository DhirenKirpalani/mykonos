/**
 * Carrier tracking utilities
 */

export interface CarrierInfo {
  code: string
  name: string
  trackingUrl: string
}

/**
 * Get tracking URL for a carrier and tracking number
 */
export function getTrackingUrl(carrierCode: string, trackingNumber: string): string | null {
  const templates: Record<string, string> = {
    USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}',
    FEDEX: 'https://www.fedex.com/fedextrack/?trknbr={tracking_number}',
    UPS: 'https://www.ups.com/track?tracknum={tracking_number}',
    DHL: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}',
    ROYAL_MAIL: 'https://www.royalmail.com/track-your-item#/tracking-results/{tracking_number}',
    DPD: 'https://www.dpd.co.uk/apps/tracking/?reference={tracking_number}',
    ARAMEX: 'https://www.aramex.com/us/en/track/shipments?ShipmentNumber={tracking_number}',
    CANADA_POST: 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={tracking_number}',
    AUSTRALIA_POST: 'https://auspost.com.au/mypost/track/#/details/{tracking_number}',
    LA_POSTE: 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking_number}',
  }

  const template = templates[carrierCode.toUpperCase()]
  if (!template) return null

  return template.replace('{tracking_number}', trackingNumber)
}

/**
 * Get carrier display name
 */
export function getCarrierName(carrierCode: string): string {
  const names: Record<string, string> = {
    USPS: 'USPS',
    FEDEX: 'FedEx',
    UPS: 'UPS',
    DHL: 'DHL',
    ROYAL_MAIL: 'Royal Mail',
    DPD: 'DPD',
    ARAMEX: 'Aramex',
    CANADA_POST: 'Canada Post',
    AUSTRALIA_POST: 'Australia Post',
    LA_POSTE: 'La Poste',
  }

  return names[carrierCode.toUpperCase()] || carrierCode
}

/**
 * Format tracking number for display
 */
export function formatTrackingNumber(trackingNumber: string): string {
  // Remove spaces and convert to uppercase
  return trackingNumber.replace(/\s/g, '').toUpperCase()
}

/**
 * Get order status display information
 */
export function getOrderStatusInfo(status: string): {
  label: string
  color: string
  description: string
} {
  const statusMap: Record<string, { label: string; color: string; description: string }> = {
    pending: {
      label: 'Pending',
      color: 'gray',
      description: 'Order is being processed',
    },
    processing: {
      label: 'Processing',
      color: 'blue',
      description: 'Order is being prepared',
    },
    shipped: {
      label: 'Shipped',
      color: 'purple',
      description: 'Order has been shipped',
    },
    out_for_delivery: {
      label: 'Out for Delivery',
      color: 'indigo',
      description: 'Order is out for delivery',
    },
    delivered: {
      label: 'Delivered',
      color: 'green',
      description: 'Order has been delivered',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'red',
      description: 'Order has been cancelled',
    },
    exception: {
      label: 'Exception',
      color: 'yellow',
      description: 'Delivery exception occurred',
    },
    refunded: {
      label: 'Refunded',
      color: 'gray',
      description: 'Order has been refunded',
    },
  }

  return statusMap[status] || {
    label: status,
    color: 'gray',
    description: 'Unknown status',
  }
}

/**
 * Check if order has tracking information
 */
export function hasTrackingInfo(order: any): boolean {
  return !!(order.tracking_number && order.carrier_code)
}

/**
 * Check if order is trackable (shipped but not delivered)
 */
export function isOrderTrackable(order: any): boolean {
  return hasTrackingInfo(order) && 
         ['shipped', 'out_for_delivery'].includes(order.status)
}

/**
 * Get estimated delivery date display
 */
export function getEstimatedDeliveryDisplay(
  estimatedDate: string | null,
  shippedAt: string | null,
  estimatedDaysMin: number,
  estimatedDaysMax: number
): string {
  if (estimatedDate) {
    const date = new Date(estimatedDate)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (shippedAt) {
    const shipped = new Date(shippedAt)
    const minDate = new Date(shipped)
    minDate.setDate(minDate.getDate() + estimatedDaysMin)
    const maxDate = new Date(shipped)
    maxDate.setDate(maxDate.getDate() + estimatedDaysMax)

    if (estimatedDaysMin === estimatedDaysMax) {
      return minDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }

    return `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  return `${estimatedDaysMin}-${estimatedDaysMax} business days`
}
