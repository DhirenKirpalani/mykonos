'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Heart, MessageCircle } from 'lucide-react'
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
    price_idr?: number
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
    // Always show modal for confirmation (bottom sheet)
    if (!selectedVariants && productData) {
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
    // Always show modal for confirmation (bottom sheet)
    if (!selectedVariants && productData) {
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

      // Call the database function to add to wishlist with variant support
      const { error } = await supabase.rpc('add_to_wishlist', {
        p_user_id: session.user.id,
        p_product_id: productId,
        p_variant_name: selectedVariants?.variant_name || null,
        p_variant_sku: selectedVariants?.variant_sku || null,
        p_quantity: quantity,
      } as any)

      if (error) {
        console.error('Wishlist error:', error)
        if (error.message.includes('already exists')) {
          toast.info('This item is already in your wishlist')
        } else {
          toast.error(`Failed to add to wishlist: ${error.message}`)
        }
        throw error // Re-throw so ProductVariantModal knows it failed
      } else {
        // Show success toast
        const variantText = selectedVariants?.variant_name ? ` (${selectedVariants.variant_name})` : ''
        toast.success(`${productName}${variantText} added to wishlist!`)
        // Dispatch event to update wishlist badge
        window.dispatchEvent(new Event('wishlist-updated'))
      }
    } catch (error) {
      console.error('Wishlist catch error:', error)
      // Don't show toast here - already handled in if block above
      throw error // Re-throw for ProductVariantModal
    } finally {
      setIsAddingToWishlist(false)
    }
  }

  const handleBuyNow = async (productIdOverride?: string, quantity: number = 1, selectedVariants?: Record<string, string> | Array<{variant_name: string, variant_sku: string, quantity: number}>) => {
    // Always show modal for confirmation (bottom sheet)
    if (!selectedVariants && productData) {
      setVariantModalMode('buy-now')
      setShowVariantModal(true)
      return
    }
    
    // Check if this is a multi-variant array
    if (Array.isArray(selectedVariants)) {
      // Multi-variant Buy Now flow
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

        // Store multiple Buy Now items in sessionStorage
        const buyNowItems = selectedVariants.map(variant => ({
          product_id: productIdOverride || productId,
          product_name: productName,
          product_slug: productSlug,
          quantity: variant.quantity,
          variant_name: variant.variant_name,
          variant_sku: variant.variant_sku,
          timestamp: Date.now()
        }))
        
        sessionStorage.setItem('buyNowItems', JSON.stringify(buyNowItems))

        // Redirect to checkout immediately without adding to cart
        router.push('/checkout?buyNow=true')
      } catch (error) {
        console.error('Buy now error:', error)
        toast.error('Failed to proceed to checkout')
      } finally {
        setIsBuyingNow(false)
      }
      return
    }

    // Single variant/no variant flow
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

      // Store Buy Now items as array in sessionStorage (even for single item)
      const buyNowItems = [{
        product_id: productIdOverride || productId,
        product_name: productName,
        product_slug: productSlug,
        quantity: quantity,
        variant_name: (selectedVariants as any)?.variant_name,
        variant_sku: (selectedVariants as any)?.variant_sku,
        timestamp: Date.now()
      }]
      
      sessionStorage.setItem('buyNowItems', JSON.stringify(buyNowItems))

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
      {/* Desktop Buttons */}
      <div className="hidden md:flex flex-col gap-3">
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

    {/* Sticky Bottom Action Bar - Mobile Only */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="flex items-center gap-2 p-3">
        {/* Wishlist Icon */}
        <button 
          onClick={() => handleAddToWishlist()}
          disabled={isAddingToWishlist}
          className="flex items-center justify-center w-12 h-12 border border-gray-300 rounded disabled:opacity-50"
        >
          <Heart className="h-5 w-5 text-gray-600" />
        </button>
        
        {/* Divider */}
        <div className="h-12 w-px bg-gray-300" />
        
        {/* Cart Icon */}
        <button 
          onClick={() => handleAddToCart(undefined, quantity)}
          disabled={isAddingToCart}
          className="flex items-center justify-center w-12 h-12 border border-gray-300 rounded disabled:opacity-50"
        >
          <ShoppingBag className="h-5 w-5 text-gray-600" />
        </button>
        
        {/* Buy Now Button */}
        <button 
          onClick={() => handleBuyNow(undefined, quantity)}
          disabled={isBuyingNow}
          className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light text-white font-medium py-3 px-4 rounded disabled:opacity-50"
        >
          {isBuyingNow ? 'Processing...' : 'Buy Now'}
        </button>
      </div>
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
