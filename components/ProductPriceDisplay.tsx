'use client'

import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'

interface ProductPriceDisplayProps {
  product: any
  quantity?: number
  showRange?: boolean
}

export function ProductPriceDisplay({ product, quantity = 1, showRange = false }: ProductPriceDisplayProps) {
  const { region } = useRegion()
  
  // Check if product has variants with different prices
  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0
  const variantPrices = hasVariants ? product.variants.map((v: any) => 
    region?.code === 'ID' ? (v.price_idr || 0) : (v.price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0
  const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0
  const hasPriceRange = showRange && hasVariants && minVariantPrice > 0 && maxVariantPrice > minVariantPrice
  
  // Get compare-at prices for variants
  const variantCompareAtPrices = hasVariants ? product.variants.map((v: any) => 
    region?.code === 'ID' ? (v.compare_at_price_idr || 0) : (v.compare_at_price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minVariantCompareAtPrice = variantCompareAtPrices.length > 0 ? Math.min(...variantCompareAtPrices) : 0
  const maxVariantCompareAtPrice = variantCompareAtPrices.length > 0 ? Math.max(...variantCompareAtPrices) : 0
  const hasVariantCompareAtPrice = hasVariants && (minVariantCompareAtPrice > minVariantPrice || maxVariantCompareAtPrice > maxVariantPrice)
  
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
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-medium text-[#EE4D2D]">
          {hasPriceRange ? (
            <>
              {formatPrice(minVariantPrice * quantity, currencyCode)} - {formatPrice(maxVariantPrice * quantity, currencyCode)}
            </>
          ) : (
            formatPrice(totalPrice, currencyCode)
          )}
        </div>
        {hasDiscount && !hasPriceRange && (
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
      {/* Compare-at price for variants */}
      {hasPriceRange && hasVariantCompareAtPrice && (
        <div className="text-lg text-gray-400 line-through">
          {minVariantCompareAtPrice === maxVariantCompareAtPrice 
            ? formatPrice(minVariantCompareAtPrice * quantity, currencyCode)
            : `${formatPrice(minVariantCompareAtPrice * quantity, currencyCode)} - ${formatPrice(maxVariantCompareAtPrice * quantity, currencyCode)}`
          }
        </div>
      )}
    </div>
  )
}
