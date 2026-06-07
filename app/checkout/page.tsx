'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useRegion } from '@/contexts/RegionContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PaymentMethods } from '@/components/PaymentMethods'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Lock, MapPin, CheckCircle2, ShoppingBag, ChevronDown, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckoutModal } from '@/components/CheckoutModal'
import dynamic from 'next/dynamic'
import { COUNTRIES } from '@/lib/constants'
import { getProvinces, getCities, hasRegionData } from '@/lib/constants/regions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getEffectivePrice } from '@/lib/utils/pricing'
import { getCountryName } from '@/lib/utils/country'

const MapPicker = dynamic(() => import('@/components/map/MapPicker').then(mod => ({ default: mod.MapPicker })), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">Loading map...</div>
})
import { useCurrency } from '@/hooks/useCurrency'
import { useAddressValidation } from '@/hooks/useAddressValidation'
import { formatPrice as formatCurrencyPrice } from '@/lib/utils/currency'
import { formatPrice as formatRegionPrice } from '@/lib/utils/region'
import { formatPrice } from '@/lib/utils'

type CartItem = {
  id: string
  product_id: string
  quantity: number
  variant_name?: string | null
  variant_sku?: string | null
  product: {
    name: string
    slug: string
    image_urls: string[]
    price_usd: number
    price_idr: number
    stock_quantity?: number
    min_purchase_quantity?: number | null
    max_purchase_quantity?: number | null
    variants?: any
  }
}

type Address = {
  id: string
  full_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state_province: string
  postal_code: string
  country: string
  phone: string
  is_default: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const { currency } = useCurrency()
  const { region } = useRegion()
  const { t } = useLanguage()
  const { validateAddress, isValidating, validationResult } = useAddressValidation()
  const wasAlreadySignedIn = useRef(false)
  const [userId, setUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [isBuyNow, setIsBuyNow] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [showEditMap, setShowEditMap] = useState(false)
  const [editSelectedProvince, setEditSelectedProvince] = useState('')
  const [editAvailableProvinces, setEditAvailableProvinces] = useState<{code: string, name: string}[]>([])
  const [editAvailableCities, setEditAvailableCities] = useState<string[]>([])
  const [shippingCost, setShippingCost] = useState<number | null>(null)
  const [isLoadingShipping, setIsLoadingShipping] = useState(false)
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([])
  const [quickAddedItems, setQuickAddedItems] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [discount, setDiscount] = useState(0)
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [vouchers, setVouchers] = useState<any[]>([])
  const [voucherDiscounts, setVoucherDiscounts] = useState<Map<string, number>>(new Map())
  const [activeDiscounts, setActiveDiscounts] = useState<Map<string, any>>(new Map())
  const [isRecommendedExpanded, setIsRecommendedExpanded] = useState(true)
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    is_default: false,
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  })

  useEffect(() => {
    // Clear reload flag if it exists
    sessionStorage.removeItem('checkout_reloading')
    
    // Load Midtrans Snap script
    const snapScript = document.createElement('script')
    snapScript.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    snapScript.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
    snapScript.async = true
    document.head.appendChild(snapScript)

    // Check if this is a Buy Now flow
    const urlParams = new URLSearchParams(window.location.search)
    const buyNowParam = urlParams.get('buyNow')
    setIsBuyNow(buyNowParam === 'true')
    
    // Check if user canceled Stripe payment
    const canceled = urlParams.get('canceled')
    if (canceled === 'true') {
      toast.info('Payment canceled. You can continue with your order or modify your cart.')
      // Remove the canceled parameter from URL
      window.history.replaceState({}, '', '/checkout')
    }
    
    initializeCheckout()
    checkForPendingOrder()

    // Handle browser back/forward button navigation (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      // If page is loaded from bfcache (browser back button), reinitialize
      if (event.persisted) {
        console.log('🔄 [CHECKOUT] Page loaded from bfcache, reinitializing...')
        setIsLoading(true)
        initializeCheckout()
      }
    }
    window.addEventListener('pageshow', handlePageShow)

    // Listen for cart updates only in cart flow (not buy now or order again flow)
    const handleCartUpdate = async () => {
      console.log('🔔 [CHECKOUT] Received cart-updated event')
      // Only refetch if we're in cart flow, not buy now or order again flow
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      const isOrderAgainFlow = urlParams.get('orderAgain') === 'true'
      
      console.log('🔍 [CHECKOUT] Is buy now flow?', isBuyNowFlow)
      console.log('🔍 [CHECKOUT] Is order again flow?', isOrderAgainFlow)
      
      if (!isBuyNowFlow && !isOrderAgainFlow) {
        console.log('🔄 [CHECKOUT] Refetching cart items...')
        // Small delay to ensure database has been updated
        await new Promise(resolve => setTimeout(resolve, 100))
        // Refetch cart items when cart is updated
        await initializeCheckout()
        console.log('✅ [CHECKOUT] Cart items refetched')
      } else {
        console.log('⚠️ [CHECKOUT] Skipping refetch (buy now or order again flow)')
      }
    }
    window.addEventListener('cart-updated', handleCartUpdate)
    console.log('👂 [CHECKOUT] Event listener registered for cart-updated')

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [CHECKOUT] Auth state changed:', event, session?.user?.id)
      
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        // Skip if user was already signed in (Supabase fires SIGNED_IN on session
        // refresh/desktop switch — not a real new login)
        if (wasAlreadySignedIn.current) return

        // Check if page is about to reload (flag set by CheckoutModal)
        const isReloading = sessionStorage.getItem('checkout_reloading')
        if (isReloading) {
          console.log('⏭️ [CHECKOUT] Skipping re-initialization, page is reloading...')
          return
        }
        
        console.log('✅ [CHECKOUT] User signed in, waiting for cart merge...')
        // Wait a bit for cart merge to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        // Refetch cart items after login
        const urlParams = new URLSearchParams(window.location.search)
        const isBuyNowFlow = urlParams.get('buyNow') === 'true'
        const isOrderAgainFlow = urlParams.get('orderAgain') === 'true'
        if (!isBuyNowFlow && !isOrderAgainFlow) {
          console.log('🔄 [CHECKOUT] Refetching cart after login...')
          await initializeCheckout()
        }
      }
    })

    return () => {
      // Cleanup script on unmount
      if (snapScript.parentNode) {
        snapScript.parentNode.removeChild(snapScript)
      }
      window.removeEventListener('cart-updated', handleCartUpdate)
      window.removeEventListener('pageshow', handlePageShow)
      subscription.unsubscribe()
    }
  }, [])

  const initializeCheckout = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      // Set user email and ID for address formatting
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
      if (session?.user?.id && !session.user.is_anonymous) {
        setUserId(session.user.id)
      }
      
      console.log('🔍 [CHECKOUT INIT] Session info:', {
        hasSession: !!session,
        userId: session?.user?.id,
        isAnonymous: session?.user?.is_anonymous
      })
      
      // Check if guest or logged-in user
      const guestUser = !session || session.user.is_anonymous === true
      setIsGuest(guestUser)
      if (!guestUser) wasAlreadySignedIn.current = true

      // Check for Buy Now items in sessionStorage
      const buyNowItemsStr = sessionStorage.getItem('buyNowItems')
      console.log('🔍 [CHECKOUT INIT] Buy now items in storage:', buyNowItemsStr ? 'YES' : 'NO')
      
      // Check for Order Again items in sessionStorage
      const orderAgainItemsStr = sessionStorage.getItem('orderAgainItems')
      console.log('🔍 [CHECKOUT INIT] Order again items in storage:', orderAgainItemsStr ? 'YES' : 'NO')
      
      // Check URL params to determine flow
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      const isOrderAgainFlow = urlParams.get('orderAgain') === 'true'
      console.log('🔍 [CHECKOUT INIT] Is buy now flow from URL?', isBuyNowFlow)
      console.log('🔍 [CHECKOUT INIT] Is order again flow from URL?', isOrderAgainFlow)
      
      // Clear buyNowItems if not in buy now flow to prevent interference
      if (buyNowItemsStr && !isBuyNowFlow) {
        console.log('⚠️ [CHECKOUT INIT] Clearing stale buyNowItems from sessionStorage')
        sessionStorage.removeItem('buyNowItems')
      }
      
      // Clear orderAgainItems if not in order again flow to prevent interference
      if (orderAgainItemsStr && !isOrderAgainFlow) {
        console.log('⚠️ [CHECKOUT INIT] Clearing stale orderAgainItems from sessionStorage')
        sessionStorage.removeItem('orderAgainItems')
      }
      
      if (orderAgainItemsStr && isOrderAgainFlow) {
        // Handle Order Again flow - fetch product details for multiple products
        console.log('🔄 [CHECKOUT INIT] Using ORDER AGAIN flow')
        const orderAgainItems = JSON.parse(orderAgainItemsStr)
        
        if (!Array.isArray(orderAgainItems) || orderAgainItems.length === 0) {
          toast.error('Invalid order data')
          sessionStorage.removeItem('orderAgainItems')
          router.push('/checkout')
          return
        }
        
        // Get unique product IDs from order items
        const productIds = Array.from(new Set(orderAgainItems.map((item: any) => item.product_id)))
        
        // Fetch all products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants')
          .in('id', productIds)

        if (productsError || !products || products.length === 0) {
          toast.error('Products not found')
          sessionStorage.removeItem('orderAgainItems')
          router.push('/checkout')
          return
        }

        // Create a map of products by ID for easy lookup
        const productMap = new Map(products.map((p: any) => [p.id, p]))

        // Create cart items structure for Order Again
        const orderAgainCartItems = orderAgainItems
          .map((item: any, index: number) => {
            const product = productMap.get(item.product_id)
            if (!product) return null

            return {
              id: `order-again-temp-${index}`,
              product_id: product.id,
              quantity: item.quantity,
              variant_name: item.variant_name || null,
              variant_sku: item.variant_sku || null,
              product: {
                name: product.name,
                slug: product.slug,
                image_urls: product.image_urls,
                price_usd: product.price_usd,
                price_idr: product.price_idr,
                stock_quantity: product.stock_quantity,
                variants: product.variants
              }
            }
          })
          .filter((item: any) => item !== null) as CartItem[]

        console.log('✅ [CHECKOUT INIT] Order again cart items created:', orderAgainCartItems.length)
        console.log('📦 [CHECKOUT INIT] Order again items:', orderAgainCartItems)
        setCartItems(orderAgainCartItems)
        setIsBuyNow(true) // Treat order again like buy now (don't refetch cart)
        
        // Fetch active vouchers AND discounts for order again items in parallel
        const orderAgainProductIds = orderAgainCartItems.map((item: any) => item.product_id)
        const orderNow = new Date().toISOString()
        const [orderVouchersResult, orderDiscountsResult] = await Promise.all([
          supabase
            .from('promo_codes')
            .select('discount_type, discount_value, scope, applicable_product_ids')
            .eq('is_active', true)
            .lte('valid_from', orderNow)
            .gte('valid_until', orderNow),
          supabase
            .from('discount_products')
            .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
            .eq('is_active', true)
            .eq('discounts.is_active', true)
            .lte('discounts.start_date', orderNow)
            .gte('discounts.end_date', orderNow)
            .in('product_id', orderAgainProductIds)
        ])

        if (orderDiscountsResult.data && orderDiscountsResult.data.length > 0) {
          const discMap = new Map<string, any>()
          orderDiscountsResult.data.forEach((d: any) => {
            const key = d.variant_id ? `${d.product_id}-${d.variant_id}` : d.product_id
            if (!discMap.has(key) || d.discounted_price < discMap.get(key).discounted_price) {
              discMap.set(key, d)
            }
          })
          setActiveDiscounts(discMap)
        }

        const activeVouchers = orderVouchersResult.data
        if (activeVouchers && activeVouchers.length > 0) {
          setVouchers(activeVouchers)
          
          // Calculate voucher discounts for each order again item
          const discountMap = new Map<string, number>()
          orderAgainCartItems.forEach((item: any) => {
            const applicableVoucher = activeVouchers.find((v: any) =>
              v.scope === 'all' ||
              (v.scope === 'specific_products' && v.applicable_product_ids?.includes(item.product_id))
            )
            
            if (applicableVoucher) {
              // Use variant price if a variant is selected, else fall back to product price
              let unitPrice = region?.code === 'ID' && item.product.price_idr 
                ? item.product.price_idr 
                : item.product.price_usd || 0
              if (item.variant_sku && item.product.variants) {
                const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                if (variant) unitPrice = region?.code === 'ID' ? (variant.price_idr || unitPrice) : (variant.price_usd || unitPrice)
              }
              const price = getEffectivePrice(unitPrice, null)
              const itemTotal = price * item.quantity
              
              const voucherDiscount = applicableVoucher.discount_type === 'percentage'
                ? (itemTotal * applicableVoucher.discount_value / 100)
                : applicableVoucher.discount_value
              
              discountMap.set(item.id, voucherDiscount)
            }
          })
          
          setVoucherDiscounts(discountMap)
        }
      } else if (buyNowItemsStr && isBuyNowFlow) {
        // Handle Buy Now flow - fetch product details
        console.log('🛍️ [CHECKOUT INIT] Using BUY NOW flow')
        const buyNowItems = JSON.parse(buyNowItemsStr)
        
        if (!Array.isArray(buyNowItems) || buyNowItems.length === 0) {
          toast.error('Invalid buy now data')
          sessionStorage.removeItem('buyNowItems')
          router.push('/checkout')
          return
        }
        
        // Get unique product ID (all items should be from same product)
        const productId = buyNowItems[0].product_id
        
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants, tax_enabled')
          .eq('id', productId)
          .single()

        if (productError || !product) {
          toast.error('Product not found')
          sessionStorage.removeItem('buyNowItems')
          router.push('/checkout')
          return
        }

        // Type assertion for product data
        const typedProduct = product as any

        // Create cart items structure for Buy Now (one item per variant)
        const buyNowCartItems = buyNowItems.map((item, index) => ({
          id: `buy-now-temp-${index}`,
          product_id: typedProduct.id,
          quantity: item.quantity,
          variant_name: item.variant_name || null,
          variant_sku: item.variant_sku || null,
          product: {
            name: typedProduct.name,
            slug: typedProduct.slug,
            image_urls: typedProduct.image_urls,
            price_usd: typedProduct.price_usd,
            price_idr: typedProduct.price_idr,
            stock_quantity: typedProduct.stock_quantity,
            min_purchase_quantity: typedProduct.min_purchase_quantity,
            max_purchase_quantity: typedProduct.max_purchase_quantity,
            variants: typedProduct.variants,
            tax_enabled: typedProduct.tax_enabled
          }
        }))

        setCartItems(buyNowCartItems)
        
        // Fetch active vouchers AND discounts for buy now items in parallel
        const buyNowNow = new Date().toISOString()
        const [buyNowVouchersResult, buyNowDiscountsResult] = await Promise.all([
          supabase
            .from('promo_codes')
            .select('discount_type, discount_value, scope, applicable_product_ids')
            .eq('is_active', true)
            .lte('valid_from', buyNowNow)
            .gte('valid_until', buyNowNow),
          supabase
            .from('discount_products')
            .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
            .eq('is_active', true)
            .eq('discounts.is_active', true)
            .lte('discounts.start_date', buyNowNow)
            .gte('discounts.end_date', buyNowNow)
            .eq('product_id', productId)
        ])

        if (buyNowDiscountsResult.data && buyNowDiscountsResult.data.length > 0) {
          const discMap = new Map<string, any>()
          buyNowDiscountsResult.data.forEach((d: any) => {
            const key = d.variant_id ? `${d.product_id}-${d.variant_id}` : d.product_id
            if (!discMap.has(key) || d.discounted_price < discMap.get(key).discounted_price) {
              discMap.set(key, d)
            }
          })
          setActiveDiscounts(discMap)
        }

        const activeVouchers = buyNowVouchersResult.data
        if (activeVouchers && activeVouchers.length > 0) {
          setVouchers(activeVouchers)
          
          // Calculate voucher discounts for each buy now item
          const discountMap = new Map<string, number>()
          buyNowCartItems.forEach((item: any) => {
            const applicableVoucher = activeVouchers.find((v: any) =>
              v.scope === 'all' ||
              (v.scope === 'specific_products' && v.applicable_product_ids?.includes(item.product_id))
            )
            
            if (applicableVoucher) {
              // Use variant price if a variant is selected, else fall back to product price
              let unitPrice = region?.code === 'ID' && item.product.price_idr 
                ? item.product.price_idr 
                : item.product.price_usd || 0
              if (item.variant_sku && item.product.variants) {
                const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                if (variant) unitPrice = region?.code === 'ID' ? (variant.price_idr || unitPrice) : (variant.price_usd || unitPrice)
              }
              const price = getEffectivePrice(unitPrice, null)
              const itemTotal = price * item.quantity
              
              const voucherDiscount = applicableVoucher.discount_type === 'percentage'
                ? (itemTotal * applicableVoucher.discount_value / 100)
                : applicableVoucher.discount_value
              
              discountMap.set(item.id, voucherDiscount)
            }
          })
          
          setVoucherDiscounts(discountMap)
        }
      } else {
        // Regular cart flow - fetch cart items
        console.log('🛒 [CHECKOUT INIT] Using CART flow')
        let cart: any[] = []
        let cartError: any = null

        if (session?.user) {
          // Use user_id for both anonymous and authenticated users (matches cart drawer)
          console.log('🔍 [CHECKOUT INIT] Querying cart with user_id:', session.user.id, '(anonymous:', session.user.is_anonymous, ')')
          console.log('🔍 [CHECKOUT INIT] About to execute cart query...')
          const { data, error } = await supabase
            .from('cart_items')
            .select(`
              *,
              product:products(name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants, tax_enabled)
            `)
            .eq('user_id', session.user.id)
          console.log('🔍 [CHECKOUT INIT] Cart query completed, processing results...')
          cart = data || []
          cartError = error
          console.log('🔍 [CHECKOUT INIT] Cart result:', { 
            itemCount: cart.length, 
            error: cartError,
            rawData: data,
            items: cart.map((item: any) => ({ 
              id: item.id, 
              product_id: item.product_id, 
              quantity: item.quantity,
              product_name: item.product?.name 
            }))
          })
        } else {
          console.log('⚠️ [CHECKOUT INIT] No session.user found')
        }

        if (cartError) {
          console.error('❌ [CHECKOUT INIT] Cart query error:', cartError)
          throw cartError
        }

        if (!cart || cart.length === 0) {
          console.log('⚠️ [CHECKOUT INIT] Cart is empty, showing empty state')
          setCartItems([])
        } else {
          console.log('✅ [CHECKOUT INIT] Setting cart items:', cart.length)
          setCartItems(cart as any)
          
          // Fetch active vouchers and discounts for cart items in parallel
          const productIds = cart.map((item: any) => item.product_id)
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
              .select(`
                product_id,
                variant_id,
                discounted_price,
                discounts!inner(
                  id,
                  start_date,
                  end_date,
                  is_active
                )
              `)
              .eq('is_active', true)
              .eq('discounts.is_active', true)
              .lte('discounts.start_date', now)
              .gte('discounts.end_date', now)
              .in('product_id', productIds)
          ])

          const activeVouchers = vouchersResult.data

          // Build activeDiscounts map: key = "productId-variantName" or "productId"
          if (discountsResult.data && discountsResult.data.length > 0) {
            const discountMap = new Map<string, any>()
            discountsResult.data.forEach((d: any) => {
              const key = d.variant_id ? `${d.product_id}-${d.variant_id}` : d.product_id
              // Keep lower price if multiple discounts for same key
              if (!discountMap.has(key) || d.discounted_price < discountMap.get(key).discounted_price) {
                discountMap.set(key, d)
              }
            })
            setActiveDiscounts(discountMap)
          }
          
          if (activeVouchers && activeVouchers.length > 0) {
            setVouchers(activeVouchers)
            
            // Calculate voucher discounts for each cart item
            const discountMap = new Map<string, number>()
            cart.forEach((item: any) => {
              const applicableVoucher = activeVouchers.find((v: any) =>
                v.scope === 'all' ||
                (v.scope === 'specific_products' && v.applicable_product_ids?.includes(item.product_id))
              )
              
              if (applicableVoucher) {
                // Use variant price if a variant is selected, else fall back to product price
                let unitPrice = region?.code === 'ID' && item.product.price_idr 
                  ? item.product.price_idr 
                  : item.product.price_usd || 0
                if (item.variant_sku && item.product.variants) {
                  const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
                  if (variant) unitPrice = region?.code === 'ID' ? (variant.price_idr || unitPrice) : (variant.price_usd || unitPrice)
                }
                const price = getEffectivePrice(unitPrice, null)
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
      }

      // Fetch addresses only for logged-in users
      if (session && !session.user.is_anonymous) {
        const { data: addressData, error: addressError } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('is_default', { ascending: false })

        if (addressError) throw addressError

        const addresses = (addressData as Address[]) || []
        setSavedAddresses(addresses)
        
        // Select default address
        const defaultAddress = addresses.find((a: Address) => a.is_default)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
        } else if (addresses.length > 0) {
          setSelectedAddressId(addresses[0].id)
        }
      }

      // Fetch recommended products for quick add
      fetchRecommendedProducts()

      setIsLoading(false)
    } catch (error: any) {
      console.error('Failed to initialize checkout:', error)
      toast.error('Failed to load checkout')
      setIsLoading(false)
    }
  }

  const fetchRecommendedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity')
        .gt('stock_quantity', 0)
        .limit(3)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecommendedProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch recommended products:', error)
    }
  }

  const handleQuickAdd = async (productId: string) => {
    try {
      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity')
        .eq('id', productId)
        .single()

      if (productError || !product) {
        toast.error('Product not found')
        return
      }

      // Type assertion for product data
      const typedProduct = product as {
        id: string
        name: string
        slug: string
        image_urls: string[]
        price_usd: number
        price_idr: number
      }

      // Check if already added to quick items
      const existingIndex = quickAddedItems.findIndex(item => item.product_id === productId)
      
      if (existingIndex >= 0) {
        // Increase quantity
        const updatedItems = [...quickAddedItems]
        updatedItems[existingIndex].quantity += 1
        setQuickAddedItems(updatedItems)
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `quick-${productId}`,
          product_id: productId,
          quantity: 1,
          product: {
            name: typedProduct.name,
            slug: typedProduct.slug,
            image_urls: typedProduct.image_urls,
            price_usd: typedProduct.price_usd,
            price_idr: typedProduct.price_idr,
          }
        }
        setQuickAddedItems([...quickAddedItems, newItem])
      }
    } catch (error) {
      console.error('Quick add error:', error)
      toast.error('Failed to add product')
    }
  }

  const removeQuickItem = (productId: string) => {
    setQuickAddedItems(quickAddedItems.filter(item => item.product_id !== productId))
  }

  const updateQuickItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeQuickItem(productId)
      return
    }
    
    setQuickAddedItems(quickAddedItems.map(item => 
      item.product_id === productId ? { ...item, quantity: newQuantity } : item
    ))
  }

  const checkForPendingOrder = async () => {
    // DISABLED: This was causing the checkout button to show "Continue Payment"
    // even when the user is trying to checkout with a different product.
    // Users should explicitly navigate to their order details page and click
    // "Continue Payment" there if they want to resume a pending order.
    
    console.log('⚠️ [CHECKOUT] Pending order check disabled - always showing "Place Order"')
    return
    
    /* Original code commented out:
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user.is_anonymous ? null : session.user.id
      const sessionId = session.user.is_anonymous ? session.user.id : null

      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id, order_number, snap_token, snap_redirect_url, expiry_time, payment_status, total_amount')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)

      if (userId) {
        await supabase
          .from('orders')
          .select('id, order_number, snap_token, snap_redirect_url, expiry_time, payment_status, total_amount')
          .eq('user_id', userId)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              const order = data[0] as any
              if (!order.expiry_time || new Date(order.expiry_time) > new Date()) {
                setPendingOrder(order)
                console.log('✅ [CHECKOUT] Found pending order:', order.order_number)
              }
            }
          })
      } else if (sessionId) {
        await supabase
          .from('orders')
          .select('id, order_number, snap_token, snap_redirect_url, expiry_time, payment_status, total_amount')
          .eq('session_id', sessionId)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              const order = data[0] as any
              if (!order.expiry_time || new Date(order.expiry_time) > new Date()) {
                setPendingOrder(order)
                console.log('✅ [CHECKOUT] Found pending order:', order.order_number)
              }
            }
          })
      }
    } catch (error) {
      console.error('Error checking for pending order:', error)
    }
    */
  }

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code')
      return
    }

    setIsApplyingPromo(true)
    try {
      const allItems = [...cartItems, ...quickAddedItems]
      const itemsSubtotal = allItems.reduce((total, item) => {
        const basePrice = region?.code === 'ID' && (item.product as any).price_idr 
          ? (item.product as any).price_idr 
          : (item.product as any).price_usd || 0
        const price = getEffectivePrice(basePrice, null)
        return total + (price * item.quantity)
      }, 0)

      // Collect unique product IDs from cart for scope validation
      const productIds = Array.from(new Set(allItems.map(item => item.product_id)))

      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.trim().toUpperCase(),
          region_id: region?.id,
          cart_total: itemsSubtotal,
          shipping_cost: shipping || 0,
          product_ids: productIds,
        }),
      })

      const typedData = await response.json()

      if (typedData && typedData.is_valid) {
        setAppliedPromo(typedData)
        setDiscount(typedData.discount_amount || 0)
        toast.success('Promo code applied!')
      } else {
        toast.error(typedData?.error_message || 'Invalid promo code')
      }
    } catch (error: any) {
      console.error('Failed to apply promo code:', error)
      toast.error('Failed to apply promo code')
    } finally {
      setIsApplyingPromo(false)
    }
  }

  const removePromoCode = () => {
    setAppliedPromo(null)
    setDiscount(0)
    setPromoCode('')
    toast.success('Promo code removed')
  }

  const handlePlaceOrder = async () => {
    console.log('🚀 [ORDER] handlePlaceOrder called')
    
    // Validate cart quantities before proceeding
    if (!validateCartQuantities()) {
      return
    }
    
    // For guests, show modal to collect email and shipping info
    if (isGuest) {
      console.log('👤 [ORDER] Guest user detected, showing checkout modal')
      setShowCheckoutModal(true)
      return
    }

    // For logged-in users, check if address is selected
    if (!selectedAddressId) {
      console.error('❌ [ORDER] No shipping address selected')
      toast.error('Please select a shipping address')
      return
    }

    console.log('✅ [ORDER] Starting order placement for authenticated user')
    console.log('📦 [ORDER] Cart items:', cartItems.length)
    console.log('📍 [ORDER] Selected address ID:', selectedAddressId)
    
    setIsProcessing(true)
    try {
      // Get current user session
      console.log('🔐 [ORDER] Getting user session...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('❌ [ORDER] No session found')
        toast.error('Please refresh the page')
        setIsProcessing(false)
        return
      }
      console.log('✅ [ORDER] Session found, user ID:', session.user.id)

      // Check if this is a Buy Now or Order Again flow with items still in sessionStorage
      const buyNowItemsStr = sessionStorage.getItem('buyNowItems')
      const orderAgainItemsStr = sessionStorage.getItem('orderAgainItems')
      console.log('🛒 [ORDER] Buy Now items in storage:', buyNowItemsStr ? 'Yes' : 'No')
      console.log('🔄 [ORDER] Order Again items in storage:', orderAgainItemsStr ? 'Yes' : 'No')
      
      let sessionData
      
      // Only use manual session if buyNowItems/orderAgainItems exists AND we have temp cart items
      // After login, these items are cleared and items are in cart, so use regular flow
      const isBuyNowFlow = buyNowItemsStr && cartItems.length > 0 && cartItems[0].id?.startsWith('buy-now-temp')
      const isOrderAgainFlow = orderAgainItemsStr && cartItems.length > 0 && cartItems[0].id?.startsWith('order-again-temp')
      
      if (isBuyNowFlow || isOrderAgainFlow) {
        console.log(`🎯 [ORDER] Using ${isBuyNowFlow ? 'Buy Now' : 'Order Again'} flow with manual cart snapshot`)
        // For Buy Now/Order Again: Create checkout session with manual cart snapshot
        
        // Build cart snapshot from cart items in state
        let subtotal = 0
        let voucherDiscountTotal = 0
        const cartSnapshot = cartItems.map((item, index) => {
          const product = item.product
          if (!product) {
            throw new Error('Product not found')
          }
          
          // Get variant-specific price if variant exists
          let basePrice = region?.code === 'ID' && (product as any).price_idr 
            ? (product as any).price_idr 
            : (product as any).price_usd || 0
          
          // If this item has a variant, find the variant price
          const itemWithVariant = item as any
          if (itemWithVariant.variant_sku && (product as any).variants) {
            const variant = (product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) {
              basePrice = region?.code === 'ID' ? variant.price_idr : variant.price_usd
            }
          }
          
          // Apply campaign discount first, then fall back to sale price
          const campaignDiscounted = getDiscountedPrice(product, item.product_id, itemWithVariant.variant_name)
          const price = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          const quantity = item.quantity || 1
          const itemTotal = price * quantity
          
          // Add voucher discount
          const itemVoucherDiscount = voucherDiscounts.get(item.id) || 0
          voucherDiscountTotal += itemVoucherDiscount
          
          subtotal += itemTotal - itemVoucherDiscount
          
          return {
            product_id: item.product_id,
            quantity: quantity,
            price: price - (itemVoucherDiscount / quantity), // Net price per unit
            variant_name: itemWithVariant.variant_name,
            variant_sku: itemWithVariant.variant_sku,
            tax_enabled: (product as any).tax_enabled || false
          }
        })
        
        console.log('📝 [ORDER] Creating manual checkout session...')
        console.log('📦 [BUY NOW] Cart snapshot:', cartSnapshot)
        
        // Calculate tax only for taxable items in manual checkout
        const manualTaxableAmount = cartSnapshot.reduce((total: number, item: any) => {
          console.log(`🔍 [BUY NOW] Tax check for product ${item.product_id}:`, {
            tax_enabled: item.tax_enabled,
            price: item.price,
            quantity: item.quantity
          })
          if (item.tax_enabled) {
            const itemAmount = item.price * item.quantity
            console.log(`  ✅ [BUY NOW] Adding to taxable amount: ${itemAmount}`)
            return total + itemAmount
          }
          console.log(`  ❌ [BUY NOW] Tax disabled, skipping`)
          return total
        }, 0)
        const manualTax = manualTaxableAmount * 0.1
        console.log(`💰 [BUY NOW] Taxable amount: ${manualTaxableAmount}, Tax (10%): ${manualTax}`)
        const manualShipping = shippingCost ?? 0

        const sessionResponse = await fetch('/api/checkout/session/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.user.id,
            cart_snapshot: cartSnapshot,
            pricing_snapshot: {
              subtotal: subtotal + voucherDiscountTotal, // Original subtotal before discount
              discount: voucherDiscountTotal,
              shipping: manualShipping,
              tax: manualTax,
              total: subtotal - voucherDiscountTotal + manualShipping + manualTax,
              currency_code: region?.currency_code || 'USD'
            }
          }),
        })
        
        sessionData = await sessionResponse.json()
        console.log('📋 [ORDER] Manual session response:', sessionData)
        if (!sessionResponse.ok) {
          console.error('❌ [ORDER] Failed to create manual checkout session:', sessionData.error)
          throw new Error(sessionData.error || 'Failed to create checkout session')
        }
        console.log('✅ [ORDER] Manual checkout session created:', sessionData.session_id)
      } else {
        // Regular cart flow: Create checkout session from cart
        // This includes Buy Now items that have been transferred to cart after login
        console.log('🛍️ [ORDER] Using regular cart flow')
        console.log('📝 [ORDER] Creating checkout session from cart...')
        
        // Calculate total voucher discount
        const totalVoucherDiscount = Array.from(voucherDiscounts.values()).reduce((sum, discount) => sum + discount, 0)

        // Build item discounts to pass to API (so cart_snapshot stores discounted prices)
        const itemDiscountsForSession = cartItems
          .map(item => {
            const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
            return discounted !== null ? {
              product_id: item.product_id,
              variant_name: (item as any).variant_name || null,
              discounted_price: discounted
            } : null
          })
          .filter(Boolean)
        
        // Calculate exchange rate for non-USD currencies
        let exchangeRate = null
        if (region?.currency_code && region.currency_code !== 'USD') {
          // Fetch current exchange rate
          try {
            const ratesResponse = await fetch('/api/exchange-rates')
            if (ratesResponse.ok) {
              const rates = await ratesResponse.json()
              if (rates[region.currency_code]) {
                // Store the rate from USD to local currency (e.g., 1 USD = 36 THB)
                // But we want to store the reverse (1 THB = X USD) for historical accuracy
                exchangeRate = 1 / rates[region.currency_code]
              }
            }
          } catch (error) {
            console.error('Failed to fetch exchange rates:', error)
          }
        }

        const sessionResponse = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.user.id,
            currency_code: region?.currency_code,
            region_code: region?.code,
            voucher_discount: totalVoucherDiscount,
            item_discounts: itemDiscountsForSession,
            tax,
            exchange_rate: exchangeRate,
            shipping: shippingCost ?? 0,
          }),
        })

        sessionData = await sessionResponse.json()
        console.log('📋 [ORDER] Session response:', sessionData)
        if (!sessionResponse.ok) {
          console.error('❌ [ORDER] Failed to create checkout session:', sessionData.error)
          throw new Error(sessionData.error || 'Failed to create checkout session')
        }
        console.log('✅ [ORDER] Checkout session created:', sessionData.session_id)
      }

      // Update with shipping address
      console.log('📦 [ORDER] Updating session with shipping address...')
      const updateResponse = await fetch('/api/checkout/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          customer_email: session.user.email,
          shipping_address_id: selectedAddressId,
          current_step: 1,
        }),
      })

      if (!updateResponse.ok) {
        const updateData = await updateResponse.json()
        console.error('❌ [ORDER] Failed to update shipping info:', updateData.error)
        throw new Error(updateData.error || 'Failed to update shipping info')
      }
      console.log('✅ [ORDER] Session updated with shipping address')

      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)
      if (!selectedAddress) {
        throw new Error('Shipping address not found')
      }

      // Check region for payment gateway routing
      const isIDRegion = region?.code === 'ID'

      // Convert to IDR (prices already in IDR for ID region)
      const USD_TO_IDR = 15000 // Approximate exchange rate
      const convertToIDR = (amount: number) => {
        // If already in IDR region, just round to whole number
        if (isIDRegion) {
          return Math.round(amount)
        }
        // Otherwise convert USD to IDR
        return Math.round(amount * USD_TO_IDR)
      }

      // Build items array including shipping and tax
      const itemsForMidtrans = [
        ...cartItems.map(item => {
          // Get variant-specific price if variant exists
          const itemWithVariant = item as any
          let basePrice = region?.code === 'ID' && (item.product as any).price_idr 
            ? (item.product as any).price_idr 
            : (item.product as any).price_usd || 0
          
          // If this item has a variant, find the variant price
          if (itemWithVariant.variant_sku && (item.product as any).variants) {
            const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) {
              basePrice = region?.code === 'ID' ? variant.price_idr : variant.price_usd
            }
          }
          
          // Use only variant name if available, otherwise product name
          const itemName = itemWithVariant.variant_name || item.product.name
          
          // Apply campaign discount first, then sale price, then voucher
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const effectivePrice = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          const voucherDiscount = voucherDiscounts.get(item.id) || 0
          // Voucher discount is total for all units, so divide by quantity to get per-unit price
          const totalItemPrice = effectivePrice * item.quantity
          const netPricePerUnit = (totalItemPrice - voucherDiscount) / item.quantity
          
          return {
            id: item.product_id,
            name: itemName,
            price: convertToIDR(netPricePerUnit),
            quantity: item.quantity,
          }
        }),
        // Add shipping as a line item
        {
          id: 'shipping',
          name: 'Shipping Fee',
          price: convertToIDR(shipping),
          quantity: 1,
        },
        // Add tax as a line item only if tax > 0
        ...(tax > 0 ? [{
          id: 'tax',
          name: 'Tax (10%)',
          price: convertToIDR(tax),
          quantity: 1,
        }] : [])
      ]

      // ⭐ CRITICAL: Save shipping address to checkout session BEFORE creating order
      console.log('📍 [CHECKOUT] Saving shipping address to checkout session...')
      try {
        await fetch('/api/checkout/session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionData.session_id,
            shipping_address: {
              full_name: selectedAddress.full_name,
              phone: selectedAddress.phone,
              address_line1: selectedAddress.address_line1,
              address_line2: selectedAddress.address_line2 || '',
              city: selectedAddress.city,
              state_province: selectedAddress.state_province,
              postal_code: selectedAddress.postal_code,
              country: selectedAddress.country,
            }
          })
        })
        console.log('✅ [CHECKOUT] Shipping address saved to checkout session')
      } catch (error) {
        console.error('❌ [CHECKOUT] Failed to save shipping address:', error)
        throw new Error('Failed to save shipping address')
      }

      // ⭐ STEP 1: Create order FIRST (before token generation)
      console.log('📝 [ORDER] Creating order before payment...')
      const initialOrderResponse = await fetch('/api/orders/create-before-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_session_id: sessionData.session_id,
          snap_token: null, // Will be set after token generation
          snap_redirect_url: null,
          user_id: session.user.id,
        }),
      })

      const orderData = await initialOrderResponse.json()
      if (!initialOrderResponse.ok) {
        console.error('❌ [ORDER] Failed to create order:', orderData.error)
        throw new Error(orderData.error || 'Failed to create order')
      }
      console.log('✅ [ORDER] Order created:', orderData.order_number)
      // Immediately reset cart badge
      window.dispatchEvent(new Event('cart-updated'))
      
      // For non-ID regions, redirect to Stripe checkout
      if (!isIDRegion) {
        console.log('💳 [STRIPE] Creating Stripe checkout session for non-ID region...')
        
        // Compute Stripe line items ensuring they sum exactly to checkout total
        const rawStripeItems = cartItems.map(item => {
          const itemWithVariant = item as any
          let basePrice = (item.product as any).price_usd || 0
          
          if (itemWithVariant.variant_sku && (item.product as any).variants) {
            const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) {
              basePrice = variant.price_usd
            }
          }
          
          const discounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const price = discounted !== null ? discounted : basePrice
          const rawVoucherDiscount = voucherDiscounts.get(item.id) || 0
          const netPrice = price - (rawVoucherDiscount / item.quantity)
          
          return {
            name: itemWithVariant.variant_name ? `${item.product.name} - ${itemWithVariant.variant_name}` : item.product.name,
            netPrice,
            quantity: item.quantity,
            variant_name: itemWithVariant.variant_name,
            image_url: item.product.image_urls?.[0],
          }
        })

        // Round each item price
        const roundedItems = rawStripeItems.map(item => ({
          ...item,
          price: Math.round(item.netPrice * 100) / 100,
        }))

        // Ensure sum of rounded items matches desired item total (subtotal - voucher discount)
        const roundedItemsTotal = roundedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const desiredItemsTotal = subtotal - totalVoucherDiscount
        const diff = Math.round((desiredItemsTotal - roundedItemsTotal) * 100) / 100
        if (diff !== 0 && roundedItems.length > 0) {
          roundedItems[0].price = Math.round((roundedItems[0].price + diff / roundedItems[0].quantity) * 100) / 100
        }

        const itemsForStripe = roundedItems.map(({ netPrice, ...item }) => item)
        
        const stripeResponse = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.order_id,
            customerEmail: session.user.email,
            customerName: selectedAddress.full_name,
            items: itemsForStripe,
            shippingCost: shipping,
            totalAmount: total,
            currency: 'usd',
          }),
        })
        
        const stripeData = await stripeResponse.json()
        
        if (!stripeResponse.ok) {
          console.error('❌ [STRIPE] Failed to create checkout session:', stripeData.error)
          throw new Error(stripeData.error || 'Failed to create Stripe session')
        }
        
        console.log('✅ [STRIPE] Redirecting to Stripe checkout...')
        setIsProcessing(false)
        window.location.href = stripeData.url
        return
      }
      
      // For ID region, continue with Midtrans
      console.log('💳 [MIDTRANS] Processing payment for ID region...')
      
      // Check if this is a guest user
      const isGuest = session?.user?.is_anonymous
      console.log('🔵 [DEBUG] Is guest user?', isGuest)
      console.log('🔵 [DEBUG] Session:', session)

      // Check for existing pending order FIRST (applies to both guests and logged-in users)
      // This prevents duplicate inventory reservations
      if (orderData.is_existing) {
        console.log('♻️ [ORDER] Reusing existing pending order')
        toast.info(t.checkout.continuingPendingOrder)

        if (isGuest) {
          const customerEmail = orderData.customer_email || ''
          const redirectUrl = '/track-order?order=' + orderData.order_number + '&email=' + encodeURI(customerEmail)
          console.log('🔵 [GUEST REUSE] Redirecting guest to existing order tracking:', redirectUrl)
          setIsProcessing(false)
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 500)
          return
        }
        
        // If reusing and has valid snap_token, use it directly
        if (orderData.snap_token && orderData.expiry_time) {
          const expiryDate = new Date(orderData.expiry_time)
          if (expiryDate > new Date()) {
            console.log('✅ [ORDER] Reusing existing snap_token')
            
            // Logged-in users: open payment modal with existing token
            const redirectUrl = '/account/orders/' + orderData.order_id
            console.log('🔵 [USER REUSE] Redirect URL for logged-in user:', redirectUrl)
            
            if (typeof window !== 'undefined' && (window as any).snap) {
              ;(window as any).snap.pay(orderData.snap_token, {
                onSuccess: (result: any) => {
                  console.log('✅ [PAYMENT] Payment successful!', result)
                  toast.success('Payment successful! Processing your order...')
                  console.log('🔄 [REDIRECT] Redirecting to:', redirectUrl)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                },
                onPending: (result: any) => {
                  console.log('⏳ [PAYMENT] Payment pending', result)
                  toast.info('Payment pending. You can continue payment later.')
                  console.log('🔄 [REDIRECT] Redirecting to:', redirectUrl)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                },
                onError: (result: any) => {
                  console.error('❌ [PAYMENT] Payment error', result)
                  toast.error('Payment failed. You can retry later.')
                  console.log('🔄 [REDIRECT] Redirecting to:', redirectUrl)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                },
                onClose: () => {
                  console.log('🚪 [PAYMENT] Payment modal closed by user')
                  toast.info(t.checkout.continuePaymentLater)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                }
              })
              return // Exit early, no need to generate new token
            }
          } else {
            console.log('⏰ [ORDER] Existing snap_token expired, generating new one')
          }
        }
      }
      
      // For NEW guest orders, redirect immediately to track-order page
      if (isGuest) {
        const customerEmail = orderData.customer_email || ''
        const redirectUrl = '/track-order?order=' + orderData.order_number + '&email=' + encodeURI(customerEmail)
        console.log('🔵 [GUEST] Redirecting guest immediately to:', redirectUrl)
        toast.success('Order created! Redirecting to tracking page...')
        setIsProcessing(false)
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 500)
        return
      }

      // ⭐ STEP 2: Generate Midtrans token using order_number
      console.log('💳 [ORDER] Creating Midtrans payment token...')
      console.log('💰 [ORDER] Total amount (IDR):', convertToIDR(total))
      console.log('📋 [ORDER] Selected Address:', selectedAddress)
      console.log('📋 [ORDER] Full Name:', selectedAddress.full_name)
      console.log('📋 [ORDER] Phone:', selectedAddress.phone)
      console.log('📋 [ORDER] Email:', session.user.email)
      
      // Safely extract customer details with fallbacks
      const addressData = selectedAddress as any // Cast to any for fallback checks
      const fullName = selectedAddress.full_name || addressData.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Customer'
      const firstName = fullName.split(' ')[0] || 'Customer'
      const lastName = fullName.split(' ').slice(1).join(' ') || ''
      const phone = selectedAddress.phone || addressData.phone_number || session.user.user_metadata?.phone || '0000000000'
      
      console.log('📋 [ORDER] Extracted - First Name:', firstName)
      console.log('📋 [ORDER] Extracted - Last Name:', lastName)
      console.log('📋 [ORDER] Extracted - Phone:', phone)
      console.log('📦 [ORDER] Items for Midtrans:', itemsForMidtrans)
      console.log('📦 [ORDER] Items count:', itemsForMidtrans?.length || 0)
      
      // Ensure items is always an array
      const safeItems = Array.isArray(itemsForMidtrans) && itemsForMidtrans.length > 0 
        ? itemsForMidtrans 
        : [{
            id: 'default',
            name: 'Order Items',
            price: convertToIDR(total),
            quantity: 1
          }]
      
      console.log('📦 [ORDER] Safe Items:', safeItems)
      
      const midtransResponse = await fetch('/api/midtrans/create-token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          orderId: orderData.order_number, // Use order_number, not session_id
          amount: convertToIDR(total),
          customerDetails: {
            firstName: firstName,
            lastName: lastName,
            email: session.user.email,
            phone: phone,
          },
          items: safeItems,
          shippingAddress: {
            firstName: firstName,
            lastName: lastName,
            email: session.user.email,
            phone: phone,
            address: `${selectedAddress.address_line1}${selectedAddress.address_line2 ? ', ' + selectedAddress.address_line2 : ''}`,
            city: selectedAddress.city,
            postalCode: selectedAddress.postal_code,
            countryCode: selectedAddress.country === 'Indonesia' ? 'IDN' : 'USA',
          },
        }),
      })

      const midtransData = await midtransResponse.json()
      console.log('🎫 [ORDER] Midtrans response:', midtransData)

      if (!midtransResponse.ok) {
        console.error('❌ [ORDER] Failed to create payment token:', midtransData.error)
        throw new Error(midtransData.error || 'Failed to create payment token')
      }
      console.log('✅ [ORDER] Payment token created successfully')
      console.log('📊 [TOKEN DEBUG] Midtrans token details:', {
        token_preview: midtransData.token?.substring(0, 20) + '...',
        token_length: midtransData.token?.length,
        has_redirect_url: !!midtransData.redirect_url,
        order_id: orderData.order_id
      })

      // ⭐ STEP 3: Save snap_token back to order
      console.log('💾 [TOKEN DEBUG] Saving snap_token to order...')
      console.log('📤 [TOKEN DEBUG] Update request payload:', {
        order_id: orderData.order_id,
        token_length: midtransData.token?.length,
        has_redirect_url: !!midtransData.redirect_url
      })

      const updateTokenResponse = await fetch('/api/orders/update-snap-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          snap_token: midtransData.token,
          snap_redirect_url: midtransData.redirect_url,
        }),
      })

      console.log('📥 [TOKEN DEBUG] Update response status:', updateTokenResponse.status)

      if (!updateTokenResponse.ok) {
        const errorData = await updateTokenResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ [TOKEN DEBUG] Failed to save snap_token!', {
          status: updateTokenResponse.status,
          statusText: updateTokenResponse.statusText,
          error: errorData,
          order_id: orderData.order_id
        })
        console.error('⚠️ [ORDER] Failed to save snap_token, but continuing...')
      } else {
        const successData = await updateTokenResponse.json().catch(() => ({}))
        console.log('✅ [TOKEN DEBUG] snap_token saved successfully!', successData)
        console.log('✅ [ORDER] snap_token saved to order')
      }

      // Guest users should have already been redirected earlier
      // This code only runs for logged-in users
      
      // Logged-in users: open payment modal here
      console.log('🪟 [ORDER] Opening Midtrans payment modal for logged-in user...')
      const redirectUrl = '/account/orders/' + orderData.order_id
      console.log('🔵 [USER] Redirect URL for logged-in user:', redirectUrl)
      
      if (typeof window !== 'undefined' && (window as any).snap) {
        ;(window as any).snap.pay(midtransData.token, {
          onSuccess: (result: any) => {
            console.log('✅ [PAYMENT] Payment successful!', result)
            toast.success('Payment successful! Processing your order...')
            console.log('🔄 [REDIRECT] Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            setIsProcessing(false)
          },
          onPending: (result: any) => {
            console.log('⏳ [PAYMENT] Payment pending', result)
            toast.info('Payment pending. You can continue payment later.')
            console.log('🔄 [REDIRECT] Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            setIsProcessing(false)
          },
          onError: (result: any) => {
            console.error('❌ [PAYMENT] Payment error', result)
            toast.error('Payment failed. You can retry later.')
            console.log('🔄 [REDIRECT] Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            setIsProcessing(false)
          },
          onClose: () => {
            console.log('🚪 [PAYMENT] Payment modal closed by user')
            toast.info(t.checkout.continuePaymentLater)
            router.push(redirectUrl)
            setIsProcessing(false)
          }
        })
      } else {
        throw new Error('Midtrans Snap not loaded. Please refresh the page.')
      }
    } catch (error: any) {
      console.error('Place order error:', error)
      // Translate specific error messages
      let errorMessage = error.message || 'Failed to place order'
      if (errorMessage.includes('Maximum pending orders limit reached')) {
        errorMessage = t.checkout.maxPendingOrdersError
      }
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const validateCartQuantities = () => {
    const allItems = [...cartItems, ...quickAddedItems]
    
    for (const item of allItems) {
      let effectiveMaxQty: number | null | undefined = item.product.max_purchase_quantity
      let effectiveStock: number | null | undefined = item.product.stock_quantity
      
      // Check variant-specific limits if variant is selected
      if (item.variant_sku && item.product.variants) {
        const variant = item.product.variants.find((v: any) => v.sku === item.variant_sku)
        if (variant) {
          effectiveMaxQty = variant.max_purchase_quantity || item.product.max_purchase_quantity
          effectiveStock = variant.stock_quantity
        }
      }
      
      // Validate maximum quantity
      if (effectiveMaxQty !== null && effectiveMaxQty !== undefined && item.quantity > effectiveMaxQty) {
        toast.error(`${item.variant_name || item.product.name}: Maximum quantity is ${effectiveMaxQty}. Please reduce quantity in cart.`)
        return false
      }
      
      // Validate stock quantity (only if stock tracking is enabled for this product/variant)
      if (effectiveStock !== null && effectiveStock !== undefined && item.quantity > effectiveStock) {
        toast.error(`${item.variant_name || item.product.name}: Only ${effectiveStock} items available. Please reduce quantity in cart.`)
        return false
      }
    }
    
    return true
  }

  const handleGuestCheckout = async (guestData: any) => {
    console.log('🚀 [GUEST] handleGuestCheckout called')
    
    // Validate cart quantities before proceeding
    if (!validateCartQuantities()) {
      return
    }
    
    setIsProcessing(true)
    try {
      // Get current session (anonymous or authenticated)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No session found. Please refresh the page.')
      }

      console.log('🔵 [GUEST] Session:', session)
      console.log('🔵 [GUEST] Is anonymous?', session.user.is_anonymous)

      // Fetch DHL shipping cost for guest address
      console.log('🚀 [GUEST] Fetching shipping cost for guest address...')
      const guestShippingCost = await fetchShippingCost(guestData)
      const guestShipping = guestShippingCost ?? 0

      // Prepare session data based on user type
      const sessionPayload: any = {}
      if (session.user.is_anonymous) {
        sessionPayload.session_id = session.user.id
      } else {
        sessionPayload.user_id = session.user.id
      }

      // For Buy Now flow, include items from state (cart + quick-added items)
      if (isBuyNow || quickAddedItems.length > 0) {
        const itemsToCheckout = [...cartItems, ...quickAddedItems].map(item => {
          const basePrice = region?.code === 'ID' && (item.product as any).price_idr 
            ? (item.product as any).price_idr 
            : (item.product as any).price_usd || 0
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
          return {
            product_id: item.product_id,
            quantity: item.quantity,
            price: campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          }
        })
        sessionPayload.items = itemsToCheckout
      }

      // Build cart snapshot from frontend state
      const cart_snapshot = [...cartItems, ...quickAddedItems].map(item => {
        const basePrice = region?.code === 'ID' && (item.product as any).price_idr 
          ? (item.product as any).price_idr 
          : (item.product as any).price_usd || 0
        const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
        const effectivePrice = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
        
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          variant_sku: (item as any).variant_sku || null,
          price: effectivePrice,
          product: item.product
        }
      })

      // Build pricing snapshot using the freshly fetched guest shipping cost
      const guestTotal = subtotal - totalVoucherDiscount + guestShipping + tax - discount
      const pricing_snapshot = {
        subtotal,
        discount: totalVoucherDiscount,
        shipping: guestShipping,
        tax,
        total: guestTotal,
        currency_code: region?.currency_code || 'USD'
      }

      // Create checkout session
      const sessionResponse = await fetch('/api/checkout/session/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionPayload,
          currency_code: region?.currency_code,
          region_code: region?.code,
          customer_email: guestData.email,
          guest_shipping_address: {
            full_name: guestData.full_name,
            phone: guestData.phone,
            address_line1: guestData.address_line1,
            address_line2: guestData.address_line2,
            city: guestData.city,
            state_province: guestData.state_province,
            postal_code: guestData.postal_code,
            country: guestData.country,
          },
          cart_snapshot,
          pricing_snapshot,
        }),
      })

      const sessionData = await sessionResponse.json()
      if (!sessionResponse.ok) {
        throw new Error(sessionData.error || 'Failed to create checkout session')
      }

      console.log('✅ [GUEST] Checkout session created:', sessionData.session_id)

      // ⭐ STEP 1: Create order FIRST (before token generation) - ORDER-FIRST ARCHITECTURE
      console.log('📝 [GUEST] Creating order before payment...')
      const initialOrderResponse = await fetch('/api/orders/create-before-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_session_id: sessionData.session_id,
          snap_token: null,
          snap_redirect_url: null,
          user_id: session.user.is_anonymous ? null : session.user.id,
          session_id: session.user.is_anonymous ? session.user.id : null,
        }),
      })

      const orderData = await initialOrderResponse.json()
      if (!initialOrderResponse.ok) {
        console.error('❌ [GUEST] Failed to create order:', orderData.error)
        throw new Error(orderData.error || 'Failed to create order')
      }

      console.log('✅ [GUEST] Order created:', orderData.order_number)
      console.log('🔵 [GUEST] Order data:', orderData)
      // Immediately reset cart badge
      window.dispatchEvent(new Event('cart-updated'))

      // If order already has snap_token and it's not expired, reuse it
      if (orderData.snap_token && orderData.expiry_time) {
        const expiryDate = new Date(orderData.expiry_time)
        if (expiryDate > new Date()) {
          console.log('✅ [GUEST] Reusing existing snap_token')
          
          // Store order info in sessionStorage and localStorage for track-order page
          const orderInfo = JSON.stringify({
            order_number: orderData.order_number,
            customer_email: guestData.email
          })
          sessionStorage.setItem('guestOrderInfo', orderInfo)
          localStorage.setItem('guestOrderInfo', orderInfo)
          
          // Add to order history array for session tracking
          const orderHistoryItem = {
            order_number: orderData.order_number,
            customer_email: guestData.email,
            created_at: new Date().toISOString()
          }
          
          const existingHistory = localStorage.getItem('orderHistory')
          let orderHistory = existingHistory ? JSON.parse(existingHistory) : []
          
          // Check if order already exists in history
          const orderExists = orderHistory.some((o: any) => o.order_number === orderData.order_number)
          if (!orderExists) {
            orderHistory.unshift(orderHistoryItem) // Add to beginning
            orderHistory = orderHistory.slice(0, 10) // Keep only last 10 orders
            localStorage.setItem('orderHistory', JSON.stringify(orderHistory))
            console.log('📚 [GUEST REUSE] Order added to session history')
          }

          // Open Midtrans modal with existing token
          if (typeof window !== 'undefined' && (window as any).snap) {
            ;(window as any).snap.pay(orderData.snap_token, {
              onSuccess: (result: any) => {
                console.log('✅ [PAYMENT] Payment successful!', result)
                toast.success('Payment successful! Processing your order...')
                window.location.href = '/track-order'
              },
              onPending: (result: any) => {
                console.log('⏳ [PAYMENT] Payment pending', result)
                toast.info('Payment pending. You can continue payment later.')
                window.location.href = '/track-order'
                setIsProcessing(false)
              },
              onError: (result: any) => {
                console.error('❌ [PAYMENT] Payment error', result)
                toast.error('Payment failed. You can retry later.')
                window.location.href = '/track-order'
                setIsProcessing(false)
              },
              onClose: () => {
                console.log('🚪 [PAYMENT] Payment modal closed by user')
                toast.info('You can continue payment anytime from the order tracking page')
                window.location.href = '/track-order'
                setIsProcessing(false)
              }
            })
            return
          }
        }
      }

      // Generate new Midtrans token
      console.log('� [GUEST] Generating new Midtrans token...')
      
      const USD_TO_IDR = 15000
      const isIDRegion = region?.code === 'ID'
      const convertToIDR = (amount: number) => {
        if (isIDRegion) {
          return Math.round(amount)
        }
        return Math.round(amount * USD_TO_IDR)
      }

      const itemsForMidtrans = [
        ...[...cartItems, ...quickAddedItems].map(item => {
          const basePrice = getBasePrice(item.product, (item as any).variant_sku)
          const itemName = (item as any).variant_name || item.product.name
          // Apply campaign discount first, then sale price, then voucher
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
          const effectivePrice = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          const voucherDiscount = voucherDiscounts.get(item.id) || 0
          // Voucher discount is total for all units, so divide by quantity to get per-unit price
          const totalItemPrice = effectivePrice * item.quantity
          const netPricePerUnit = (totalItemPrice - voucherDiscount) / item.quantity
          
          return {
            id: item.product_id,
            name: itemName,
            price: convertToIDR(netPricePerUnit),
            quantity: item.quantity,
          }
        }),
        {
          id: 'shipping',
          name: 'Shipping Fee',
          price: convertToIDR(shipping),
          quantity: 1,
        },
        // Add tax as a line item only if tax > 0
        ...(tax > 0 ? [{
          id: 'tax',
          name: 'Tax (10%)',
          price: convertToIDR(tax),
          quantity: 1,
        }] : [])
      ]

      console.log('📤 [GUEST TOKEN DEBUG] Calling Midtrans API...', {
        orderId: orderData.order_number,
        amount: convertToIDR(total),
        itemCount: itemsForMidtrans.length
      })

      const midtransResponse = await fetch('/api/midtrans/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.order_number,
          amount: convertToIDR(total),
          customerDetails: {
            firstName: guestData.full_name.split(' ')[0],
            lastName: guestData.full_name.split(' ').slice(1).join(' ') || guestData.full_name,
            email: guestData.email,
            phone: guestData.phone,
          },
          items: itemsForMidtrans,
          shippingAddress: {
            firstName: guestData.full_name.split(' ')[0],
            lastName: guestData.full_name.split(' ').slice(1).join(' ') || guestData.full_name,
            email: guestData.email,
            phone: guestData.phone,
            address: `${guestData.address_line1}${guestData.address_line2 ? ', ' + guestData.address_line2 : ''}`,
            city: guestData.city,
            postalCode: guestData.postal_code,
            countryCode: guestData.country === 'Indonesia' ? 'IDN' : 'USA',
          },
        }),
      })

      console.log('📥 [GUEST TOKEN DEBUG] Midtrans response status:', midtransResponse.status)

      const midtransData = await midtransResponse.json()
      
      if (!midtransResponse.ok) {
        console.error('❌ [GUEST TOKEN DEBUG] Midtrans token creation failed!', {
          status: midtransResponse.status,
          error: midtransData
        })
        throw new Error(midtransData.error || 'Failed to create payment token')
      }

      console.log('✅ [GUEST TOKEN DEBUG] Midtrans token created!', {
        has_token: !!midtransData.token,
        token_preview: midtransData.token?.substring(0, 20) + '...',
        has_redirect_url: !!midtransData.redirect_url
      })

      // Save snap_token to order
      console.log('💾 [GUEST TOKEN DEBUG] Saving token to order via update-snap-token API...')
      const saveTokenResponse = await fetch('/api/orders/update-snap-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          snap_token: midtransData.token,
          snap_redirect_url: midtransData.redirect_url,
        }),
      })

      console.log('📥 [GUEST TOKEN DEBUG] Save token response status:', saveTokenResponse.status)

      if (!saveTokenResponse.ok) {
        const errorData = await saveTokenResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ [GUEST TOKEN DEBUG] Failed to save token to order!', {
          status: saveTokenResponse.status,
          error: errorData,
          order_id: orderData.order_id
        })
        // Continue anyway - user can still pay via track order page
      } else {
        console.log('✅ [GUEST TOKEN DEBUG] Token saved to order successfully!')
      }

      // Store order info in both sessionStorage (for immediate redirect) and localStorage (for persistence)
      const orderInfo = JSON.stringify({
        order_number: orderData.order_number,
        customer_email: guestData.email
      })
      sessionStorage.setItem('guestOrderInfo', orderInfo)
      localStorage.setItem('guestOrderInfo', orderInfo)
      
      // Add to order history array for session tracking
      const orderHistoryItem = {
        order_number: orderData.order_number,
        customer_email: guestData.email,
        created_at: new Date().toISOString()
      }
      
      const existingHistory = localStorage.getItem('orderHistory')
      let orderHistory = existingHistory ? JSON.parse(existingHistory) : []
      
      // Check if order already exists in history
      const orderExists = orderHistory.some((o: any) => o.order_number === orderData.order_number)
      if (!orderExists) {
        orderHistory.unshift(orderHistoryItem) // Add to beginning
        // Keep only last 10 orders
        orderHistory = orderHistory.slice(0, 10)
        localStorage.setItem('orderHistory', JSON.stringify(orderHistory))
        console.log('📚 [GUEST] Order added to session history')
      }
      
      console.log('💾 [GUEST] Order info saved to localStorage for persistent access')

      // Open Midtrans Snap modal
      if (typeof window !== 'undefined' && (window as any).snap) {
        ;(window as any).snap.pay(midtransData.token, {
          onSuccess: (result: any) => {
            console.log('✅ [PAYMENT] Payment successful!', result)
            toast.success('Payment successful! Processing your order...')
            window.location.href = '/track-order'
          },
          onPending: (result: any) => {
            console.log('⏳ [PAYMENT] Payment pending', result)
            toast.info('Payment pending. You can continue payment later.')
            window.location.href = '/track-order'
            setIsProcessing(false)
          },
          onError: (result: any) => {
            console.error('❌ [PAYMENT] Payment error', result)
            toast.error('Payment failed. You can retry later.')
            window.location.href = '/track-order'
            setIsProcessing(false)
          },
          onClose: () => {
            console.log('🚪 [PAYMENT] Payment modal closed by user')
            toast.info('You can continue payment anytime from the order tracking page')
            window.location.href = '/track-order'
            setIsProcessing(false)
          }
        })
      } else {
        throw new Error('Midtrans Snap not loaded. Please refresh the page.')
      }
      
      return
    } catch (error: any) {
      console.error('❌ [ORDER] Order placement failed:', error)
      console.error('❌ [ORDER] Error details:', error.message)
      // Translate specific error messages
      let errorMessage = error.message || 'Failed to complete checkout'
      if (errorMessage.includes('Maximum pending orders limit reached')) {
        errorMessage = t.checkout.maxPendingOrdersError
      }
      toast.error(errorMessage)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    const item = cartItems.find(i => i.id === itemId)
    if (!item) return

    const minQty = item.product.min_purchase_quantity || 1
    const maxQty = item.product.max_purchase_quantity || item.product.stock_quantity || 999999

    // Validate minimum quantity
    if (newQuantity < minQty) {
      toast.error(`Minimum quantity is ${minQty}`)
      return
    }

    // Validate maximum quantity
    if (item.product.max_purchase_quantity !== null && item.product.max_purchase_quantity !== undefined && newQuantity > item.product.max_purchase_quantity) {
      toast.error(`Maximum quantity is ${item.product.max_purchase_quantity}`)
      return
    }

    // Validate stock quantity
    if (item.product.stock_quantity && newQuantity > item.product.stock_quantity) {
      toast.error(`Only ${item.product.stock_quantity} items available`)
      return
    }

    try {
      // For Buy Now items (temp), just update local state
      if (itemId?.startsWith('buy-now-temp')) {
        setCartItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        )
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please refresh the page')
        return
      }

      // Build query based on user type
      let query = supabase.from('cart_items').update({ quantity: newQuantity } as any)
      
      if (session.user.is_anonymous) {
        query = query.eq('session_id', session.user.id)
      } else {
        query = query.eq('user_id', session.user.id)
      }
      
      const { error } = await query.eq('id', itemId)

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      // Update local state
      setCartItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (error: any) {
      console.error('Failed to update quantity:', error)
      toast.error(error.message || 'Failed to update quantity')
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      // For Buy Now items, clear sessionStorage and redirect
      if (itemId?.startsWith('buy-now-temp')) {
        sessionStorage.removeItem('buyNowItems')
        router.push('/checkout')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please refresh the page')
        return
      }

      // Build query based on user type
      let query = supabase.from('cart_items').delete()
      
      if (session.user.is_anonymous) {
        query = query.eq('session_id', session.user.id)
      } else {
        query = query.eq('user_id', session.user.id)
      }
      
      const { error } = await query.eq('id', itemId)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      // Update local state
      setCartItems(prev => prev.filter(item => item.id !== itemId))

      // If cart is empty, redirect to checkout page
      if (cartItems.length === 1) {
        router.push('/checkout')
      }
    } catch (error: any) {
      console.error('Failed to remove item:', error)
      toast.error(error.message || 'Failed to remove item')
    }
  }

  const handleEditAddress = () => {
    const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)
    if (selectedAddress) {
      setEditForm({
        full_name: selectedAddress.full_name,
        phone: selectedAddress.phone,
        address_line1: selectedAddress.address_line1,
        address_line2: selectedAddress.address_line2 || '',
        city: selectedAddress.city,
        state_province: selectedAddress.state_province,
        postal_code: selectedAddress.postal_code,
        country: selectedAddress.country,
        is_default: selectedAddress.is_default,
        latitude: (selectedAddress as any).latitude,
        longitude: (selectedAddress as any).longitude,
      })
      // Initialize province/city dropdowns
      const provinces = getProvinces(selectedAddress.country)
      setEditAvailableProvinces(provinces)
      const matchedProvince = provinces.find(p => p.name === selectedAddress.state_province)
      if (matchedProvince) {
        setEditSelectedProvince(matchedProvince.code)
        setEditAvailableCities(getCities(selectedAddress.country, matchedProvince.code))
      } else {
        setEditSelectedProvince('')
        setEditAvailableCities([])
      }
      setIsEditingAddress(true)
    }
  }

  const handleValidateAddress = async () => {
    const result = await validateAddress({
      countryCode: editForm.country === 'Indonesia' ? 'ID' : editForm.country === 'United States' ? 'US' : editForm.country === 'Singapore' ? 'SG' : 'ID',
      postalCode: editForm.postal_code,
      cityName: editForm.city,
      addressLine1: editForm.address_line1,
      full_name: editForm.full_name,
      phone: editForm.phone,
    })

    if (!result.isValid && result.warnings && result.warnings.length > 0) {
      result.warnings.forEach((warning: string) => {
        toast.warning(warning, { duration: 8000 })
      })
    } else if (result.isValid) {
      toast.success('✅ Address validated successfully!')
    }
    
    return true
  }

  const handleSaveAddress = async () => {
    try {
      // Auto-validate with DHL before saving
      // Warnings are non-blocking — address still saves, user sees toast warnings
      await handleValidateAddress()

      // If setting as default, unset any existing default first
      if (editForm.is_default) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false } as any)
          .neq('id', selectedAddressId)
          .eq('user_id', userId)
      }

      const { error } = await supabase
        .from('shipping_addresses')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          address_line1: editForm.address_line1,
          address_line2: editForm.address_line2 || null,
          city: editForm.city,
          state_province: editForm.state_province,
          postal_code: editForm.postal_code,
          country: editForm.country,
          is_default: editForm.is_default,
        } as any)
        .eq('id', selectedAddressId)

      if (error) throw error

      // Update local state
      setSavedAddresses(prev =>
        prev.map(addr =>
          addr.id === selectedAddressId
            ? { ...addr, ...editForm }
            : editForm.is_default ? { ...addr, is_default: false } : addr
        )
      )

      setIsEditingAddress(false)
      toast.success('Address updated successfully')
    } catch (error: any) {
      console.error('Failed to update address:', error)
      toast.error('Failed to update address')
    }
  }

  // Fetch shipping cost when address is selected (wait for region to load)
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0 && region) {
      fetchShippingCost()
    }
  }, [selectedAddressId, region])

  const fetchShippingCost = async (address?: any): Promise<number | null> => {
    setIsLoadingShipping(true)
    try {
      const targetAddress = address || savedAddresses.find(a => a.id === selectedAddressId)
      if (!targetAddress) {
        console.log('⚠️ [SHIPPING] No address available for rate calculation')
        setShippingCost(null)
        return null
      }

      console.log('🚀 [SHIPPING] Fetching DHL rates for address:', targetAddress.city, targetAddress.postal_code)

      const res = await fetch('/api/shipping/dhl/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: {
            postalCode: process.env.NEXT_PUBLIC_DHL_SHIPPER_POSTAL_CODE || '13920',
            cityName: process.env.NEXT_PUBLIC_DHL_SHIPPER_CITY || 'Jakarta',
            countryCode: process.env.NEXT_PUBLIC_DHL_SHIPPER_COUNTRY || 'ID',
            addressLine1: (process.env.NEXT_PUBLIC_DHL_SHIPPER_ADDRESS || 'Kawasan Industri Pulogadung').substring(0, 45),
          },
          destination: {
            postalCode: targetAddress.postal_code,
            cityName: targetAddress.city,
            countryCode: targetAddress.country === 'Indonesia' ? 'ID' : targetAddress.country === 'United States' ? 'US' : targetAddress.country === 'Singapore' ? 'SG' : 'ID',
            addressLine1: targetAddress.address_line1 ? targetAddress.address_line1.substring(0, 45) : undefined,
          },
          packages: [{ weight: 1, dimensions: { length: 10, width: 10, height: 10 } }],
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success || !data.rates?.length) {
        console.error('❌ [SHIPPING] DHL rates failed:', data.error || 'No rates returned')
        // Keep as null so UI shows "Calculated at checkout" instead of "FREE"
        setShippingCost(null)
        return null
      }

      // Pick the cheapest rate
      const cheapest = data.rates.reduce((min: any, r: any) => r.totalPrice < min.totalPrice ? r : min, data.rates[0])
      console.log('✅ [SHIPPING] Cheapest DHL rate:', cheapest.serviceType, cheapest.totalPrice, cheapest.currency)

      // Convert DHL rate to match checkout base currency
      // DHL returns IDR for Indonesia domestic; checkout base is IDR if region=ID, else USD
      const dhlCurrency = cheapest.currency
      const dhlPrice = cheapest.totalPrice
      const isIDRegion = region?.code === 'ID'
      const displayCurrency = isIDRegion ? 'IDR' : 'USD'
      let convertedShipping = dhlPrice
      const USD_TO_IDR = 15000

      if (dhlCurrency === 'IDR' && !isIDRegion) {
        convertedShipping = dhlPrice / USD_TO_IDR
        console.log('💱 [SHIPPING] Converted', dhlPrice, 'IDR →', convertedShipping.toFixed(2), 'USD')
      } else if (dhlCurrency === 'USD' && isIDRegion) {
        convertedShipping = dhlPrice * USD_TO_IDR
        console.log('💱 [SHIPPING] Converted', dhlPrice, 'USD →', convertedShipping.toFixed(0), 'IDR')
      } else {
        console.log('💱 [SHIPPING] No conversion needed:', dhlPrice, dhlCurrency)
      }

      const roundedShipping = Math.round(convertedShipping * 100) / 100
      setShippingCost(roundedShipping)
      return roundedShipping
    } catch (error: any) {
      console.error('❌ [SHIPPING] Error fetching rates:', error.message)
      setShippingCost(null)
      return null
    } finally {
      setIsLoadingShipping(false)
    }
  }

  // Helper function to format address name (avoid showing email username)
  const formatAddressName = (address: Address, userEmail?: string) => {
    const name = address.full_name
    // If name looks like an email username (no spaces, matches email), try to get real name
    if (name && !name.includes(' ') && userEmail && name === userEmail.split('@')[0]) {
      // Return a placeholder or extract from email
      return userEmail.split('@')[0].replace(/[0-9]/g, '').replace(/[._-]/g, ' ').trim() || name
    }
    return name
  }

  // Helper function to format phone number (show "-" if empty)
  const formatPhone = (phone: string | null | undefined) => {
    return phone && phone.trim() ? phone : '-'
  }

  // Helper function to get base price from product based on region
  const getBasePrice = (product: any, variantSku?: string | null) => {
    // If variant is specified, find variant price
    if (variantSku && product.variants) {
      const variant = product.variants.find((v: any) => v.sku === variantSku)
      if (variant) {
        return region?.code === 'ID' ? variant.price_idr : variant.price_usd
      }
    }
    // Otherwise use product price
    return region?.code === 'ID' && product.price_idr 
      ? product.price_idr 
      : product.price_usd || 0
  }

  // Helper to get effective price after applying campaign discount
  const getDiscountedPrice = (product: any, productId: string, variantName?: string | null) => {
    // Try variant-specific discount first
    if (variantName) {
      const variantKey = `${productId}-${variantName}`
      const variantDiscount = activeDiscounts.get(variantKey)
      if (variantDiscount) return variantDiscount.discounted_price
    }
    // Fall back to product-level discount
    const productDiscount = activeDiscounts.get(productId)
    if (productDiscount) return productDiscount.discounted_price
    return null
  }

  // Combine cart items and quick-added items for total calculation
  const allItems = [...cartItems, ...quickAddedItems]
  
  // Helper to convert USD to local currency (matches formatPrice logic)
  const convertToLocalCurrency = (usdAmount: number): number => {
    const currencyCode = region?.currency_code || currency
    if (currencyCode === 'USD') return usdAmount
    if (currencyCode === 'IDR') return usdAmount // IDR prices are pre-converted
    
    // Parse the formatted price to extract the numeric value with conversion applied
    // This ensures we use the same conversion logic as formatPrice
    const formatted = formatPrice(usdAmount, currencyCode)
    const numericValue = parseFloat(formatted.replace(/[^0-9.-]+/g, ''))
    return isNaN(numericValue) ? usdAmount : numericValue
  }
  
  const subtotal = allItems.reduce((total, item) => {
    const basePrice = getBasePrice(item.product, (item as any).variant_sku)
    const salePrice = getEffectivePrice(basePrice, null)
    // Apply campaign discount if available (takes priority over sale price)
    const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
    const price = discounted !== null ? discounted : salePrice
    return total + (price * item.quantity)
  }, 0)

  // Calculate total voucher discount (round to 2 decimals to match display and avoid float drift)
  const rawVoucherDiscount = Array.from(voucherDiscounts.values()).reduce((sum, discount) => sum + discount, 0)
  const totalVoucherDiscount = Math.round(rawVoucherDiscount * 100) / 100

  // Calculate net amount after voucher discount for tax calculation
  const netAmount = subtotal - totalVoucherDiscount
  const shipping = shippingCost ?? 0 // null = not yet calculated; use 0 for total until API is integrated
  
  // Calculate tax only for products with tax_enabled = true
  const taxableAmount = cartItems.reduce((total, item) => {
    const product = item.product as any
    console.log(`🔍 Tax calculation for ${product.name}:`, {
      tax_enabled: product.tax_enabled,
      product_id: item.product_id,
      variant_sku: (item as any).variant_sku
    })
    if (product.tax_enabled) {
      // Use getBasePrice to handle variant prices correctly
      const basePrice = getBasePrice(product, (item as any).variant_sku)
      const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
      const price = discounted !== null ? discounted : basePrice
      const voucherDiscount = voucherDiscounts.get(item.product_id) || 0
      const itemTaxableAmount = (price * item.quantity) - voucherDiscount
      console.log(`  ✅ Taxable amount: ${itemTaxableAmount} (base: ${basePrice}, discounted: ${discounted}, voucher: ${voucherDiscount})`)
      return total + itemTaxableAmount
    }
    console.log(`  ❌ Tax disabled for this product`)
    return total
  }, 0)
  
  const tax = Math.round(taxableAmount * 0.1 * 100) / 100
  console.log(`💰 Total taxable amount: ${taxableAmount}, Tax (10%): ${tax}`)
  const total = Math.round((netAmount + shipping + tax - discount) * 100) / 100
  
  // For display: calculate by summing converted individual items to match what customer sees
  // This must exactly match what's displayed in the cart for each item
  console.log('💵 [DISPLAY SUBTOTAL] Calculating with allItems:', allItems.length, 'items')
  const displaySubtotal = allItems.reduce((total, item) => {
    const basePrice = getBasePrice(item.product, (item as any).variant_sku)
    const salePrice = getEffectivePrice(basePrice, null)
    const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
    const priceUSD = discounted !== null ? discounted : salePrice
    
    // Subtotal = original price before voucher
    const itemTotalUSD = priceUSD * item.quantity
    const priceLocal = convertToLocalCurrency(itemTotalUSD)
    return total + priceLocal
  }, 0)
  
  const displayVoucherDiscount = Math.round(convertToLocalCurrency(totalVoucherDiscount) * 100) / 100
  const displayShipping = Math.round(convertToLocalCurrency(shipping) * 100) / 100
  const displayTax = Math.round(convertToLocalCurrency(tax) * 100) / 100
  const displayDiscount = Math.round(convertToLocalCurrency(discount) * 100) / 100
  const displayTotal = Math.round((displaySubtotal - displayVoucherDiscount + displayShipping + displayTax - displayDiscount) * 100) / 100

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Hero Header */}
      <div className="border-b border-border/40 bg-luxury-gray-light py-10 md:py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-6 hidden md:block">
            <Breadcrumbs items={[
              { label: 'Products', href: '/products' },
              { label: t.checkout.title, href: '/checkout' },
            ]} />
          </div>
          {/* Mobile back button inside hero */}
          <div className="mb-4 md:hidden">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t.common.back}</span>
            </button>
          </div>
          <h1 className="mb-2 font-montserrat text-4xl font-bold lg:text-5xl">
            {t.checkout.title}
          </h1>
          <p className="font-playfair text-lg text-muted-foreground">
            {allItems.reduce((sum, item) => sum + item.quantity, 0)} {allItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? t.checkout.item : t.checkout.items}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">

            {/* Pre-order Shipping Info — shown once for all items */}
            {allItems.length > 0 && (() => {
              const preOrderDays = (allItems[0].product as any).pre_order_duration_days || 30
              const today = new Date()
              const estimateStart = new Date(today)
              estimateStart.setDate(today.getDate() + preOrderDays + 3)
              const estimateEnd = new Date(today)
              estimateEnd.setDate(today.getDate() + preOrderDays + 5)
              const formatDate = (date: Date) => {
                const day = date.getDate()
                const month = t.products.months[date.getMonth()]
                return `${day} ${month}`
              }
              return (
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 text-[#26AA99] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {t.products.preOrder} ({t.products.shippedIn} {preOrderDays} {t.products.days}). {t.products.estimatedArrival} {formatDate(estimateStart)} - {formatDate(estimateEnd)}
                  </p>
                </div>
              )
            })()}

            {/* Cart Items */}
            {allItems.map((item) => {
              const basePrice = getBasePrice(item.product, (item as any).variant_sku)
              const salePrice = getEffectivePrice(basePrice, null)
              const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
              const price = campaignDiscounted !== null ? campaignDiscounted : salePrice
              const hasCampaignDiscount = campaignDiscounted !== null && campaignDiscounted < basePrice
              
              return (
                <div key={item.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {(() => {
                        // Parse image field that may be a JSON string, array, or plain string
                        const parseImg = (raw: any): string | null => {
                          if (!raw) return null
                          if (Array.isArray(raw)) return raw.filter(Boolean)[0] || null
                          if (typeof raw === 'string') {
                            try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean)[0] || null : raw } catch { return raw }
                          }
                          return null
                        }

                        // Prefer variant-specific image
                        let displayImage: string | null = null
                        if ((item as any).variant_name && item.product.variants) {
                          const variants = Array.isArray(item.product.variants)
                            ? item.product.variants
                            : (() => { try { return JSON.parse(item.product.variants) } catch { return [] } })()
                          const variant = variants.find((v: any) => v.name === (item as any).variant_name)
                          if (variant?.image_url) displayImage = parseImg(variant.image_url)
                        }

                        // Fallback to product images
                        if (!displayImage) {
                          const raw = item.product.image_urls
                          const urls: string[] = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw as any) } catch { return [] } })()
                          displayImage = urls.find(u => u && !u.includes('placehold.co')) || null
                        }

                        return displayImage ? (
                          <img
                            src={displayImage}
                            alt={(item as any).variant_name || item.product.name}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )
                      })()}
                    </div>

                    {/* Product Details & Controls */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Product Name and Remove Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-sm sm:text-base text-gray-900 line-clamp-2 leading-tight">
                            {(item as any).variant_name || item.product.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {(voucherDiscounts.get(item.id) || 0) > 0 || discount > 0 ? (
                              <>
                                <span className="line-through text-gray-400">
                                  {formatPrice(basePrice, region?.currency_code || currency)}
                                </span>
                                {' '}
                                <span className="text-green-600 font-medium">
                                  {formatPrice(price - (voucherDiscounts.get(item.id) || 0) / item.quantity, region?.currency_code || currency)}
                                </span>
                                {' / '}{t.cart.item}
                              </>
                            ) : (
                              <>
                                {formatPrice(price, region?.currency_code || currency)} / {t.cart.item}
                              </>
                            )}
                          </p>
                        </div>
                        {item.id.startsWith('quick-') && (
                          <button
                            onClick={() => removeQuickItem(item.product_id)}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            aria-label="Remove item"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Quantity and Total */}
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm sm:text-base text-gray-600">
                            {t.trackOrder.qty}: {item.quantity}
                          </span>
                          <div className="flex flex-col items-end">
                            {(hasCampaignDiscount || (voucherDiscounts.get(item.id) || 0) > 0 || discount > 0) && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(basePrice * item.quantity, region?.currency_code || currency)}
                              </span>
                            )}
                            <p className="text-sm sm:text-base font-bold text-gray-900">
                              {(() => {
                                const itemTotal = price * item.quantity
                                const voucherDiscount = voucherDiscounts.get(item.id) || 0
                                return formatPrice(itemTotal - voucherDiscount, region?.currency_code || currency)
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}


            {/* Shipping Address Section - For logged in users */}
            {!isGuest && (
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-luxury-navy" />
                    <h2 className="text-xl font-bold text-gray-900">{t.checkout.shippingAddress}</h2>
                  </div>
                  {!isEditingAddress && selectedAddressId && (
                    <button
                      onClick={handleEditAddress}
                      className="text-sm text-luxury-navy hover:underline font-medium"
                    >
                      {t.checkout.editAddress}
                    </button>
                  )}
                </div>

                {savedAddresses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">{t.checkout.noAddress}</p>
                    <Button
                      onClick={() => window.location.href = '/account?tab=addresses'}
                      className="bg-luxury-navy hover:bg-luxury-navy-light"
                    >
                      {t.checkout.addShippingAddress}
                    </Button>
                  </div>
                ) : isEditingAddress ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-serif mb-6">{t.checkout.editAddress}</h3>
                    
                    <div className="space-y-4">
                      {/* Address Line 1 */}
                      <div>
                        <Label htmlFor="edit-address_line1">{t.shippingModal.addressLine1} *</Label>
                        <Input
                          id="edit-address_line1"
                          value={editForm.address_line1}
                          onChange={(e) => setEditForm({...editForm, address_line1: e.target.value})}
                          required
                          className={editForm.address_line1.length > 45 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        {editForm.address_line1.length > 45 && (
                          <p className="text-xs text-red-500 mt-1">Address must be less than 45 characters (DHL limit)</p>
                        )}
                        {editForm.address_line1.length > 0 && editForm.address_line1.length < 5 && (
                          <p className="text-xs text-red-500 mt-1">Address must be at least 5 characters</p>
                        )}
                      </div>

                      {/* Address Line 2 */}
                      <div>
                        <Label htmlFor="edit-address_line2">{t.shippingModal.addressLine2}</Label>
                        <Input
                          id="edit-address_line2"
                          value={editForm.address_line2}
                          onChange={(e) => setEditForm({...editForm, address_line2: e.target.value})}
                        />
                      </div>

                      {/* Province | City */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-state">{t.shippingModal.stateProvince} *</Label>
                          {hasRegionData(editForm.country) && editAvailableProvinces.length > 0 ? (
                            <Select
                              value={editSelectedProvince}
                              onValueChange={(value) => {
                                setEditSelectedProvince(value)
                                const province = editAvailableProvinces.find(p => p.code === value)
                                setEditAvailableCities(getCities(editForm.country, value))
                                setEditForm({ ...editForm, state_province: province?.name || '', city: '' })
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t.account.selectProvince} />
                              </SelectTrigger>
                              <SelectContent>
                                {editAvailableProvinces.map((p) => (
                                  <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="edit-state"
                              value={editForm.state_province}
                              onChange={(e) => setEditForm({...editForm, state_province: e.target.value})}
                              placeholder={t.account.enterStateProvince}
                              required
                            />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="edit-city">{t.shippingModal.city} *</Label>
                          {hasRegionData(editForm.country) && editAvailableCities.length > 0 ? (
                            <Select
                              value={editForm.city}
                              onValueChange={(value) => setEditForm({ ...editForm, city: value })}
                            >
                              <SelectTrigger className={`w-full ${!editForm.city ? 'border-red-500 focus:ring-red-500' : ''}`}>
                                <SelectValue placeholder={t.account.selectCity} />
                              </SelectTrigger>
                              <SelectContent>
                                {editAvailableCities.map((city) => (
                                  <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="edit-city"
                              value={editForm.city}
                              onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                              placeholder={t.account.enterCity}
                              required
                              className={!editForm.city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                          )}
                          {!editForm.city && (
                            <p className="text-xs text-red-500 mt-1">City is required</p>
                          )}
                        </div>
                      </div>

                      {/* Postal Code | Country */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-postal">{t.shippingModal.postalCode} *</Label>
                          <Input
                            id="edit-postal"
                            value={editForm.postal_code}
                            onChange={(e) => setEditForm({...editForm, postal_code: e.target.value})}
                            required
                            className={!editForm.postal_code ? 'border-red-500 focus-visible:ring-red-500' : ''}
                          />
                          {!editForm.postal_code && (
                            <p className="text-xs text-red-500 mt-1">Postal code is required</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="edit-country">{t.shippingModal.country} *</Label>
                          <Select
                            value={editForm.country}
                            onValueChange={(value) => {
                              const provinces = getProvinces(value)
                              setEditAvailableProvinces(provinces)
                              setEditSelectedProvince('')
                              setEditAvailableCities([])
                              setEditForm({ ...editForm, country: value, state_province: '', city: '' })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t.account.selectCountry} />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Set as default checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-is-default"
                          checked={editForm.is_default}
                          onChange={(e) => setEditForm({ ...editForm, is_default: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                        />
                        <label htmlFor="edit-is-default" className="text-sm text-muted-foreground cursor-pointer">
                          {t.account.setAsDefaultAddress}
                        </label>
                      </div>

                      {/* Map Picker Button (same position as profile page) */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowEditMap(!showEditMap)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-luxury-gold hover:text-luxury-gold-light"
                        >
                          <MapPin className="h-4 w-4" />
                          {t.shippingModal.pickLocation}
                        </button>
                        {showEditMap && (
                          <div className="mt-2 space-y-2 relative z-[1]">
                            <MapPicker
                              onLocationSelect={(location) => {
                                const provinces = getProvinces(editForm.country)
                                setEditAvailableProvinces(provinces)
                                const matchedProvince = provinces.find(p => p.name === location.state)
                                if (matchedProvince) {
                                  setEditSelectedProvince(matchedProvince.code)
                                  setEditAvailableCities(getCities(editForm.country, matchedProvince.code))
                                }
                                setEditForm({
                                  ...editForm,
                                  address_line1: location.address || editForm.address_line1,
                                  city: location.city || editForm.city,
                                  state_province: location.state || editForm.state_province,
                                  postal_code: location.postalCode || editForm.postal_code,
                                  country: location.country || editForm.country,
                                  latitude: location.lat,
                                  longitude: location.lng
                                })
                              }}
                              initialPosition={
                                editForm.latitude && editForm.longitude
                                  ? [editForm.latitude, editForm.longitude]
                                  : undefined
                              }
                            />
                            <p className="text-xs text-gray-500">{t.shippingModal.mapInstruction}</p>
                          </div>
                        )}
                      </div>

                      {/* Address Validation Status */}
                      {validationResult && (
                        <div className={`p-4 rounded-lg border ${
                          validationResult.isValid 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            {validationResult.isValid ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <span className="text-yellow-600 font-bold flex-shrink-0">⚠️</span>
                            )}
                            <div className="flex-1">
                              <p className={`font-medium ${
                                validationResult.isValid ? 'text-green-800' : 'text-yellow-800'
                              }`}>
                                {validationResult.message}
                              </p>
                              {validationResult.warnings && validationResult.warnings.length > 0 && (
                                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                                  {validationResult.warnings.map((warning, idx) => (
                                    <li key={idx}>• {warning}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditingAddress(false)}
                          className="flex-1"
                        >
                          {t.checkout.cancel}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveAddress}
                          disabled={isValidating || !editForm.postal_code || !editForm.city || !editForm.address_line1}
                          className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light"
                        >
                          {t.checkout.saveChanges}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedAddresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-luxury-navy bg-luxury-navy/5'
                          : 'border-gray-200 hover:border-luxury-navy/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="sr-only"
                      />
                      <div className="flex justify-between items-start">
                        <div className="text-gray-700 space-y-1">
                          <p className="text-sm">{address.address_line1}</p>
                          {address.address_line2 && (
                            <p className="text-sm">{address.address_line2}</p>
                          )}
                          <p className="text-sm">
                            {address.city}, {address.state_province} {address.postal_code}
                          </p>
                          <p className="text-sm">{getCountryName(address.country)}</p>
                          {address.phone && address.phone.trim() && (
                            <p className="text-sm mt-2">{t.checkout.phone}: {address.phone}</p>
                          )}
                        </div>
                        {address.is_default && (
                          <span className="px-2 py-1 bg-luxury-navy text-white text-xs rounded-full">
                            {t.checkout.default}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 lg:sticky lg:top-4">
              <h2 className="text-xl font-montserrat font-bold text-gray-900 mb-4">{t.checkout.orderSummary}</h2>

              {/* Promo Code Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-montserrat font-semibold text-gray-900 mb-3">{t.checkout.promoCode}</h3>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">{appliedPromo.code}</p>
                      <p className="text-xs text-green-700">-{formatCurrencyPrice(displayDiscount, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })} {t.checkout.discountApplied}</p>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-green-700 hover:text-green-900 text-sm font-medium"
                    >
                      {t.checkout.remove}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t.checkout.enterCode}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={applyPromoCode}
                      disabled={isApplyingPromo || !promoCode.trim()}
                      variant="outline"
                      size="sm"
                      className="px-4"
                    >
                      {isApplyingPromo ? t.checkout.applying : t.checkout.apply}
                    </Button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t.checkout.subtotal}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrencyPrice(displaySubtotal, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })}
                  </span>
                </div>
                {totalVoucherDiscount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <div className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Voucher{vouchers.length > 0 && vouchers[0]?.discount_type === 'percentage' ? ` (${vouchers[0].discount_value}%)` : ''}</span>
                    </div>
                    <span className="font-medium">-{formatCurrencyPrice(displayVoucherDiscount, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t.checkout.discount}</span>
                    <span className="font-medium">-{formatCurrencyPrice(displayDiscount, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    {t.checkout.shipping}
                    {isLoadingShipping && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Calculating...
                      </span>
                    )}
                  </span>
                  <span className={`font-medium ${shippingCost === null || shippingCost === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                    {shippingCost === null ? (
                      <span className="text-xs italic">{t.checkout.shippingCalculated}</span>
                    ) : shippingCost === 0 ? (
                      <span className="text-green-600">{t.checkout.free}</span>
                    ) : (
                      formatCurrencyPrice(displayShipping, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })
                    )}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.checkout.tax}</span>
                    <span className="font-medium text-gray-900">{formatCurrencyPrice(displayTax, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-base font-bold text-gray-900">{t.checkout.total}</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-luxury-navy">{formatCurrencyPrice(displayTotal, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {allItems.reduce((sum, item) => sum + item.quantity, 0)} {allItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? t.checkout.item : t.checkout.items}
                  </p>
                </div>
              </div>
              {/* Checkout Button - For both logged-in and guest users */}
              <div className="mt-6">
              {!isGuest ? (
                <>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || !selectedAddressId}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-semibold py-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {t.checkout.processing}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {!pendingOrder && <Lock className="h-5 w-5" />}
                        {pendingOrder ? 'Continue Payment' : t.checkout.placeOrder} · {formatCurrencyPrice(displayTotal, (region?.currency_code || currency) as any, { currencyDisplay: 'code' })}
                      </span>
                    )}
                  </Button>

                  {/* Payment Methods */}
                  <div className="mt-4">
                    <PaymentMethods size="small" showTitle />
                  </div>

                  {!selectedAddressId && savedAddresses.length === 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 text-center font-medium">
                        {t.checkout.pleaseAddAddress}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setShowCheckoutModal(true)}
                    className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-semibold py-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    size="lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="h-5 w-5" />
                      {t.checkout.continueToCheckout}
                    </span>
                  </Button>

                  {/* Payment Methods */}
                  <div className="mt-4">
                    <PaymentMethods size="small" showTitle />
                  </div>
                </>
              )}

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>{t.checkout.secureCheckout}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t.checkout.safePayment}</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onSubmit={handleGuestCheckout}
      />
    </div>
  )
}
