'use client'

import { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils'

interface ProductVariant {
  name: string
  sku: string
  price_usd: number
  price_idr: number
  stock_quantity: number
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
  }
  onAddToCart: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  onBuyNow?: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  onAddToWishlist?: (selectedVariants?: Record<string, string>) => Promise<void>
  mode: 'add-to-cart' | 'buy-now' | 'wishlist'
}

export function ProductVariantModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  onBuyNow,
  onAddToWishlist,
  mode,
}: ProductVariantModalProps) {
  const { region } = useRegion()
  const minQty = product.min_purchase_quantity || 1
  const maxQty = product.max_purchase_quantity || product.stock_quantity
  
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(minQty)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const currencyCode = region?.currency_code || 'USD'
  const isIDR = region?.code === 'ID'

  if (!isOpen) return null

  const hasVariants = product.variants && product.variants.length > 0

  const effectivePrice = product.sale_price && product.sale_price < product.price
    ? product.sale_price
    : product.price

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant)
    // Reset quantity if it exceeds the variant's stock
    if (quantity > variant.stock_quantity) {
      setQuantity(Math.min(minQty, variant.stock_quantity))
    }
  }

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    
    // Validate minimum quantity
    if (newQuantity < minQty) {
      toast.error(`Minimum quantity is ${minQty}`)
      return
    }
    
    // Validate maximum quantity
    if (product.max_purchase_quantity !== null && product.max_purchase_quantity !== undefined && newQuantity > product.max_purchase_quantity) {
      toast.error(`Maximum quantity is ${product.max_purchase_quantity}`)
      return
    }
    
    // Validate stock quantity
    const availableStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity
    if (newQuantity > availableStock) {
      toast.error(`Only ${availableStock} items available`)
      return
    }
    
    setQuantity(newQuantity)
  }

  const handleSubmit = async () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a variant')
      return
    }

    // Validate minimum quantity
    if (quantity < minQty) {
      toast.error(`Minimum quantity is ${minQty}`)
      return
    }

    // Validate maximum quantity
    if (product.max_purchase_quantity !== null && product.max_purchase_quantity !== undefined && quantity > product.max_purchase_quantity) {
      toast.error(`Maximum quantity is ${product.max_purchase_quantity}`)
      return
    }

    // Validate stock quantity
    const availableStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity
    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} items available`)
      return
    }

    setIsProcessing(true)
    try {
      const variantData = selectedVariant ? {
        variant_name: selectedVariant.name,
        variant_sku: selectedVariant.sku
      } : undefined
      
      if (mode === 'wishlist' && onAddToWishlist) {
        await onAddToWishlist(variantData as any)
      } else if (mode === 'buy-now' && onBuyNow) {
        await onBuyNow(product.id, quantity, variantData as any)
      } else {
        await onAddToCart(product.id, quantity, variantData as any)
      }
      onClose()
    } catch (error) {
      console.error('Error processing request:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Product Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
              
              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-luxury-navy">
                  {selectedVariant 
                    ? formatPrice(isIDR ? selectedVariant.price_idr : selectedVariant.price_usd, currencyCode)
                    : formatPrice(effectivePrice, currencyCode)
                  }
                </span>
                {!selectedVariant && product.sale_price && product.sale_price < product.price && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.price, currencyCode)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              {!hasVariants && (
                <div className="mb-6">
                  {product.stock_quantity > 0 ? (
                    <p className="text-sm text-green-600 font-medium">
                      {product.stock_quantity} in stock
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">Out of stock</p>
                  )}
                </div>
              )}

              {/* Variant Selection */}
              {hasVariants && (
                <div className="space-y-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Variant
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {product.variants!.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => handleVariantSelect(variant)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                          selectedVariant?.sku === variant.sku
                            ? 'border-luxury-navy bg-luxury-navy text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-luxury-navy/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{variant.name}</div>
                            <div className={`text-sm ${
                              selectedVariant?.sku === variant.sku ? 'text-white/80' : 'text-gray-500'
                            }`}>
                              {variant.stock_quantity > 0 ? `${variant.stock_quantity} in stock` : 'Out of stock'}
                            </div>
                          </div>
                          <div className={`font-semibold ${
                            selectedVariant?.sku === variant.sku ? 'text-white' : 'text-luxury-navy'
                          }`}>
                            {formatPrice(isIDR ? variant.price_idr : variant.price_usd, currencyCode)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= minQty}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xl font-semibold text-gray-900 min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={
                      quantity >= (selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity) ||
                      (product.max_purchase_quantity !== null && product.max_purchase_quantity !== undefined && quantity >= product.max_purchase_quantity)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-auto">
                {mode === 'wishlist' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && !selectedVariant) || (selectedVariant ? selectedVariant.stock_quantity === 0 : product.stock_quantity === 0)}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-medium py-6 text-base"
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
                        Add to Wishlist
                      </span>
                    )}
                  </Button>
                ) : mode === 'buy-now' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && !selectedVariant) || (selectedVariant ? selectedVariant.stock_quantity === 0 : product.stock_quantity === 0)}
                    className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy font-medium py-6 text-base"
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
                        Buy Now
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (hasVariants && !selectedVariant) || (selectedVariant ? selectedVariant.stock_quantity === 0 : product.stock_quantity === 0)}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-medium py-6 text-base"
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
                        Add to Cart
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
