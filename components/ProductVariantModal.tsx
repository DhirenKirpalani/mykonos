'use client'

import { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

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
    sale_price?: number | null
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
  onAddToCart: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  onBuyNow?: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  onAddToWishlist?: (selectedVariants?: Record<string, string>) => Promise<void>
  mode: 'add-to-cart' | 'buy-now' | 'wishlist'
}

export function ProductVariantModal({
  isOpen,
  onClose,
  product,
  voucher,
  onAddToCart,
  onBuyNow,
  onAddToWishlist,
  mode,
}: ProductVariantModalProps) {
  const { t } = useTranslation()
  const { region } = useRegion()
  const minQty = product.min_purchase_quantity || 1
  const maxQty = product.max_purchase_quantity || product.stock_quantity
  
  const [selectedVariants, setSelectedVariants] = useState<Map<string, { variant: ProductVariant, quantity: number }>>(new Map())
  const [quantity, setQuantity] = useState(minQty)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const currencyCode = region?.currency_code || 'USD'
  const isIDR = region?.code === 'ID'

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
  const effectivePrice = product.sale_price && product.sale_price < basePrice
    ? product.sale_price
    : basePrice

  // Calculate price range from variants
  const getPriceRange = () => {
    if (!hasVariants || !product.variants || product.variants.length === 0) {
      return null
    }
    const prices = product.variants.map(v => isIDR ? v.price_idr : v.price_usd)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return minPrice === maxPrice ? null : { min: minPrice, max: maxPrice }
  }

  const priceRange = getPriceRange()

  const handleVariantToggle = (variant: ProductVariant) => {
    setSelectedVariants(prev => {
      const newMap = new Map(prev)
      if (newMap.has(variant.sku)) {
        newMap.delete(variant.sku)
      } else {
        // Start with quantity 1
        newMap.set(variant.sku, { variant, quantity: 1 })
      }
      return newMap
    })
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
    if (hasVariants && selectedVariants.size === 0) {
      toast.error('Please select at least one variant')
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
          await onBuyNow?.(product.id, quantity, {} as any)
          // Don't close modal - let redirect happen
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
        await onBuyNow(product.id, 1, variantsData as any)
      } else {
        // For Add to Cart and Wishlist, process each variant separately
        let successCount = 0
        let failCount = 0
        
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
              await onAddToCart(product.id, quantity, variantData as any)
              successCount++
            }
          } catch (error) {
            console.error(`Failed to add variant ${variant.name}:`, error)
            failCount++
            // Continue to next variant instead of stopping
          }
        }
        
        // Show summary only for cart, not wishlist
        if (variantsArray.length > 1 && mode !== 'wishlist') {
          if (successCount > 0 && failCount === 0) {
            toast.success(`Added ${successCount} variant${successCount > 1 ? 's' : ''} to cart`)
          } else if (successCount > 0 && failCount > 0) {
            toast.info(`Added ${successCount} variant${successCount > 1 ? 's' : ''}, ${failCount} already existed`)
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
            {/* Product Image - hidden on very small screens to save space */}
            <div className="relative hidden xs:block sm:block aspect-square max-h-32 sm:max-h-40 md:max-h-none rounded-lg overflow-hidden bg-gray-100">
              {product.image_urls && product.image_urls[0] && (
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {product.sale_price && product.sale_price < product.price && (
                <span className="absolute top-3 left-3 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
                  Sale
                </span>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-base md:text-2xl font-bold text-gray-900 leading-snug">{product.name}</h2>
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
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
                      return `${day} ${months[date.getMonth()]}`
                    }
                    return `Pre-order (dikirim dalam ${preOrderDays} hari). Estimasi tiba ${formatDate(estimateStart)} - ${formatDate(estimateEnd)}`
                  })()}
                </p>
              </div>

              {/* Price */}
              <div className="mb-2 md:mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg md:text-3xl font-bold text-luxury-navy">
                    {(() => {
                      if (priceRange) {
                        const voucherDiscount = voucher ? (
                          voucher.discount_type === 'percentage' 
                            ? (priceRange.min * voucher.discount_value / 100)
                            : voucher.discount_value
                        ) : 0
                        return `${formatPrice(priceRange.min - voucherDiscount, currencyCode)} - ${formatPrice(priceRange.max - voucherDiscount, currencyCode)}`
                      } else {
                        const price = effectivePrice * (!hasVariants ? quantity : 1)
                        const voucherDiscount = voucher ? (
                          voucher.discount_type === 'percentage' 
                            ? (price * voucher.discount_value / 100)
                            : voucher.discount_value
                        ) : 0
                        return formatPrice(price - voucherDiscount, currencyCode)
                      }
                    })()}
                  </span>
                  {!priceRange && product.sale_price && product.sale_price < basePrice && !voucher && (
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(basePrice * (!hasVariants ? quantity : 1), currencyCode)}
                    </span>
                  )}
                </div>
                {voucher && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                    <svg className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 10h1a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2Zm0 2a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2H9Zm12 5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-1a1.5 1.5 0 0 0 0-3v-1a1.5 1.5 0 0 0 0-3v-1A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v1a1.5 1.5 0 0 0 0 3v1a1.5 1.5 0 0 0 0 3v1ZM20 8.5h-1.5a1 1 0 0 1-1-1V7H4.5v.5a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v.5h15v-.5a1 1 0 0 1 1-1h.5v-1h-.5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h.5v-1Zm-2.5 4.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-12 3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/>
                    </svg>
                    <span className="text-xs font-medium text-orange-600">
                      Voucher Diskon {voucher.discount_type === 'percentage' 
                        ? `${voucher.discount_value}%`
                        : `Rp${voucher.discount_value.toLocaleString('id-ID')}`
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Status */}
              {!hasVariants && (
                <div className="mb-4">
                  {product.stock_quantity > 0 ? (
                    <p className="text-sm text-green-600 font-medium">
                      {product.stock_quantity - quantity} remaining ({quantity} selected)
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">Out of stock</p>
                  )}
                </div>
              )}

              {/* Quantity Selector for products without variants */}
              {!hasVariants && mode !== 'wishlist' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('product.quantity')}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Variants
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
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{variant.name}</div>
                                <div className="text-sm text-gray-500">
                                  {isSelected && selectedItem 
                                    ? `${variant.stock_quantity - selectedItem.quantity} remaining (${selectedItem.quantity} selected)`
                                    : variant.stock_quantity > 0 
                                      ? `${variant.stock_quantity} in stock` 
                                      : 'Out of stock'
                                  }
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="font-semibold text-luxury-navy">
                                  {(() => {
                                    const variantPrice = (isIDR ? variant.price_idr : variant.price_usd) * (isSelected && selectedItem ? selectedItem.quantity : 1)
                                    const voucherDiscount = voucher ? (
                                      voucher.discount_type === 'percentage' 
                                        ? (variantPrice * voucher.discount_value / 100)
                                        : voucher.discount_value
                                    ) : 0
                                    return formatPrice(variantPrice - voucherDiscount, currencyCode)
                                  })()}
                                </div>
                                {!voucher && ((isIDR && variant.compare_at_price_idr && variant.compare_at_price_idr > variant.price_idr) ||
                                  (!isIDR && variant.compare_at_price_usd && variant.compare_at_price_usd > variant.price_usd)) && (
                                  <div className="text-sm text-gray-400 line-through">
                                    {formatPrice((isIDR ? variant.compare_at_price_idr : variant.compare_at_price_usd)! * (isSelected && selectedItem ? selectedItem.quantity : 1), currencyCode)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                          {isSelected && selectedItem && mode !== 'wishlist' && (
                            <div className="px-4 pb-3 pt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Quantity:</span>
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
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-medium py-3 md:py-6 text-sm md:text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Add to Wishlist {selectedVariants.size > 0 && `(${selectedVariants.size})`}
                      </span>
                    )}
                  </Button>
                ) : mode === 'buy-now' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && selectedVariants.size === 0)}
                    className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy font-medium py-3 md:py-6 text-sm md:text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Processing...
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
                            return `${t('product.buyNow')} with Voucher ${formatPrice(totalNetAmount, currencyCode)}`
                          }
                          return `${t('product.buyNow')} ${selectedVariants.size > 0 ? `(${selectedVariants.size} variants)` : ''}`
                        })()}
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && selectedVariants.size === 0)}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-medium py-3 md:py-6 text-sm md:text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Add to Cart {selectedVariants.size > 0 && `(${selectedVariants.size})`}
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
