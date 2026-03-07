'use client'

import { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProductVariant {
  id: string
  name: string
  options: string[]
  stock?: number
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
  }
  onAddToCart: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  onBuyNow?: (productId: string, quantity: number, selectedVariants?: Record<string, string>) => Promise<void>
  mode: 'add-to-cart' | 'buy-now'
}

export function ProductVariantModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  onBuyNow,
  mode,
}: ProductVariantModalProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const hasVariants = product.variants && product.variants.length > 0
  const allVariantsSelected = hasVariants
    ? product.variants!.every((variant) => selectedVariants[variant.name])
    : true

  const effectivePrice = product.sale_price && product.sale_price < product.price
    ? product.sale_price
    : product.price

  const handleVariantSelect = (variantName: string, option: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: option,
    }))
  }

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && newQuantity <= product.stock_quantity) {
      setQuantity(newQuantity)
    }
  }

  const handleSubmit = async () => {
    if (hasVariants && !allVariantsSelected) {
      toast.error('Please select all variant options')
      return
    }

    if (quantity > product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} items available`)
      return
    }

    setIsProcessing(true)
    try {
      if (mode === 'buy-now' && onBuyNow) {
        await onBuyNow(product.id, quantity, hasVariants ? selectedVariants : undefined)
      } else {
        await onAddToCart(product.id, quantity, hasVariants ? selectedVariants : undefined)
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
                  ${effectivePrice.toFixed(2)}
                </span>
                {product.sale_price && product.sale_price < product.price && (
                  <span className="text-lg text-gray-400 line-through">
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {product.stock_quantity > 0 ? (
                  <p className="text-sm text-green-600 font-medium">
                    {product.stock_quantity} in stock
                  </p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">Out of stock</p>
                )}
              </div>

              {/* Variant Selection */}
              {hasVariants && (
                <div className="space-y-4 mb-6">
                  {product.variants!.map((variant) => (
                    <div key={variant.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {variant.name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleVariantSelect(variant.name, option)}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              selectedVariants[variant.name] === option
                                ? 'border-luxury-navy bg-luxury-navy text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-luxury-navy/50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
                    disabled={quantity <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xl font-semibold text-gray-900 min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock_quantity}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 hover:border-luxury-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-auto">
                {mode === 'buy-now' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || !allVariantsSelected || product.stock_quantity === 0}
                    className="w-full bg-[#EE4D2D] hover:bg-[#d43f1f] text-white font-medium py-6 text-base"
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
                    disabled={isProcessing || !allVariantsSelected || product.stock_quantity === 0}
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
