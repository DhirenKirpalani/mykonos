'use client'

import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils/region'
import { PricingCalculation } from '@/lib/types/promo'

interface OrderSummaryProps {
  pricing: PricingCalculation
  className?: string
}

export function OrderSummary({ pricing, className = '' }: OrderSummaryProps) {
  const { region } = useRegion()

  if (!region) return null

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatPrice(pricing.subtotal, region)}</span>
      </div>

      {pricing.discount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-600">
            {pricing.discount_description || 'Discount'}
          </span>
          <span className="font-medium text-green-600">
            -{formatPrice(pricing.discount, region)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Shipping</span>
        <span className="font-medium">
          {pricing.shipping === 0 ? 'Free' : formatPrice(pricing.shipping, region)}
        </span>
      </div>

      {pricing.tax > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tax ({region.tax_rate}%)</span>
          <span className="font-medium">{formatPrice(pricing.tax, region)}</span>
        </div>
      )}

      <div className="border-t border-border/40 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg font-bold">Total</span>
          <span className="font-serif text-xl font-bold text-luxury-gold">
            {formatPrice(pricing.total, region)}
          </span>
        </div>
      </div>

      {pricing.promo_code_applied && (
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-xs text-green-800">
            Promo code <strong>{pricing.promo_code_applied}</strong> applied
          </p>
        </div>
      )}
    </div>
  )
}
