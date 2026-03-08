'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Heart, ShoppingBag, Minus, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils/region'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

type WishlistItem = {
  id: string
  product_id: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    image_urls: string[]
    size: string
    stock_quantity: number
  }
}

type WishlistModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function WishlistModal({ isOpen, onClose }: WishlistModalProps) {
  const { region } = useRegion()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const isVideo = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchWishlist()
    }
  }, [isOpen])

  // Refetch wishlist when region changes
  useEffect(() => {
    if (isOpen && region) {
      fetchWishlist()
    }
  }, [region])

  const fetchWishlist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setWishlistItems([])
        setLoading(false)
        return
      }

      setUserId(session.user.id)

      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          *,
          product:products(id, name, slug, image_urls, size, stock_quantity, price_usd, price_idr, sale_price)
        `)
        .eq('user_id', session.user.id)

      if (error) throw error

      const items = (data as any) || []
      setWishlistItems(items)
      
      // Initialize quantities from database
      const initialQuantities: Record<string, number> = {}
      items.forEach((item: WishlistItem) => {
        initialQuantities[item.id] = item.quantity || 1
      })
      setQuantities(initialQuantities)
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setWishlistItems(prev => prev.filter(item => item.id !== itemId))
      setQuantities(prev => {
        const newQuantities = { ...prev }
        delete newQuantities[itemId]
        return newQuantities
      })
      toast.success('Removed from wishlist')
      
      // Dispatch event to update wishlist counter
      window.dispatchEvent(new Event('wishlist-updated'))
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error('Failed to remove item')
    }
  }

  const updateQuantity = async (itemId: string, productId: string, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1) return
    if (newQuantity > maxStock) {
      toast.error(`Only ${maxStock} items available`)
      return
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      // Update quantity in database
      const { error } = await supabase.rpc('update_wishlist_quantity', {
        p_user_id: session.user.id,
        p_product_id: productId,
        p_quantity: newQuantity,
      } as any)
      
      if (error) {
        toast.error('Failed to update quantity')
        return
      }
      
      // Update local state
      setQuantities(prev => ({ ...prev, [itemId]: newQuantity }))
      setWishlistItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (error) {
      console.error('Failed to update quantity:', error)
      toast.error('Failed to update quantity')
    }
  }

  const addToCart = async (itemId: string, productId: string, price: number) => {
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

      const quantity = quantities[itemId] || 1

      // Use the cart API endpoint which handles all edge cases
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Added ${quantity} item(s) to cart`)
        window.dispatchEvent(new Event('cart-updated'))
      } else {
        console.error('Cart API error:', data)
        toast.error(data.error || 'Failed to add to cart')
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
      toast.error('Failed to add to cart')
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-[9999] h-full w-full max-w-md bg-white flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 px-8 py-7">
              <h2 className="flex items-center gap-3 text-xl tracking-wide font-light text-black">
                <Heart className="h-5 w-5 stroke-[1.5]" />
                Wishlist
              </h2>
              <button
                onClick={onClose}
                className="text-black/70 hover:text-black transition-colors duration-300"
                aria-label="Close wishlist"
              >
                <X className="h-5 w-5 stroke-[1.5]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm tracking-wide text-black/60">
                  Loading...
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm tracking-wide text-black/60">
                  Your wishlist is empty
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {wishlistItems.map((item) => (
                    <div key={item.id} className="flex gap-6 py-8">
                      <div className="relative h-24 w-20 flex-shrink-0">
                        {isVideo(item.product.image_urls[0]) ? (
                          <video
                            src={item.product.image_urls[0]}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            loop
                          />
                        ) : (
                          <Image
                            src={item.product.image_urls[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-medium tracking-wide uppercase">
                            {item.product.name}
                          </h3>
                          <p className="mt-1 text-xs tracking-wide text-black/60">
                            {item.product.size}
                          </p>
                          <p className="mt-2 text-sm font-medium tracking-wide">
                            {region ? formatPrice(
                              (region.code === 'ID' && (item.product as any).price_idr 
                                ? (item.product as any).price_idr 
                                : (item.product as any).price_usd || 0) * (quantities[item.id] || 1), 
                              region
                            ) : '...'}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {/* Quantity Selector */}
                          <div className="flex items-center border border-black/10">
                            <button
                              onClick={() => updateQuantity(item.id, item.product_id, (quantities[item.id] || 1) - 1, item.product.stock_quantity)}
                              className="px-3 py-2 text-black/70 hover:text-black transition-colors"
                              aria-label="Decrease quantity"
                              disabled={(quantities[item.id] || 1) <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-4 text-sm tracking-wide">
                              {quantities[item.id] || 1}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.product_id, (quantities[item.id] || 1) + 1, item.product.stock_quantity)}
                              className="px-3 py-2 text-black/70 hover:text-black transition-colors"
                              aria-label="Increase quantity"
                              disabled={(quantities[item.id] || 1) >= item.product.stock_quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => addToCart(
                              item.id,
                              item.product.id, 
                              region?.code === 'ID' && (item.product as any).price_idr 
                                ? (item.product as any).price_idr 
                                : (item.product as any).price_usd || 0
                            )}
                            className="flex items-center justify-center gap-2 border border-black px-4 py-2.5 text-xs tracking-wider font-medium uppercase transition-all duration-300 hover:bg-black hover:text-white w-full"
                            disabled={item.product.stock_quantity === 0}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {item.product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                          
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-xs tracking-wide text-black/50 hover:text-black transition-colors text-left w-full"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
