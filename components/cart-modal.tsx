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
  const [voucherDiscounts, setVoucherDiscounts] = useState<Map<string, number>>(new Map())
  const [activeDiscounts, setActiveDiscounts] = useState<Map<string, any>>(new Map())

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
          product:products(id, name, slug, image_urls, size, stock_quantity, price_usd, price_idr, min_purchase_quantity, max_purchase_quantity, variants)
        `)
        .eq('user_id', session.user.id)

      if (error) throw error

      setCartItems((data as any) || [])
      
      // Fetch active vouchers AND discounts for cart items in parallel
      if (data && data.length > 0) {
        const productIds = data.map((item: any) => item.product_id)
        const now = new Date().toISOString()
        const [vouchersResult, discountsResult] = await Promise.all([
          supabase
            .from('promo_codes')
            .select('discount_type, discount_value, scope, applicable_product_ids')
            .eq('is_active', true)
            .lte('valid_from', now)
            .gte('valid_until', now),
          supabase
            .from('discount_products')
            .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
            .eq('is_active', true)
            .eq('discounts.is_active', true)
            .lte('discounts.start_date', now)
            .gte('discounts.end_date', now)
            .in('product_id', productIds)
        ])

        if (discountsResult.data && discountsResult.data.length > 0) {
          const discMap = new Map<string, any>()
          discountsResult.data.forEach((d: any) => {
            const key = d.variant_id ? `${d.product_id}-${d.variant_id}` : d.product_id
            if (!discMap.has(key) || d.discounted_price < discMap.get(key).discounted_price) {
              discMap.set(key, d)
            }
          })
          setActiveDiscounts(discMap)
        }

        const activeVouchers = vouchersResult.data
        if (activeVouchers && activeVouchers.length > 0) {
          const discountMap = new Map<string, number>()
          data.forEach((item: any) => {
            const applicableVoucher = activeVouchers.find((v: any) =>
              v.scope === 'all' ||
              (v.scope === 'specific_products' && v.applicable_product_ids?.includes(item.product_id))
            )
            
            if (applicableVoucher) {
              const price = region?.code === 'ID' && item.product.price_idr 
                ? item.product.price_idr 
                : item.product.price_usd || 0
              const itemTotal = price * item.quantity
              
              const voucherDiscount = applicableVoucher.discount_type === 'percentage'
                ? (itemTotal * applicableVoucher.discount_value / 100)
                : applicableVoucher.discount_value
              
              discountMap.set(item.id, voucherDiscount)
            }
          })
          
          setVoucherDiscounts(discountMap)
        }
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    const item = cartItems.find(i => i.id === itemId)
    if (!item) return

    // Use variant-level min/max if available, otherwise fall back to product-level (mirrors ProductVariantModal)
    let effectiveStock = item.product.stock_quantity
    let variantMinQty = item.product.min_purchase_quantity || 1
    let variantMaxQty: number | null | undefined = item.product.max_purchase_quantity

    if (item.variant_sku && item.product.variants) {
      const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
      if (variant) {
        effectiveStock = variant.stock_quantity
        variantMinQty = variant.min_purchase_quantity || item.product.min_purchase_quantity || 1
        variantMaxQty = variant.max_purchase_quantity || item.product.max_purchase_quantity || variant.stock_quantity
      }
    }

    // Validate minimum quantity
    if (newQuantity < variantMinQty) {
      toast.error(`Minimum quantity is ${variantMinQty}`)
      return
    }

    // Validate maximum quantity
    if (variantMaxQty !== null && variantMaxQty !== undefined && newQuantity > variantMaxQty) {
      toast.error(`Maximum quantity is ${variantMaxQty}`)
      return
    }

    // Validate stock quantity
    if (newQuantity > effectiveStock) {
      toast.error(`Only ${effectiveStock} items available`)
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

  // Get discounted price for a cart item
  const getItemDiscountedPrice = (item: CartItem) => {
    const variantName = (item as any).variant_name
    if (variantName) {
      const variantKey = `${item.product_id}-${variantName}`
      const d = activeDiscounts.get(variantKey)
      if (d) return d.discounted_price
    }
    const d = activeDiscounts.get(item.product_id)
    return d ? d.discounted_price : null
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
    
    // Apply campaign discount if available
    const discounted = getItemDiscountedPrice(item)
    const itemTotal = (discounted !== null ? discounted : basePrice) * item.quantity
    return sum + itemTotal
  }, 0)
  
  // Calculate total voucher discount
  const totalVoucherDiscount = Array.from(voucherDiscounts.values()).reduce((sum, discount) => sum + discount, 0)
  
  const total = subtotal - totalVoucherDiscount - discountAmount

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
                      <div className="relative h-24 w-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {item.product.image_urls && item.product.image_urls.length > 0 && item.product.image_urls[0] ? (
                          isVideo(item.product.image_urls[0]) ? (
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
                          )
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
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
                              disabled={(() => {
                                let minQty = item.product.min_purchase_quantity || 1
                                if (item.variant_sku && item.product.variants) {
                                  const v = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                                  if (v) minQty = v.min_purchase_quantity || item.product.min_purchase_quantity || 1
                                }
                                return item.quantity <= minQty
                              })()}
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
                              disabled={(() => {
                                let stockQty = item.product.stock_quantity
                                let maxQty: number | null | undefined = item.product.max_purchase_quantity
                                if (item.variant_sku && item.product.variants) {
                                  const v = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                                  if (v) {
                                    stockQty = v.stock_quantity
                                    maxQty = v.max_purchase_quantity || item.product.max_purchase_quantity || null
                                  }
                                }
                                return item.quantity >= stockQty ||
                                  (maxQty !== null && maxQty !== undefined && item.quantity >= maxQty)
                              })()}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="flex flex-col items-end gap-1">
                            {region ? (() => {
                              let basePrice = 0
                              if (item.variant_sku && item.product.variants) {
                                const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                                if (variant) basePrice = region.code === 'ID' ? variant.price_idr : variant.price_usd
                              } else {
                                basePrice = region.code === 'ID' && (item.product as any).price_idr 
                                  ? (item.product as any).price_idr 
                                  : (item.product as any).price_usd || 0
                              }
                              const discounted = getItemDiscountedPrice(item)
                              const displayPrice = discounted !== null ? discounted : basePrice
                              const voucherDiscount = voucherDiscounts.get(item.id) || 0
                              return (
                                <>
                                  {discounted !== null && discounted < basePrice && (
                                    <span className="text-xs text-gray-400 line-through">
                                      {formatPrice(basePrice * item.quantity, region)}
                                    </span>
                                  )}
                                  <p className="text-sm font-medium text-black">
                                    {formatPrice((displayPrice * item.quantity) - voucherDiscount, region)}
                                  </p>
                                  {voucherDiscount > 0 && (
                                    <span className="text-[10px] text-orange-600 font-medium">
                                      Voucher: -{formatPrice(voucherDiscount, region)}
                                    </span>
                                  )}
                                </>
                              )
                            })() : '...'}
                          </div>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="mt-3 text-xs tracking-wide text-black/50 hover:text-black transition-colors text-left"
                        >
                          {t.cart.remove}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Section */}
            {cartItems.length > 0 && totalVoucherDiscount > 0 && (
              <div className="border-t border-black/5 px-8 py-6">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm tracking-wide font-light">{t.cart.discount}</span>
                  <span className="text-sm font-medium text-orange-600">
                    -{region ? formatPrice(totalVoucherDiscount, region) : '...'}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-black/5 px-8 py-8">
                <div className="mb-6 flex items-center justify-between text-sm tracking-wide">
                  <span className="font-light">{t.cart.subtotal}</span>
                  <span className="font-medium">{region ? formatPrice(total, region) : '...'}</span>
                </div>

                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="block w-full border border-black py-4 text-center text-xs tracking-[0.2em] font-medium uppercase transition-all duration-300 hover:bg-black hover:text-white"
                >
                  {t.cart.proceedToCheckout}
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
