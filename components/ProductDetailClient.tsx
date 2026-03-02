'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ProductDetailClientProps {
  productId: string
  productName: string
}

export function ProductDetailClient({ productId, productName }: ProductDetailClientProps) {
  const router = useRouter()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  const handleAddToCart = async () => {
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
          product_id: productId,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${productName} added to cart!`)
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

  const handleAddToWishlist = async () => {
    setIsAddingToWishlist(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login to add items to wishlist')
        router.push('/login')
        return
      }

      // Call the database function to add to wishlist
      const { error } = await supabase.rpc('add_to_wishlist', {
        p_user_id: session.user.id,
        p_product_id: productId,
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
      console.error('Add to wishlist error:', error)
      toast.error('Failed to add to wishlist')
    } finally {
      setIsAddingToWishlist(false)
    }
  }

  const handleBuyNow = async () => {
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

      // Add to cart
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Dispatch event to update cart badge
        window.dispatchEvent(new Event('cart-updated'))
        // Redirect to checkout immediately
        router.push('/checkout')
      } else {
        console.error('Cart API error:', data)
        toast.error(data.error || 'Failed to proceed to checkout')
      }
    } catch (error) {
      console.error('Buy now error:', error)
      toast.error('Failed to proceed to checkout')
    } finally {
      setIsBuyingNow(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button 
        className="w-full bg-[#EE4D2D] hover:bg-[#d43f1f] text-white font-medium py-3 text-base transition-all duration-300 border-0"
        size="lg" 
        onClick={handleBuyNow}
        disabled={isBuyingNow}
      >
        {isBuyingNow ? 'Processing...' : 'Buy Now'}
      </Button>
      <Button 
        variant="luxury" 
        size="lg" 
        className="w-full"
        onClick={handleAddToCart}
        disabled={isAddingToCart}
      >
        <ShoppingBag className="mr-2 h-5 w-5" />
        {isAddingToCart ? 'Adding...' : 'Add to Cart'}
      </Button>
      <Button 
        variant="outline" 
        size="lg" 
        className="w-full"
        onClick={handleAddToWishlist}
        disabled={isAddingToWishlist}
      >
        <Heart className="mr-2 h-5 w-5" />
        {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
      </Button>
    </div>
  )
}
