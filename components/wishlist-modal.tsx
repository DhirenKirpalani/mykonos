'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Heart, ShoppingBag } from 'lucide-react'
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
          product:products(*)
        `)
        .eq('user_id', session.user.id)

      if (error) throw error

      setWishlistItems((data as any) || [])
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
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
      toast.success('Removed from wishlist')
      
      window.dispatchEvent(new Event('wishlist-updated'))
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error('Failed to remove item')
    }
  }

  const addToCart = async (productId: string, price: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login to add to cart')
        return
      }

      const { error } = await (supabase
        .from('cart_items') as any)
        .insert({
          user_id: session.user.id,
          product_id: productId,
          quantity: 1,
          price_at_add: price
        })

      if (error) throw error

      toast.success('Added to cart')
      window.dispatchEvent(new Event('cart-updated'))
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
                            {region ? formatPrice(item.product.price, region) : '...'}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => addToCart(item.product.id, item.product.price)}
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
