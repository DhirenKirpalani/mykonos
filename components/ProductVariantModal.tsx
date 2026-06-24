'use client'

import { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProductVariant {
  name: string
  sku: string
  price_usd: number
  price_idr: number
  compare_at_price_usd?: number | null
  compare_at_price_idr?: number | null
  stock_quantity: number
  low_stock_threshold?: number
  in_stock?: boolean
  min_purchase_quantity?: number
  max_purchase_quantity?: number
  image_url?: string
}

interface ProductVariantModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    image_urls: string[]
    price: number
    variants?: ProductVariant[]
    stock_quantity: number
    min_purchase_quantity?: number | null
    max_purchase_quantity?: number | null
    pre_order_duration_days?: number | null
  }
  voucher?: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
  } | null
  activeDiscounts?: Map<string, any> | null
  onAddToCart: (productId: string, quantity: number, selectedVariants?: Record<string, string>, suppressToast?: boolean) => Promise<void>
  onBuyNow?: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  onAddToWishlist?: (selectedVariants?: Record<string, string>) => Promise<void>
  mode: 'add-to-cart' | 'buy-now' | 'wishlist'
}

export function ProductVariantModal({
  isOpen,
  onClose,
  product,
  voucher,
  activeDiscounts = null,
  onAddToCart,
  onBuyNow,
  onAddToWishlist,
  mode,
}: ProductVariantModalProps) {
  const { t } = useLanguage()
  const { region } = useRegion()
  const minQty = product.min_purchase_quantity || 1
  const maxQty = product.max_purchase_quantity || product.stock_quantity
  
  const [selectedVariants, setSelectedVariants] = useState<Map<string, { variant: ProductVariant, quantity: number }>>(new Map())
  const [quantity, setQuantity] = useState(minQty)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const currencyCode = region?.currency_code || 'USD'
  const isIDR = region?.code === 'ID'

  // Helper: parse image field that may be a string, JSON string, or array
  const parseImageField = (raw: any): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(Boolean)
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : [raw] } catch { return [raw] }
    }
    return []
  }

  if (!isOpen) return null

  const hasVariants = product.variants && product.variants.length > 0

  // Get region-based price
  const getRegionPrice = () => {
    if (isIDR) {
      const productWithIDR = product as any
      return productWithIDR.price_idr || product.price
    }
    return product.price
  }

  const basePrice = getRegionPrice()
  const noVariantCampaign = activeDiscounts?.get('no-variant')
  const effectivePrice = (noVariantCampaign && noVariantCampaign.discounted_price < basePrice)
    ? noVariantCampaign.discounted_price
    : basePrice

  // Get variant price, applying discount if available
  const getVariantPrice = (variant: ProductVariant) => {
    const basePrice = isIDR ? variant.price_idr : variant.price_usd
    const discount = activeDiscounts?.get(variant.name)
    return discount?.discounted_price ?? basePrice
  }

  const getVariantOriginalPrice = (variant: ProductVariant) => {
    return isIDR ? variant.price_idr : variant.price_usd
  }

  // Calculate price range from variants (with discounts applied)
  const getPriceRange = () => {
    if (!hasVariants || !product.variants || product.variants.length === 0) {
      return null
    }
    const prices = product.variants.map(v => getVariantPrice(v))
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return minPrice === maxPrice ? null : { min: minPrice, max: maxPrice }
  }

  // Calculate original price range (before discounts, for strikethrough)
  const getOriginalPriceRange = () => {
    if (!hasVariants || !product.variants || product.variants.length === 0) {
      return null
    }
    const prices = product.variants.map(v => getVariantOriginalPrice(v))
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return minPrice === maxPrice ? null : { min: minPrice, max: maxPrice }
  }

  const priceRange = getPriceRange()
  const originalPriceRange = getOriginalPriceRange()
  const hasDiscountedVariants = activeDiscounts && activeDiscounts.size > 0

  const handleVariantToggle = (variant: ProductVariant) => {
    setSelectedVariants(prev => {
      const newMap = new Map(prev)
      if (newMap.has(variant.sku)) {
        newMap.delete(variant.sku)
      } else {
        newMap.set(variant.sku, { variant, quantity: 1 })
      }
      return newMap
    })
    setCurrentImageIndex(0)
  }

  const handleVariantQuantityChange = (sku: string, delta: number) => {
    setSelectedVariants(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(sku)
      if (!item) return prev
      
      const newQuantity = item.quantity + delta
      const variant = item.variant
      
      // Use variant-level min/max if available, otherwise fall back to product-level
      const variantMinQty = variant.min_purchase_quantity || product.min_purchase_quantity || 1
      const variantMaxQty = variant.max_purchase_quantity || product.max_purchase_quantity || variant.stock_quantity
      
      // Validate minimum quantity
      if (newQuantity < variantMinQty) {
        toast.error(`Minimum quantity is ${variantMinQty}`)
        return prev
      }
      
      // Validate maximum quantity
      if (variantMaxQty !== null && variantMaxQty !== undefined && newQuantity > variantMaxQty) {
        toast.error(`Maximum quantity is ${variantMaxQty}`)
        return prev
      }
      
      // Validate stock quantity
      if (newQuantity > variant.stock_quantity) {
        toast.error(`Only ${variant.stock_quantity} items available`)
        return prev
      }
      
      newMap.set(sku, { variant, quantity: newQuantity })
      return newMap
    })
  }


  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isProcessing) {
      return
    }
    
    if (hasVariants && selectedVariants.size === 0) {
      toast.error(t.cart.selectVariant)
      return
    }

    setIsProcessing(true)
    try {
      // Handle products without variants
      if (!hasVariants) {
        if (mode === 'wishlist') {
          await onAddToWishlist?.({} as any)
          onClose()
        } else if (mode === 'buy-now') {
          onClose() // close first for smooth navigation
          await onBuyNow?.(product.id, quantity, {} as any)
        } else {
          await onAddToCart(product.id, quantity, {} as any)
          onClose()
        }
        return
      }

      // Handle products with variants
      const variantsArray = Array.from(selectedVariants.entries())
      
      if (mode === 'buy-now' && onBuyNow) {
        // For Buy Now, pass all variants as an array to handle multi-variant checkout
        const variantsData = variantsArray.map(([sku, { variant, quantity }]) => ({
          variant_name: variant.name,
          variant_sku: variant.sku,
          quantity: quantity
        }))
        onClose() // close first for smooth navigation
        await onBuyNow(product.id, 1, variantsData as any)
      } else {
        // For Add to Cart and Wishlist, process each variant separately
        let successCount = 0
        let failCount = 0
        const failedVariants: string[] = []
        // Always suppress individual toasts - we'll show a summary at the end
        const suppressIndividualToasts = true
        
        for (const [sku, { variant, quantity }] of variantsArray) {
          const variantData = {
            variant_name: variant.name,
            variant_sku: variant.sku
          }
          
          try {
            if (mode === 'wishlist' && onAddToWishlist) {
              await onAddToWishlist(variantData as any)
              successCount++
            } else {
              await onAddToCart(product.id, quantity, variantData as any, suppressIndividualToasts)
              successCount++
            }
          } catch (error: any) {
            console.error(`Failed to add variant ${variant.name}:`, error)
            failCount++
            failedVariants.push(variant.name)
            // Continue to next variant instead of stopping
          }
        }
        
        // Show single summary toast with ID to prevent duplicates
        if (mode !== 'wishlist') {
          const toastId = `variant-cart-${Date.now()}`
          if (successCount > 0 && failCount === 0) {
            const message = t.cart.variantsAdded
              .replace('{count}', successCount.toString())
              .replace('{plural}', successCount > 1 ? 's' : '')
            toast.success(message, { id: toastId })
          } else if (successCount > 0 && failCount > 0) {
            const message = t.cart.variantsPartiallyAdded
              .replace('{success}', successCount.toString())
              .replace('{successPlural}', successCount > 1 ? 's' : '')
              .replace('{failed}', failCount.toString())
              .replace('{failedPlural}', failCount > 1 ? 's' : '')
            toast.warning(message, { id: toastId })
          } else if (failCount > 0) {
            const itemText = failCount > 1 ? t.cart.theseItems : t.cart.thisItem
            const message = t.cart.variantsMaxQuantity.replace('{itemText}', itemText)
            toast.error(message, { id: toastId })
          }
        }
      }
      onClose()
    } catch (error) {
      console.error('Error processing request:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div 
        className="relative w-full md:max-w-4xl md:mx-4 max-h-[80vh] sm:max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl md:rounded-2xl shadow-2xl animate-slide-up md:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-3 sm:p-5 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {/* Product Image Carousel */}
            {(() => {
              const selectedArr = Array.from(selectedVariants.values())
              // Images = last selected variant's images → product images → first variant images
              const carouselImages = (() => {
                if (selectedArr.length > 0) {
                  const imgs = parseImageField(selectedArr[selectedArr.length - 1].variant.image_url).filter(u => !u.includes('placehold.co'))
                  if (imgs.length > 0) return imgs
                }
                const productImgs = parseImageField(product.image_urls).filter(u => !u.includes('placehold.co'))
                if (productImgs.length > 0) return productImgs
                // Fallback: use first available variant image
                return (product.variants || []).flatMap(v => parseImageField(v.image_url)).filter(u => !u.includes('placehold.co')).slice(0, 6)
              })()
              const safeIdx = Math.min(currentImageIndex, Math.max(0, carouselImages.length - 1))

              return (
                <div className="relative hidden sm:block aspect-square rounded-lg overflow-hidden bg-gray-100 select-none">
                  {carouselImages.length > 0 ? (
                    <>
                      <img
                        key={carouselImages[safeIdx]}
                        src={carouselImages[safeIdx]}
                        alt={product.name}
                        className="w-full h-full object-contain p-4"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      {carouselImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                            disabled={safeIdx === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm disabled:opacity-25 hover:bg-white transition-all z-10"
                          >
                            <ChevronLeft className="h-4 w-4 text-gray-700" />
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex(i => Math.min(carouselImages.length - 1, i + 1))}
                            disabled={safeIdx === carouselImages.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm disabled:opacity-25 hover:bg-white transition-all z-10"
                          >
                            <ChevronRight className="h-4 w-4 text-gray-700" />
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                            {carouselImages.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentImageIndex(i)}
                                className={`rounded-full transition-all ${
                                  i === safeIdx ? 'w-4 h-2 bg-luxury-navy' : 'w-2 h-2 bg-black/25 hover:bg-black/40'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-sm">No image</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Product Details */}
            <div className="flex flex-col">
              <div className="flex items-start gap-2 flex-wrap mb-2 pr-8 sm:pr-0">
                <h2 className="text-sm sm:text-base md:text-2xl font-montserrat font-bold text-gray-900 leading-tight break-words flex-1">{product.name}</h2>
                {(product as any).in_stock && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    In Stock
                  </span>
                )}
              </div>
              
              {/* Pre-order Shipping Info */}
              <div className="mb-3 flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 text-[#26AA99] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600">
                  {(() => {
                    const preOrderDays = (product as any).pre_order_duration_days || 30
                    const today = new Date()
                    const estimateStart = new Date(today)
                    estimateStart.setDate(today.getDate() + preOrderDays + 3)
                    const estimateEnd = new Date(today)
                    estimateEnd.setDate(today.getDate() + preOrderDays + 5)
                    const formatDate = (date: Date) => {
                      const day = date.getDate()
                      const month = t.products.months[date.getMonth()]
                      return `${day} ${month}`
                    }
                    return `${t.products.preOrder} (${t.products.shippedIn} ${preOrderDays} ${t.products.days}). ${t.products.estimatedArrival} ${formatDate(estimateStart)} - ${formatDate(estimateEnd)}`
                  })()}
                </p>
              </div>

              {/* Price */}
              {!hasVariants && (
              <div className="mb-4 md:mb-6">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {(voucher || (noVariantCampaign && noVariantCampaign.discounted_price < basePrice)) && (
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(basePrice * quantity, currencyCode)}
                    </span>
                  )}
                  <span className="text-2xl md:text-3xl font-bold text-luxury-navy">
                    {(() => {
                      const price = effectivePrice * (!hasVariants ? quantity : 1)
                      const voucherDiscount = voucher ? (
                        voucher.discount_type === 'percentage' 
                          ? (price * voucher.discount_value / 100)
                          : voucher.discount_value
                      ) : 0
                      return formatPrice(price - voucherDiscount, currencyCode)
                    })()}
                  </span>
                </div>
                {voucher && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                    <svg className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 10h1a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2Zm0 2a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2H9Zm12 5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-1a1.5 1.5 0 0 0 0-3v-1a1.5 1.5 0 0 0 0-3v-1A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v1a1.5 1.5 0 0 0 0 3v1a1.5 1.5 0 0 0 0 3v1ZM20 8.5h-1.5a1 1 0 0 1-1-1V7H4.5v.5a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v.5h15v-.5a1 1 0 0 1 1-1h.5v-1h-.5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h.5v-1Zm-2.5 4.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-12 3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/>
                    </svg>
                    <span className="text-xs font-medium text-orange-600">
                      {t.products.voucherDiscount} {voucher.discount_type === 'percentage' 
                        ? `${voucher.discount_value}%`
                        : `Rp${voucher.discount_value.toLocaleString('id-ID')}`
                      }
                    </span>
                  </div>
                )}
              </div>
              )}

              {/* Quantity Selector for products without variants */}
              {!hasVariants && mode !== 'wishlist' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.product.quantity}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                      disabled={quantity <= minQty}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-lg font-semibold min-w-[3rem] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      disabled={quantity >= maxQty}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Variant Selection */}
              {hasVariants && (
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-montserrat font-medium text-gray-700 mb-2">
                    {t.product.selectVariants}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {product.variants!.map((variant, index) => {
                      const isSelected = selectedVariants.has(variant.sku)
                      const selectedItem = selectedVariants.get(variant.sku)
                      return (
                        <div
                          key={index}
                          className={`rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-luxury-navy bg-luxury-navy/5'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          <button
                            onClick={() => handleVariantToggle(variant)}
                            disabled={variant.stock_quantity === 0}
                            className="w-full px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Variant Image Thumbnail */}
                              {(() => {
                                const thumbUrl = parseImageField(variant.image_url)[0]
                                return thumbUrl ? (
                                  <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                                    <img
                                      src={thumbUrl}
                                      alt={variant.name}
                                      className="w-full h-full object-contain p-1"
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                  </div>
                                ) : null
                              })()}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-montserrat font-medium text-gray-900">{variant.name}</span>
                                  {variant.stock_quantity === 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 leading-none">
                                      Sold Out
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <div className="font-bold text-luxury-navy">
                                  {(() => {
                                    const qty = isSelected && selectedItem ? selectedItem.quantity : 1
                                    const discountedPrice = getVariantPrice(variant) * qty
                                    const voucherDiscount = voucher ? (
                                      voucher.discount_type === 'percentage' 
                                        ? (discountedPrice * voucher.discount_value / 100)
                                        : voucher.discount_value
                                    ) : 0
                                    return formatPrice(discountedPrice - voucherDiscount, currencyCode)
                                  })()}
                                </div>
                                {/* Show original price strikethrough if discount, compare-at, or voucher exists */}
                                {(() => {
                                  const qty = isSelected && selectedItem ? selectedItem.quantity : 1
                                  const originalPrice = getVariantOriginalPrice(variant)
                                  const discountedPrice = getVariantPrice(variant)
                                  const hasDiscount = activeDiscounts?.get(variant.name) && discountedPrice < originalPrice
                                  const compareAt = isIDR ? variant.compare_at_price_idr : variant.compare_at_price_usd
                                  const hasCompareAt = compareAt && compareAt > originalPrice
                                  if (voucher) {
                                    return <div className="text-sm text-gray-400 line-through">{formatPrice(discountedPrice * qty, currencyCode)}</div>
                                  } else if (hasDiscount) {
                                    return <div className="text-sm text-gray-400 line-through">{formatPrice(originalPrice * qty, currencyCode)}</div>
                                  } else if (hasCompareAt) {
                                    return <div className="text-sm text-gray-400 line-through">{formatPrice(compareAt! * qty, currencyCode)}</div>
                                  }
                                  return null
                                })()}
                              </div>
                            </div>
                          </button>
                          {isSelected && selectedItem && mode !== 'wishlist' && (
                            <div className="px-4 pb-3 pt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">{t.product.quantity}:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleVariantQuantityChange(variant.sku, -1)}
                                    disabled={selectedItem.quantity <= (variant.min_purchase_quantity || product.min_purchase_quantity || 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="text-base font-semibold text-gray-900 min-w-[2rem] text-center">
                                    {selectedItem.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleVariantQuantityChange(variant.sku, 1)}
                                    disabled={(() => {
                                      const variantMaxQty = variant.max_purchase_quantity || product.max_purchase_quantity
                                      return selectedItem.quantity >= variant.stock_quantity ||
                                        (variantMaxQty !== null && variantMaxQty !== undefined && selectedItem.quantity >= variantMaxQty)
                                    })()}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}


              {/* Action Buttons */}
              <div className="space-y-3 mt-auto">
                {mode === 'wishlist' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && selectedVariants.size === 0)}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-montserrat font-semibold uppercase tracking-wider py-3 md:py-6 text-sm md:text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                        {t.common.loading}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {t.product.addToWishlist} {selectedVariants.size > 0 && `(${selectedVariants.size})`}
                      </span>
                    )}
                  </Button>
                ) : mode === 'buy-now' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && selectedVariants.size === 0)}
                    className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy font-montserrat font-semibold uppercase tracking-wider py-3 md:py-6 text-sm md:text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                        {t.common.loading}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Zap className="h-5 w-5" />
                        {(() => {
                          if (voucher) {
                            // Calculate total net amount for all selected variants
                            let totalNetAmount = 0
                            if (hasVariants && selectedVariants.size > 0) {
                              selectedVariants.forEach(({ variant, quantity }) => {
                                const variantPrice = isIDR ? variant.price_idr : variant.price_usd
                                const itemTotal = variantPrice * quantity
                                const voucherDiscount = voucher.discount_type === 'percentage'
                                  ? (itemTotal * voucher.discount_value / 100)
                                  : voucher.discount_value
                                totalNetAmount += itemTotal - voucherDiscount
                              })
                            } else {
                              const itemTotal = effectivePrice * quantity
                              const voucherDiscount = voucher.discount_type === 'percentage'
                                ? (itemTotal * voucher.discount_value / 100)
                                : voucher.discount_value
                              totalNetAmount = itemTotal - voucherDiscount
                            }
                            return `${t.product.buyNow} with Voucher ${formatPrice(totalNetAmount, currencyCode)}`
                          }
                          return `${t.product.buyNow} ${selectedVariants.size > 0 ? `(${selectedVariants.size} ${selectedVariants.size === 1 ? t.product.variant : t.product.variants})` : ''}`
                        })()}
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && selectedVariants.size === 0)}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-montserrat font-semibold uppercase tracking-wider py-3 md:py-6 text-sm md:text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                        {t.common.loading}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {t.product.addToCart} {selectedVariants.size > 0 && `(${selectedVariants.size})`}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
