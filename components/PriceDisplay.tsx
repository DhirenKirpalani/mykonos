'use client'

import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils/region'

interface PriceDisplayProps {
  price: number
  salePrice?: number | null
  className?: string
  showOriginal?: boolean
}

export function PriceDisplay({
  price,
  salePrice,
  className = '',
  showOriginal = true,
}: PriceDisplayProps) {
  const { region } = useRegion()

  if (!region) {
    return <span className={className}>Loading...</span>
  }

  const hasDiscount = salePrice !== null && salePrice !== undefined && salePrice < price
  const displayPrice = hasDiscount ? salePrice : price

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-serif text-lg font-bold text-luxury-gold">
        {formatPrice(displayPrice, region)}
      </span>
      {hasDiscount && showOriginal && (
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(price, region)}
        </span>
      )}
    </div>
  )
}
