'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Minus, Plus, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRegion } from '@/contexts/RegionContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatPrice } from '@/lib/utils/region'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

type CartItem = {
  id: string
  product_id: string
  quantity: number
  price_at_add: number
  variant_name: string | null
  variant_sku: string | null
  product: {
    id: string
    name: string
    slug: string
    image_urls: string[]
    size: string
    stock_quantity: number
    min_purchase_quantity: number | null
    max_purchase_quantity: number | null
    variants?: any[]
  }
}

type CartModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const { region } = useRegion()
  const { t } = useLanguage()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
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
      fetchCart()
    }
  }, [isOpen])

  // Refetch cart when region changes
  useEffect(() => {
    if (isOpen && region) {
      fetchCart()
    }
  }, [region])

  const fetchCart = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setCartItems([])
        setLoading(false)
        return
      }

      setUserId(session.user.id)

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(id, name, slug, image_urls, size, stock_quantity, price_usd, price_idr, sale_price, min_purchase_quantity, max_purchase_quantity, variants)
        `)
        .eq('user_id', session.user.id)

      if (error) throw error

      setCartItems((data as any) || [])
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    const item = cartItems.find(i => i.id === itemId)
    if (!item) return

    const minQty = item.product.min_purchase_quantity || 1
    const maxQty = item.product.max_purchase_quantity || item.product.stock_quantity

    // Validate minimum quantity
    if (newQuantity < minQty) {
      toast.error(`Minimum quantity is ${minQty}`)
      return
    }

    // Validate maximum quantity
    if (maxQty && newQuantity > maxQty) {
      toast.error(`Maximum quantity is ${maxQty}`)
      return
    }

    // Validate stock quantity
    if (newQuantity > item.product.stock_quantity) {
      toast.error(`Only ${item.product.stock_quantity} items available`)
      return
    }

    try {
      console.log('🛒 [CART DRAWER] Updating quantity:', { itemId, newQuantity })
      const { error } = await (supabase
        .from('cart_items') as any)
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', itemId)

      if (error) throw error

      console.log('✅ [CART DRAWER] Database updated successfully')
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
      
      console.log('📢 [CART DRAWER] Dispatching cart-updated event...')
      window.dispatchEvent(new Event('cart-updated'))
      console.log('✅ [CART DRAWER] Event dispatched')
    } catch (error) {
      console.error('❌ [CART DRAWER] Failed to update quantity:', error)
      toast.error('Failed to update quantity')
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setCartItems(prev => prev.filter(item => item.id !== itemId))
      
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error('Failed to remove item')
    }
  }

  const applyDiscount = () => {
    if (discountCode.toLowerCase() === 'welcome10') {
      setDiscountApplied(true)
      setDiscountAmount(subtotal * 0.1)
    } else {
      toast.error('Invalid discount code')
    }
  }

  const subtotal = cartItems.reduce((sum, item) => {
    let basePrice = region?.code === 'ID' && (item.product as any).price_idr 
      ? (item.product as any).price_idr 
      : (item.product as any).price_usd || 0
    
    // If variant is selected, use variant price
    if (item.variant_sku && item.product.variants) {
      const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
      if (variant) {
        basePrice = region?.code === 'ID' ? variant.price_idr : variant.price_usd
      }
    }
    
    return sum + (basePrice * item.quantity)
  }, 0)
  const total = subtotal - discountAmount

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
                <ShoppingBag className="h-5 w-5 stroke-[1.5]" />
                {t.cart.title}
              </h2>
              <button
                onClick={onClose}
                className="text-black/70 hover:text-black transition-colors duration-300"
                aria-label="Close cart"
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
              ) : cartItems.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm tracking-wide text-black/60">
                  {t.cart.empty}
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {cartItems.map((item) => (
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
                            sizes="80px"
                            className="object-cover"
                          />
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-medium tracking-wide uppercase">
                            {item.variant_name || item.product.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Quantity */}
                          <div className="flex items-center border border-black/10">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-3 py-2 text-black/70 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Decrease quantity"
                              disabled={item.quantity <= (item.product.min_purchase_quantity || 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-4 text-sm tracking-wide">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-3 py-2 text-black/70 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Increase quantity"
                              disabled={
                                item.quantity >= item.product.stock_quantity ||
                                (item.product.max_purchase_quantity !== null && item.quantity >= item.product.max_purchase_quantity)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <p className="text-sm font-medium tracking-wide">
                            {region ? (() => {
                              let price = 0
                              // If variant is selected, find variant price
                              if (item.variant_sku && item.product.variants) {
                                const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                                if (variant) {
                                  price = region.code === 'ID' ? variant.price_idr : variant.price_usd
                                }
                              } else {
                                // Use product price
                                price = region.code === 'ID' && (item.product as any).price_idr 
                                  ? (item.product as any).price_idr 
                                  : (item.product as any).price_usd || 0
                              }
                              return formatPrice(price * item.quantity, region)
                            })() : '...'}
                          </p>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="mt-3 text-xs tracking-wide text-black/50 hover:text-black transition-colors text-left"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Section */}
            {cartItems.length > 0 && (
              <div className="border-t border-black/5 px-8 py-6">
                <button
                  onClick={() => setDiscountApplied(!discountApplied)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm tracking-wide font-light">Discount</span>
                  <span className="text-lg font-light">{discountApplied ? '−' : '+'}</span>
                </button>
                {discountApplied && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="flex-1 border border-black/10 bg-white px-4 py-2.5 text-sm tracking-wide placeholder:text-black/40 focus:border-black/30 focus:outline-none focus:ring-0"
                    />
                    <button
                      onClick={applyDiscount}
                      className="border border-black px-6 py-2.5 text-xs tracking-wider font-medium uppercase transition-all duration-300 hover:bg-black hover:text-white"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-black/5 px-8 py-8">
                <div className="mb-6 flex items-center justify-between text-sm tracking-wide">
                  <span className="font-light">Subtotal</span>
                  <span className="font-medium">{region ? formatPrice(total, region) : '...'}</span>
                </div>

                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="block w-full border border-black py-4 text-center text-xs tracking-[0.2em] font-medium uppercase transition-all duration-300 hover:bg-black hover:text-white"
                >
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
