'use client'

import { Truck, AlertCircle } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'
import { getDeliveryEstimate, formatPrice } from '@/lib/utils/region'

interface ShippingInfoProps {
  cartTotal?: number
  className?: string
}

export function ShippingInfo({ cartTotal = 0, className = '' }: ShippingInfoProps) {
  const { region, detectionResult } = useRegion()

  if (!region || !detectionResult) {
    return null
  }

  const { country_region, shipping_zone } = detectionResult

  if (!country_region?.is_shipping_available) {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="text-sm">
          <p className="font-medium text-red-900">Shipping Not Available</p>
          <p className="mt-1 text-red-700">
            We currently don't ship to your location. Please select a different region or contact support.
          </p>
        </div>
      </div>
    )
  }

  const deliveryEstimate = getDeliveryEstimate(
    country_region.estimated_delivery_days_min,
    country_region.estimated_delivery_days_max
  )

  const isFreeShipping = shipping_zone?.free_shipping_threshold && 
                         cartTotal >= shipping_zone.free_shipping_threshold

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border/40 bg-luxury-gray-light p-4 ${className}`}>
      <Truck className="h-5 w-5 flex-shrink-0 text-luxury-gold" />
      <div className="flex-1 text-sm">
        <p className="font-medium">
          {isFreeShipping ? 'Free Shipping' : shipping_zone?.name || 'Shipping Available'}
        </p>
        <p className="mt-1 text-muted-foreground">
          Estimated delivery: {deliveryEstimate}
        </p>
        {!isFreeShipping && shipping_zone && (
          <p className="mt-1 text-muted-foreground">
            Shipping cost: {formatPrice(shipping_zone.base_rate, region)}
            {shipping_zone.free_shipping_threshold && (
              <span className="ml-1">
                (Free over {formatPrice(shipping_zone.free_shipping_threshold, region)})
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
