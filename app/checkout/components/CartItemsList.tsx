'use client'

import React, { memo } from 'react'
import { formatPrice } from '@/lib/utils'
import { getEffectivePrice } from '@/lib/utils/pricing'

type CartItem = {
  id: string
  product_id: string
  quantity: number
  product: {
    name: string
    slug: string
    image_urls: string[]
    price_usd: number
    price_idr: number
    stock_quantity?: number
    min_purchase_quantity?: number | null
    max_purchase_quantity?: number | null
    variants?: any
  }
}

type CartItemsListProps = {
  items: CartItem[]
  regionCode: string | undefined
  currency: string
  activeDiscounts: Map<string, any>
  removeQuickItem: (productId: string) => void
  t: any
}

function getBasePrice(product: any, variantSku: string | null | undefined, regionCode: string | undefined): number {
  if (variantSku && product.variants) {
    const variant = product.variants.find((v: any) => v.sku === variantSku)
    if (variant) {
      return regionCode === 'ID' ? variant.price_idr : variant.price_usd
    }
  }
  return regionCode === 'ID' && product.price_idr ? product.price_idr : product.price_usd || 0
}

function getDiscountedPrice(productId: string, variantName: string | null | undefined, activeDiscounts: Map<string, any>): number | null {
  if (variantName) {
    const variantKey = `${productId}-${variantName}`
    const variantDiscount = activeDiscounts.get(variantKey)
    if (variantDiscount) return variantDiscount.discounted_price
  }
  const productDiscount = activeDiscounts.get(productId)
  if (productDiscount) return productDiscount.discounted_price
  return null
}

export const CartItemsList = memo(function CartItemsList({
  items,
  regionCode,
  currency,
  activeDiscounts,
  removeQuickItem,
  t,
}: CartItemsListProps) {
  return (
    <>
      {items.map((item) => {
        const basePrice = getBasePrice(item.product, (item as any).variant_sku, regionCode)
        const salePrice = getEffectivePrice(basePrice, null)
        const campaignDiscounted = getDiscountedPrice(item.product_id, (item as any).variant_name, activeDiscounts)
        const price = campaignDiscounted !== null ? campaignDiscounted : salePrice
        const hasCampaignDiscount = campaignDiscounted !== null && campaignDiscounted < basePrice

        return (
          <div key={item.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex gap-3 sm:gap-4">
              {/* Product Image */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                {(() => {
                  const parseImg = (raw: any): string | null => {
                    if (!raw) return null
                    if (Array.isArray(raw)) return raw.filter(Boolean)[0] || null
                    if (typeof raw === 'string') {
                      try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean)[0] || null : raw } catch { return raw }
                    }
                    return null
                  }

                  let displayImage: string | null = null
                  if ((item as any).variant_name && item.product.variants) {
                    const variants = Array.isArray(item.product.variants)
                      ? item.product.variants
                      : (() => { try { return JSON.parse(item.product.variants) } catch { return [] } })()
                    const variant = variants.find((v: any) => v.name === (item as any).variant_name)
                    if (variant?.image_url) displayImage = parseImg(variant.image_url)
                  }

                  if (!displayImage) {
                    const raw = item.product.image_urls
                    const urls: string[] = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw as any) } catch { return [] } })()
                    displayImage = urls.find(u => u && !u.includes('placehold.co')) || null
                  }

                  return displayImage ? (
                    <img
                      src={displayImage}
                      alt={(item as any).variant_name || item.product.name}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )
                })()}
              </div>

              {/* Product Details & Controls */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm sm:text-base text-gray-900 line-clamp-2 leading-tight">
                      {(item as any).variant_name || item.product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {hasCampaignDiscount ? (
                        <>
                          <span className="line-through text-gray-400">
                            {formatPrice(basePrice, regionCode || currency)}
                          </span>
                          {' '}
                          <span className="text-green-600 font-medium">
                            {formatPrice(price, regionCode || currency)}
                          </span>
                          {' / '}{t.cart.item}
                        </>
                      ) : (
                        <>{formatPrice(price, regionCode || currency)} / {t.cart.item}</>
                      )}
                    </p>
                  </div>
                  {item.id.startsWith('quick-') && (
                    <button
                      onClick={() => removeQuickItem(item.product_id)}
                      className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                      aria-label="Remove item"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm sm:text-base text-gray-600">
                      {t.trackOrder.qty}: {item.quantity}
                    </span>
                    <div className="flex flex-col items-end">
                      {hasCampaignDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(basePrice * item.quantity, regionCode || currency)}
                        </span>
                      )}
                      <p className="text-sm sm:text-base font-bold text-gray-900">
                        {formatPrice(price * item.quantity, regionCode || currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
})
