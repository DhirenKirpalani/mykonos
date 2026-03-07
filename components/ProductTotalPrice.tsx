'use client'

import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'

interface ProductTotalPriceProps {
  quantity: number
  price: number
  priceIdr?: number
  salePrice?: number | null
  compareAtPrice?: number | null
}

export function ProductTotalPrice({ quantity, price, priceIdr, salePrice, compareAtPrice }: ProductTotalPriceProps) {
  const { region } = useRegion()
  
  const getUnitPrice = () => {
    if (region?.code === 'ID' && priceIdr) {
      return priceIdr
    }
    return price
  }

  const unitPrice = getUnitPrice()
  const totalPrice = unitPrice * quantity
  const currencyCode = region?.currency_code || 'USD'

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {formatPrice(unitPrice, currencyCode)} × {quantity} {quantity > 1 ? 'items' : 'item'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Unit price</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-600">Total</p>
          <p className="text-2xl font-bold text-luxury-navy">
            {formatPrice(totalPrice, currencyCode)}
          </p>
        </div>
      </div>
    </div>
  )
}
