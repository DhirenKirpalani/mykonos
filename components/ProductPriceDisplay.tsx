'use client'

import { useState } from 'react'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'

interface ProductPriceDisplayProps {
  product: any
  quantity?: number
  showRange?: boolean
  voucher?: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
  } | null
  activeDiscounts?: Map<string, any> | null
}

export function ProductPriceDisplay({ product, quantity = 1, showRange = false, voucher = null, activeDiscounts = null }: ProductPriceDisplayProps) {
  const { region, isLoading: regionLoading } = useRegion()
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  // Show loading state while region is being determined to prevent price flash
  if (regionLoading || !region) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }
  
  // Check if product has variants with different prices
  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0
  
  // Get variant prices, applying discounts if available
  const variantPrices = hasVariants ? product.variants.map((v: any) => {
    const basePrice = region?.code === 'ID' ? (v.price_idr || 0) : (v.price_usd || 0)
    // Check if this variant has an active discount
    const discount = activeDiscounts?.get(v.name)
    return discount?.discounted_price || basePrice
  }).filter((p: number) => p > 0) : []
  
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0
  const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0
  const hasPriceRange = showRange && hasVariants && minVariantPrice > 0 && maxVariantPrice > minVariantPrice
  
  // Get original variant prices (before discount) for strikethrough
  const originalVariantPrices = hasVariants ? product.variants.map((v: any) => 
    region?.code === 'ID' ? (v.price_idr || 0) : (v.price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minOriginalVariantPrice = originalVariantPrices.length > 0 ? Math.min(...originalVariantPrices) : 0
  const maxOriginalVariantPrice = originalVariantPrices.length > 0 ? Math.max(...originalVariantPrices) : 0
  const hasVariantDiscount = activeDiscounts && activeDiscounts.size > 0
  
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
    return null
  }

  let unitPrice = getPrice()
  let originalPrice = unitPrice
  
  // Apply discount campaign price if active (for non-variant products)
  const noVariantDiscount = activeDiscounts?.get('no-variant')
  if (noVariantDiscount && noVariantDiscount.discounted_price) {
    originalPrice = unitPrice
    unitPrice = noVariantDiscount.discounted_price
  }
  
  const totalPrice = unitPrice * quantity
  const originalTotalPrice = originalPrice * quantity
  const salePrice = getSalePrice()
  const hasDiscount = (noVariantDiscount && noVariantDiscount.discounted_price < originalPrice) || (salePrice && salePrice < unitPrice)
  const currencyCode = region?.currency_code || 'USD'

  // Calculate voucher discount
  const voucherDiscount = voucher ? (
    voucher.discount_type === 'percentage' 
      ? (totalPrice * voucher.discount_value / 100)
      : voucher.discount_value
  ) : 0
  const priceAfterVoucher = totalPrice - voucherDiscount

  return (
    <div className="flex flex-col gap-1">
      {/* Show strikethrough for original prices if discounts are active */}
      {hasVariantDiscount && hasPriceRange && (
        <div className="text-lg text-gray-500 line-through">
          {formatPrice(minOriginalVariantPrice * quantity, currencyCode)} - {formatPrice(maxOriginalVariantPrice * quantity, currencyCode)}
        </div>
      )}
      {noVariantDiscount && noVariantDiscount.discounted_price < originalPrice && (
        <div className="text-lg text-gray-500 line-through">
          {formatPrice(originalTotalPrice, currencyCode)}
        </div>
      )}
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="text-3xl md:text-4xl font-bold font-montserrat text-luxury-navy">
          {hasPriceRange ? (
            voucher ? (
              <>From {formatPrice((minVariantPrice - voucherDiscount) * quantity, currencyCode)}</>
            ) : (
              <>From {formatPrice(minVariantPrice * quantity, currencyCode)}</>
            )
          ) : voucher ? (
            formatPrice(priceAfterVoucher, currencyCode)
          ) : (
            formatPrice(totalPrice, currencyCode)
          )}
        </div>
        {voucher && (
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1.5 text-xs md:text-sm text-luxury-gold hover:text-luxury-gold/80 font-medium cursor-pointer touch-manipulation"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
            Dengan Voucher
            <svg className={`h-3 w-3 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
        {hasDiscount && !voucher && (
          <>
            <span className="text-lg text-gray-400 line-through">
              {formatPrice(salePrice * quantity, currencyCode)}
            </span>
            <span className="rounded-full bg-luxury-gold px-2.5 py-1 text-xs font-semibold text-luxury-navy">
              {Math.round(((salePrice - unitPrice) / salePrice) * 100)}% OFF
            </span>
          </>
        )}
      </div>
      
      {/* Price Breakdown Modal */}
      {showBreakdown && voucher && (
        <div className="mt-3 bg-luxury-gold/5 border border-luxury-gold/20 rounded-lg p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Harga Asli</span>
            <span className="font-medium">
              {hasPriceRange 
                ? `From ${formatPrice(minVariantPrice * quantity, currencyCode)}`
                : formatPrice(totalPrice, currencyCode)
              }
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-luxury-gold">Diskon Voucher</span>
            <span className="font-semibold text-luxury-gold">
              - {formatPrice(voucherDiscount, currencyCode)}
            </span>
          </div>
          <div className="border-t border-luxury-gold/20 pt-2.5 flex justify-between">
            <span className="font-bold text-gray-900">Harga Bersih</span>
            <span className="font-bold text-luxury-navy text-lg md:text-xl">
              {hasPriceRange
                ? `From ${formatPrice((minVariantPrice - voucherDiscount) * quantity, currencyCode)}`
                : formatPrice(priceAfterVoucher, currencyCode)
              }
            </span>
          </div>
        </div>
      )}
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
