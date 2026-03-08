'use client'

import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'

interface ProductPriceDisplayProps {
  product: any
  quantity?: number
}

export function ProductPriceDisplay({ product, quantity = 1 }: ProductPriceDisplayProps) {
  const { region } = useRegion()
  
  // Determine which price to use based on region
  const getPrice = () => {
    if (region?.code === 'ID' && product.price_idr) {
      return product.price_idr
    }
    return product.price_usd || 0 // USD by default
  }

  const getSalePrice = () => {
    if (region?.code === 'ID' && product.price_idr) {
      // If there's a compare_at_price, use it as the sale reference
      return product.compare_at_price ? product.compare_at_price : null
    }
    return product.sale_price
  }

  const unitPrice = getPrice()
  const totalPrice = unitPrice * quantity
  const salePrice = getSalePrice()
  const hasDiscount = salePrice && salePrice < unitPrice
  const currencyCode = region?.currency_code || 'USD'

  return (
    <div className="flex items-baseline gap-3">
      <div className="text-3xl font-medium text-[#EE4D2D]">
        {formatPrice(totalPrice, currencyCode)}
      </div>
      {hasDiscount && (
        <>
          <span className="text-lg text-gray-400 line-through">
            {formatPrice(salePrice * quantity, currencyCode)}
          </span>
          <span className="rounded bg-[#EE4D2D] px-2 py-0.5 text-xs font-medium text-white">
            {Math.round(((salePrice - unitPrice) / salePrice) * 100)}% OFF
          </span>
        </>
      )}
    </div>
  )
}
