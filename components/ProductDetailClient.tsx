'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ProductPriceDisplay } from '@/components/ProductPriceDisplay'
import { ProductVariantModal } from '@/components/ProductVariantModal'

interface ProductDetailClientProps {
  product?: any
  productId: string
  productName: string
  productSlug?: string
  minQuantity?: number
  maxQuantity?: number
  stockQuantity?: number
  price?: number
  priceIdr?: number
  salePrice?: number | null
  compareAtPrice?: number | null
  productData?: {
    id: string
    name: string
    image_urls: string[]
    price: number
    sale_price?: number | null
    stock_quantity: number
    min_purchase_quantity?: number | null
    max_purchase_quantity?: number | null
    variants?: any[]
  }
}

export function ProductDetailClient({ productId, productName, productSlug, minQuantity = 1, maxQuantity, stockQuantity = 0, price = 0, priceIdr, salePrice, compareAtPrice, productData, product }: ProductDetailClientProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(minQuantity)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [variantModalMode, setVariantModalMode] = useState<'add-to-cart' | 'buy-now' | 'wishlist'>('add-to-cart')

  // Restore quantity from sessionStorage if user navigates back from checkout
  useEffect(() => {
    const buyNowItem = sessionStorage.getItem('buyNowItem')
    if (buyNowItem) {
      try {
        const buyNowData = JSON.parse(buyNowItem)
        if (buyNowData.product_id === productId && buyNowData.quantity) {
          setQuantity(buyNowData.quantity)
        }
      } catch (error) {
        console.error('Failed to restore quantity:', error)
      }
    }
  }, [productId])

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < minQuantity) {
      setQuantity(minQuantity)
      toast.error(`Minimum quantity is ${minQuantity}`)
      return
    }
    if (maxQuantity && newQuantity > maxQuantity) {
      setQuantity(maxQuantity)
      toast.error(`Maximum quantity is ${maxQuantity}`)
      return
    }
    if (newQuantity > stockQuantity) {
      setQuantity(stockQuantity)
      toast.error(`Only ${stockQuantity} items available`)
      return
    }
    setQuantity(newQuantity)
  }

  const handleAddToCart = async (productIdOverride?: string, quantity: number = 1, selectedVariants?: Record<string, string>) => {
    // Check if product has variants and no variants selected
    if (!selectedVariants && productData?.variants && productData.variants.length > 0) {
      setVariantModalMode('add-to-cart')
      setShowVariantModal(true)
      return
    }

    setIsAddingToCart(true)
    
    try {
      // Get or create session (anonymous or authenticated)
      let { data: { session } } = await supabase.auth.getSession()
      
      // If no session, create anonymous session for guest
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Failed to create anonymous session:', error)
          toast.error('Unable to add to cart. Please refresh the page.')
          return
        }
        session = data.session
        
        // Store anonymous user_id in localStorage for persistence
        if (session?.user?.is_anonymous) {
          localStorage.setItem('anonymous_user_id', session.user.id)
        }
      } else if (session.user.is_anonymous) {
        // Store anonymous user_id for future use
        localStorage.setItem('anonymous_user_id', session.user.id)
      }

      if (!session?.access_token) {
        toast.error('Unable to add to cart. Please refresh the page.')
        return
      }

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          product_id: productIdOverride || productId,
          quantity: quantity || 1,
          variant_name: selectedVariants?.variant_name,
          variant_sku: selectedVariants?.variant_sku,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Dispatch event to update cart badge
        window.dispatchEvent(new Event('cart-updated'))
      } else {
        console.error('Cart API error:', data)
        toast.error(data.error || 'Failed to add to cart')
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      toast.error('Failed to add to cart')
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleAddToWishlist = async (selectedVariants?: Record<string, string>) => {
    // Check if product has variants and no variants selected
    if (!selectedVariants && productData?.variants && productData.variants.length > 0) {
      setVariantModalMode('wishlist')
      setShowVariantModal(true)
      return
    }

    setIsAddingToWishlist(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || session.user.is_anonymous) {
        toast.error('Please login to add items to wishlist')
        router.push('/login')
        return
      }

      // Call the database function to add to wishlist with quantity
      const { error } = await supabase.rpc('add_to_wishlist', {
        p_user_id: session.user.id,
        p_product_id: productId,
        p_quantity: quantity,
      } as any)

      if (error) {
        if (error.message.includes('already exists')) {
          toast.info('This item is already in your wishlist')
        } else {
          toast.error('Failed to add to wishlist')
        }
      } else {
        toast.success(`${productName} added to wishlist!`)
        // Dispatch event to update wishlist badge
        window.dispatchEvent(new Event('wishlist-updated'))
      }
    } catch (error) {
      toast.error('Failed to add to wishlist')
    } finally {
      setIsAddingToWishlist(false)
    }
  }

  const handleBuyNow = async (productIdOverride?: string, quantity: number = 1, selectedVariants?: Record<string, string>) => {
    // Validate quantity against min/max limits
    if (quantity < minQuantity) {
      toast.error(`Minimum quantity is ${minQuantity}`)
      return
    }
    
    if (maxQuantity && quantity > maxQuantity) {
      toast.error(`Maximum quantity is ${maxQuantity}`)
      return
    }
    
    if (quantity > stockQuantity) {
      toast.error(`Only ${stockQuantity} items available`)
      return
    }

    // Check if product has variants and no variants selected
    if (!selectedVariants && productData?.variants && productData.variants.length > 0) {
      setVariantModalMode('buy-now')
      setShowVariantModal(true)
      return
    }

    setIsBuyingNow(true)
    
    try {
      // Get or create session (anonymous or authenticated)
      let { data: { session } } = await supabase.auth.getSession()
      
      // If no session, create anonymous session for guest
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Failed to create anonymous session:', error)
          toast.error('Unable to proceed. Please refresh the page.')
          return
        }
        session = data.session
        
        // Store anonymous user_id in localStorage for persistence
        if (session?.user?.is_anonymous) {
          localStorage.setItem('anonymous_user_id', session.user.id)
        }
      } else if (session.user.is_anonymous) {
        // Store anonymous user_id for future use
        localStorage.setItem('anonymous_user_id', session.user.id)
      }

      if (!session?.access_token) {
        toast.error('Unable to proceed. Please refresh the page.')
        return
      }

      // Store Buy Now item in sessionStorage (skip cart)
      sessionStorage.setItem('buyNowItem', JSON.stringify({
        product_id: productIdOverride || productId,
        product_name: productName,
        product_slug: productSlug,
        quantity: quantity,
        variant_name: selectedVariants?.variant_name,
        variant_sku: selectedVariants?.variant_sku,
        timestamp: Date.now()
      }))

      // Redirect to checkout immediately without adding to cart
      router.push('/checkout?buyNow=true')
    } catch (error) {
      console.error('Buy now error:', error)
      toast.error('Failed to proceed to checkout')
    } finally {
      setIsBuyingNow(false)
    }
  }

  return (
    <>
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-700">Quantity:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= minQuantity}
            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || minQuantity)}
            min={minQuantity}
            max={maxQuantity || stockQuantity}
            className="w-16 rounded border border-gray-300 px-3 py-1.5 text-center text-sm focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={(maxQuantity && quantity >= maxQuantity) || quantity >= stockQuantity}
            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-500">
            {stockQuantity} available
          </span>
          {maxQuantity && (
            <span className="text-xs text-gray-400">
              Max {maxQuantity} per order
            </span>
          )}
        </div>
      </div>

      {/* Price Display with Quantity */}
      {product && (
        <div className="rounded-lg bg-gray-50 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {quantity} {quantity > 1 ? 'items' : 'item'}
            </span>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <ProductPriceDisplay 
            product={product}
            quantity={quantity}
            showRange={true}
          />
        </div>
      )}

      <Button 
        className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy font-medium py-3 text-base transition-all duration-300 border-0"
        size="lg" 
        onClick={() => handleBuyNow(undefined, quantity)}
        disabled={isBuyingNow}
      >
        {isBuyingNow ? 'Processing...' : 'Buy Now'}
      </Button>
      <Button 
        className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-medium py-3 text-base transition-all duration-300"
        size="lg" 
        onClick={() => handleAddToCart(undefined, quantity)}
        disabled={isAddingToCart}
      >
        <ShoppingBag className="mr-2 h-5 w-5" />
        {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
      </Button>
      <Button 
        variant="outline" 
        size="lg" 
        className="w-full"
        onClick={() => handleAddToWishlist()}
        disabled={isAddingToWishlist}
      >
        <Heart className="mr-2 h-5 w-5" />
        {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
      </Button>
    </div>

    {/* Variant Selection Modal */}
    {productData && (
      <ProductVariantModal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        product={productData}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onAddToWishlist={handleAddToWishlist}
        mode={variantModalMode}
      />
    )}
    </>
  )
}
