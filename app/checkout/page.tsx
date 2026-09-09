'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import { Lock, MapPin, CheckCircle2, ShoppingBag, ChevronDown, Ticket, Timer } from 'lucide-react'
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
import {
  fetchPaymentGatewayConfig,
  resolveCheckoutGateway,
  type PaymentGatewayConfig,
} from '@/lib/utils/payment'
import { CartItemsList } from './components/CartItemsList'
import { OrderSummary } from './components/OrderSummary'
import { PayPalCheckout } from '@/components/PayPalCheckout'

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

const isDev = process.env.NODE_ENV === 'development'
const debugLog = isDev ? console.log.bind(console) : () => {}

function VoucherExpiryInfo({ validUntil }: { validUntil: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null)

  useEffect(() => {
    const calculate = () => {
      const endDate = new Date(new Date(validUntil).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const diff = endDate.getTime() - nowJakarta.getTime()
      if (diff > 0) {
        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
        }
      }
      return null
    }
    const update = () => setTimeLeft(calculate())
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [validUntil])

  const countdownText = timeLeft
    ? timeLeft.days > 0
      ? `Ends in ${timeLeft.days}d ${timeLeft.hours}h`
      : timeLeft.hours > 0
        ? `Ends in ${timeLeft.hours}h ${timeLeft.minutes}m`
        : `Ends in ${timeLeft.minutes}m`
    : 'Expired'

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-luxury-gold mt-0.5" title={new Date(validUntil).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}>
      <Timer className="h-3 w-3" />
      {countdownText}
    </span>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { currency } = useCurrency()
  const { region } = useRegion()
  const { t } = useLanguage()
  const { validateAddress, isValidating, validationResult } = useAddressValidation()
  const wasAlreadySignedIn = useRef(false)
  const promoRestoredRef = useRef(false)
  const prefetchedExchangeRateRef = useRef<number | null>(null)
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
  const [quickAddedItems, setQuickAddedItems] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [discount, setDiscount] = useState(0)
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [publicVouchers, setPublicVouchers] = useState<any[]>([])
  const [activeDiscounts, setActiveDiscounts] = useState<Map<string, any>>(new Map())
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [paymentGatewayConfig, setPaymentGatewayConfig] = useState<PaymentGatewayConfig | null>(null)
  const [paypalOrderData, setPaypalOrderData] = useState<{ orderId: string; amount: number; currency: string; items: any[]; shippingCost: number } | null>(null)
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
    
    // Load payment gateway config once
    fetchPaymentGatewayConfig().then(setPaymentGatewayConfig)

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
        debugLog('🔄 [CHECKOUT] Page loaded from bfcache, reinitializing...')
        setIsLoading(true)
        initializeCheckout()
      }
    }
    window.addEventListener('pageshow', handlePageShow)

    // Listen for cart updates only in cart flow (not buy now or order again flow)
    const handleCartUpdate = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      const isOrderAgainFlow = urlParams.get('orderAgain') === 'true'
      
      if (!isBuyNowFlow && !isOrderAgainFlow) {
        // Small delay to ensure database has been updated
        await new Promise(resolve => setTimeout(resolve, 100))
        // Only refetch cart items and discounts, not addresses/recommended/vouchers
        await refetchCartOnly()
      }
    }
    window.addEventListener('cart-updated', handleCartUpdate)

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        if (wasAlreadySignedIn.current) return

        const isReloading = sessionStorage.getItem('checkout_reloading')
        if (isReloading) return
        
        // Wait a bit for cart merge to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        const urlParams = new URLSearchParams(window.location.search)
        const isBuyNowFlow = urlParams.get('buyNow') === 'true'
        const isOrderAgainFlow = urlParams.get('orderAgain') === 'true'
        if (!isBuyNowFlow && !isOrderAgainFlow) {
          await refetchCartOnly()
        }
      }
    })

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate)
      window.removeEventListener('pageshow', handlePageShow)
      subscription.unsubscribe()
      // Clear promo so navigating away and returning doesn't auto-apply to a different cart
      try { sessionStorage.removeItem('checkout_applied_promo') } catch {}
    }
  }, [])

  // Conditionally load Midtrans Snap script only when Midtrans is enabled
  useEffect(() => {
    if (!paymentGatewayConfig) return
    const enabledGateways = [
      ...(paymentGatewayConfig.ID?.enabled || []),
      ...(paymentGatewayConfig.global?.enabled || []),
    ]
    if (!enabledGateways.includes('midtrans')) return

    const existing = document.querySelector('script[src*="midtrans.com/snap/snap.js"]')
    if (existing) return

    const snapScript = document.createElement('script')
    snapScript.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    snapScript.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
    snapScript.async = true
    document.head.appendChild(snapScript)

    return () => {
      if (snapScript.parentNode) {
        snapScript.parentNode.removeChild(snapScript)
      }
    }
  }, [paymentGatewayConfig])

  // Clear promo when cart becomes empty
  useEffect(() => {
    if (cartItems.length === 0 && quickAddedItems.length === 0 && discount > 0) {
      setAppliedPromo(null)
      setDiscount(0)
      setPromoCode('')
      try { sessionStorage.removeItem('checkout_applied_promo') } catch {}
    }
  }, [cartItems.length, quickAddedItems.length])

  // Restore promo from sessionStorage once after cart is loaded (covers cart drawer → checkout flow)
  useEffect(() => {
    if (cartItems.length === 0 || promoRestoredRef.current) return
    promoRestoredRef.current = true

    try {
      const saved = sessionStorage.getItem('checkout_applied_promo')
      if (!saved) return
      const parsed = JSON.parse(saved)
      const savedCode = parsed?.code || parsed?.promo_code?.code
      if (!savedCode || parsed.discount_amount === undefined) return
      setAppliedPromo(parsed)
      setDiscount(parsed.discount_amount || 0)
      setPromoCode(savedCode)
    } catch {}
  }, [cartItems])

  // Prefetch exchange rates for non-USD regions to speed up order placement
  useEffect(() => {
    if (!region?.currency_code || region.currency_code === 'USD') return
    if (prefetchedExchangeRateRef.current !== null) return
    fetch('/api/exchange-rates')
      .then(res => res.ok ? res.json() : null)
      .then(rates => {
        if (rates && rates[region.currency_code!]) {
          prefetchedExchangeRateRef.current = 1 / rates[region.currency_code!]
        }
      })
      .catch(() => {})
  }, [region?.currency_code])

  const initializeCheckout = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
      if (session?.user?.id && !session.user.is_anonymous) {
        setUserId(session.user.id)
      }
      
      const guestUser = !session || session.user.is_anonymous === true
      setIsGuest(guestUser)
      if (!guestUser) wasAlreadySignedIn.current = true

      const buyNowItemsStr = sessionStorage.getItem('buyNowItems')
      const orderAgainItemsStr = sessionStorage.getItem('orderAgainItems')
      
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      const isOrderAgainFlow = urlParams.get('orderAgain') === 'true'
      
      if (buyNowItemsStr && !isBuyNowFlow) {
        sessionStorage.removeItem('buyNowItems')
      }
      if (orderAgainItemsStr && !isOrderAgainFlow) {
        sessionStorage.removeItem('orderAgainItems')
      }

      // Start address fetch in parallel (independent of cart flow)
      const addressPromise = (session && !session.user.is_anonymous)
        ? supabase
            .from('shipping_addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .order('is_default', { ascending: false })
        : Promise.resolve({ data: null, error: null } as any)

      if (orderAgainItemsStr && isOrderAgainFlow) {
        const orderAgainItems = JSON.parse(orderAgainItemsStr)
        
        if (!Array.isArray(orderAgainItems) || orderAgainItems.length === 0) {
          toast.error('Invalid order data')
          sessionStorage.removeItem('orderAgainItems')
          router.push('/checkout')
          return
        }
        
        const productIds = Array.from(new Set(orderAgainItems.map((item: any) => item.product_id)))
        const orderNow = new Date().toISOString()

        // Fetch products and discounts in parallel with addresses
        const [productsResult, orderDiscountsResult, addressResult] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants')
            .in('id', productIds),
          supabase
            .from('discount_products')
            .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
            .eq('is_active', true)
            .eq('discounts.is_active', true)
            .lte('discounts.start_date', orderNow)
            .gte('discounts.end_date', orderNow)
            .in('product_id', productIds),
          addressPromise,
        ])

        if (productsResult.error || !productsResult.data || productsResult.data.length === 0) {
          toast.error('Products not found')
          sessionStorage.removeItem('orderAgainItems')
          router.push('/checkout')
          return
        }

        const productMap = new Map(productsResult.data.map((p: any) => [p.id, p]))

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

        setCartItems(orderAgainCartItems)
        setIsBuyNow(true)
        
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

        // Process address result
        if (addressResult.data) {
          const addresses = (addressResult.data as Address[]) || []
          setSavedAddresses(addresses)
          const defaultAddress = addresses.find((a: Address) => a.is_default)
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id)
          } else if (addresses.length > 0) {
            setSelectedAddressId(addresses[0].id)
          }
        }
      } else if (buyNowItemsStr && isBuyNowFlow) {
        const buyNowItems = JSON.parse(buyNowItemsStr)
        
        if (!Array.isArray(buyNowItems) || buyNowItems.length === 0) {
          toast.error('Invalid buy now data')
          sessionStorage.removeItem('buyNowItems')
          router.push('/checkout')
          return
        }
        
        const productId = buyNowItems[0].product_id
        const buyNowNow = new Date().toISOString()

        // Fetch product, discounts, and addresses in parallel
        const [productResult, buyNowDiscountsResult, addressResult] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants, tax_enabled')
            .eq('id', productId)
            .single(),
          supabase
            .from('discount_products')
            .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
            .eq('is_active', true)
            .eq('discounts.is_active', true)
            .lte('discounts.start_date', buyNowNow)
            .gte('discounts.end_date', buyNowNow)
            .eq('product_id', productId),
          addressPromise,
        ])

        if (productResult.error || !productResult.data) {
          toast.error('Product not found')
          sessionStorage.removeItem('buyNowItems')
          router.push('/checkout')
          return
        }

        const typedProduct = productResult.data as any

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

        // Process address result
        if (addressResult.data) {
          const addresses = (addressResult.data as Address[]) || []
          setSavedAddresses(addresses)
          const defaultAddress = addresses.find((a: Address) => a.is_default)
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id)
          } else if (addresses.length > 0) {
            setSelectedAddressId(addresses[0].id)
          }
        }
      } else {
        // Regular cart flow - fetch cart, discounts, and addresses in parallel
        if (!session?.user) {
          setCartItems([])
        } else {
          const { data: cart, error: cartError } = await supabase
            .from('cart_items')
            .select(`
              *,
              product:products(name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants, tax_enabled)
            `)
            .eq('user_id', session.user.id)

          if (cartError) throw cartError

          if (!cart || cart.length === 0) {
            setCartItems([])
          } else {
            setCartItems(cart as any)
            
            // Fetch discounts and addresses in parallel (discounts depend on cart product IDs)
            const productIds = cart.map((item: any) => item.product_id)
            const now = new Date().toISOString()

            const [discountsResult, addressResult] = await Promise.all([
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
                .in('product_id', productIds),
              addressPromise,
            ])

            if (discountsResult.data && discountsResult.data.length > 0) {
              const discountMap = new Map<string, any>()
              discountsResult.data.forEach((d: any) => {
                const key = d.variant_id ? `${d.product_id}-${d.variant_id}` : d.product_id
                if (!discountMap.has(key) || d.discounted_price < discountMap.get(key).discounted_price) {
                  discountMap.set(key, d)
                }
              })
              setActiveDiscounts(discountMap)
            }

            // Process address result
            if (addressResult.data) {
              const addresses = (addressResult.data as Address[]) || []
              setSavedAddresses(addresses)
              const defaultAddress = addresses.find((a: Address) => a.is_default)
              if (defaultAddress) {
                setSelectedAddressId(defaultAddress.id)
              } else if (addresses.length > 0) {
                setSelectedAddressId(addresses[0].id)
              }
            }
          }
        }
      }

      // Defer public voucher fetch until after main UI is rendered
      requestIdleCallback(() => {
        fetchPublicVouchers()
      })

      setIsLoading(false)
    } catch (error: any) {
      console.error('Failed to initialize checkout:', error)
      toast.error('Failed to load checkout')
      setIsLoading(false)
    }
  }

  // Lightweight cart refetch — only fetches cart items and discounts, skips addresses/recommended/vouchers
  const refetchCartOnly = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: cart, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(name, slug, image_urls, price_usd, price_idr, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants, tax_enabled)
        `)
        .eq('user_id', session.user.id)

      if (cartError) throw cartError

      if (!cart || cart.length === 0) {
        setCartItems([])
        return
      }

      setCartItems(cart as any)

      // Fetch discounts for cart items
      const productIds = cart.map((item: any) => item.product_id)
      const now = new Date().toISOString()
      const { data: discountsData } = await supabase
        .from('discount_products')
        .select(`
          product_id,
          variant_id,
          discounted_price,
          discounts!inner(id, start_date, end_date, is_active)
        `)
        .eq('is_active', true)
        .eq('discounts.is_active', true)
        .lte('discounts.start_date', now)
        .gte('discounts.end_date', now)
        .in('product_id', productIds)

      if (discountsData && discountsData.length > 0) {
        const discountMap = new Map<string, any>()
        discountsData.forEach((d: any) => {
          const key = d.variant_id ? `${d.product_id}-${d.variant_id}` : d.product_id
          if (!discountMap.has(key) || d.discounted_price < discountMap.get(key).discounted_price) {
            discountMap.set(key, d)
          }
        })
        setActiveDiscounts(discountMap)
      }
    } catch (error: any) {
      console.error('Failed to refetch cart:', error)
    }
  }

  const fetchPublicVouchers = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('promo_codes')
        .select('id, name, code, discount_type, discount_value, min_purchase_amount, max_discount_amount, scope, valid_until')
        .eq('is_active', true)
        .eq('visibility', 'public')
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
      if (!error && data) {
        setPublicVouchers(data)
      }
    } catch (error) {
      console.error('Failed to fetch public vouchers:', error)
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
    
    debugLog('⚠️ [CHECKOUT] Pending order check disabled - always showing "Place Order"')
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
                debugLog('✅ [CHECKOUT] Found pending order:', order.order_number)
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
                debugLog('✅ [CHECKOUT] Found pending order:', order.order_number)
              }
            }
          })
      }
    } catch (error) {
      console.error('Error checking for pending order:', error)
    }
    */
  }

  const applyPromoCode = async (codeOverride?: string) => {
    const codeToApply = codeOverride?.trim() || promoCode.trim()
    if (!codeToApply) {
      toast.error('Please enter a promo code')
      return
    }

    setIsApplyingPromo(true)
    try {
      const allItems = [...cartItems, ...quickAddedItems]
      // Must use same price chain as displayed subtotal to avoid mismatch
      const itemsSubtotal = allItems.reduce((total, item) => {
        const basePrice = getBasePrice(item.product, (item as any).variant_sku)
        const salePrice = getEffectivePrice(basePrice, null)
        const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
        const price = discounted !== null ? discounted : salePrice
        return total + (price * item.quantity)
      }, 0)

      // Collect unique product IDs from cart for scope validation
      const productIds = Array.from(new Set(allItems.map(item => item.product_id)))

      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToApply.toUpperCase(),
          region_id: region?.id,
          cart_total: itemsSubtotal,
          shipping_cost: shipping || 0,
          product_ids: productIds,
        }),
      })

      const typedData = await response.json()

      if (typedData && typedData.is_valid) {
        if (appliedPromo && appliedPromo.code !== codeToApply.toUpperCase()) {
          toast(`Voucher replaced: ${codeToApply.toUpperCase()} is now active`, { icon: '🎫' })
        } else {
          toast.success(`Voucher applied: ${codeToApply.toUpperCase()}`)
        }
        setAppliedPromo(typedData)
        setDiscount(typedData.discount_amount || 0)
        setPromoCode(codeToApply.toUpperCase())
        // Persist so promo survives page refresh
        try {
          const dataToStore = { ...typedData, code: codeToApply.toUpperCase() }
          sessionStorage.setItem('checkout_applied_promo', JSON.stringify(dataToStore))
        } catch {
          // ignore storage errors
        }
      } else {
        const errorMsg = typedData?.error_message || 'Invalid promo code'
        toast.error(errorMsg)
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
    try { sessionStorage.removeItem('checkout_applied_promo') } catch {}
    toast.success('Promo code removed')
  }

  const handlePlaceOrder = async () => {
    debugLog('🚀 [ORDER] handlePlaceOrder called')
    
    // Validate cart quantities before proceeding
    if (!validateCartQuantities()) {
      return
    }
    
    // For guests, show modal to collect email and shipping info
    if (isGuest) {
      debugLog('👤 [ORDER] Guest user detected, showing checkout modal')
      setShowCheckoutModal(true)
      return
    }

    // For logged-in users, check if address is selected
    if (!selectedAddressId) {
      console.error('❌ [ORDER] No shipping address selected')
      toast.error('Please select a shipping address')
      return
    }

    debugLog('✅ [ORDER] Starting order placement for authenticated user')
    debugLog('📦 [ORDER] Cart items:', cartItems.length)
    debugLog('📍 [ORDER] Selected address ID:', selectedAddressId)
    
    setIsProcessing(true)
    try {
      // Get current user session
      debugLog('🔐 [ORDER] Getting user session...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('❌ [ORDER] No session found')
        toast.error('Please refresh the page')
        setIsProcessing(false)
        return
      }
      debugLog('✅ [ORDER] Session found, user ID:', session.user.id)

      // Check if this is a Buy Now or Order Again flow with items still in sessionStorage
      const buyNowItemsStr = sessionStorage.getItem('buyNowItems')
      const orderAgainItemsStr = sessionStorage.getItem('orderAgainItems')
      debugLog('🛒 [ORDER] Buy Now items in storage:', buyNowItemsStr ? 'Yes' : 'No')
      debugLog('🔄 [ORDER] Order Again items in storage:', orderAgainItemsStr ? 'Yes' : 'No')
      
      let sessionData
      
      // Only use manual session if buyNowItems/orderAgainItems exists AND we have temp cart items
      // After login, these items are cleared and items are in cart, so use regular flow
      const isBuyNowFlow = buyNowItemsStr && cartItems.length > 0 && cartItems[0].id?.startsWith('buy-now-temp')
      const isOrderAgainFlow = orderAgainItemsStr && cartItems.length > 0 && cartItems[0].id?.startsWith('order-again-temp')
      
      if (isBuyNowFlow || isOrderAgainFlow) {
        debugLog(`🎯 [ORDER] Using ${isBuyNowFlow ? 'Buy Now' : 'Order Again'} flow with manual cart snapshot`)
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
          
          subtotal += itemTotal
          
          return {
            product_id: item.product_id,
            quantity: quantity,
            price: price, // effective price per unit
            variant_name: itemWithVariant.variant_name,
            variant_sku: itemWithVariant.variant_sku,
            tax_enabled: (product as any).tax_enabled || false
          }
        })
        
        debugLog('📝 [ORDER] Creating manual checkout session...')
        debugLog('📦 [BUY NOW] Cart snapshot:', cartSnapshot)
        
        // Calculate tax only for taxable items in manual checkout
        const manualTaxableAmount = cartSnapshot.reduce((total: number, item: any) => {
          debugLog(`🔍 [BUY NOW] Tax check for product ${item.product_id}:`, {
            tax_enabled: item.tax_enabled,
            price: item.price,
            quantity: item.quantity
          })
          if (item.tax_enabled) {
            const itemAmount = item.price * item.quantity
            debugLog(`  ✅ [BUY NOW] Adding to taxable amount: ${itemAmount}`)
            return total + itemAmount
          }
          debugLog(`  ❌ [BUY NOW] Tax disabled, skipping`)
          return total
        }, 0)
        const manualTax = manualTaxableAmount * 0.1
        debugLog(`💰 [BUY NOW] Taxable amount: ${manualTaxableAmount}, Tax (10%): ${manualTax}`)
        const manualShipping = shippingCost ?? 0

        const sessionResponse = await fetch('/api/checkout/session/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.user.id,
            cart_snapshot: cartSnapshot,
            pricing_snapshot: {
              subtotal: subtotal,
              discount: discount, // manually applied promo code
              shipping: manualShipping,
              tax: manualTax,
              total: subtotal - discount + manualShipping + manualTax,
              currency_code: region?.currency_code || 'USD'
            }
          }),
        })
        
        sessionData = await sessionResponse.json()
        debugLog('📋 [ORDER] Manual session response:', sessionData)
        if (!sessionResponse.ok) {
          console.error('❌ [ORDER] Failed to create manual checkout session:', sessionData.error)
          throw new Error(sessionData.error || 'Failed to create checkout session')
        }
        debugLog('✅ [ORDER] Manual checkout session created:', sessionData.session_id)
      } else {
        // Regular cart flow: Create checkout session from cart
        // This includes Buy Now items that have been transferred to cart after login
        debugLog('🛍️ [ORDER] Using regular cart flow')
        debugLog('📝 [ORDER] Creating checkout session from cart...')
        
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
        
        // Use prefetched exchange rate, or fetch if not available
        let exchangeRate = null
        if (region?.currency_code && region.currency_code !== 'USD') {
          if (prefetchedExchangeRateRef.current !== null) {
            exchangeRate = prefetchedExchangeRateRef.current
          } else {
            try {
              const ratesResponse = await fetch('/api/exchange-rates')
              if (ratesResponse.ok) {
                const rates = await ratesResponse.json()
                if (rates[region.currency_code]) {
                  exchangeRate = 1 / rates[region.currency_code]
                }
              }
            } catch (error) {
              console.error('Failed to fetch exchange rates:', error)
            }
          }
        }

        const sessionResponse = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.user.id,
            currency_code: region?.currency_code,
            region_code: region?.code,
            item_discounts: itemDiscountsForSession,
            tax,
            exchange_rate: exchangeRate,
            shipping: shippingCost ?? 0,
          }),
        })

        sessionData = await sessionResponse.json()
        debugLog('📋 [ORDER] Session response:', sessionData)
        if (!sessionResponse.ok) {
          console.error('❌ [ORDER] Failed to create checkout session:', sessionData.error)
          throw new Error(sessionData.error || 'Failed to create checkout session')
        }
        debugLog('✅ [ORDER] Checkout session created:', sessionData.session_id)
      }

      // Update with shipping address
      debugLog('📦 [ORDER] Updating session with shipping address...')
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
      debugLog('✅ [ORDER] Session updated with shipping address')

      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)
      if (!selectedAddress) {
        throw new Error('Shipping address not found')
      }

      // Region used for currency/pricing only; gateway selection is controlled by CMS config
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

      // Resolve the payment gateway based on CMS config and region
      const activeGateway = resolveCheckoutGateway(region?.code, paymentGatewayConfig)
      debugLog('💳 [CHECKOUT] Resolved payment gateway:', activeGateway, 'for region:', region?.code)

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
          
          // Apply campaign discount first, then fall back to sale price
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const effectivePrice = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          
          return {
            id: item.product_id,
            name: itemName,
            price: convertToIDR(effectivePrice),
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
      debugLog('📍 [CHECKOUT] Saving shipping address to checkout session...')
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
        debugLog('✅ [CHECKOUT] Shipping address saved to checkout session')
      } catch (error) {
        console.error('❌ [CHECKOUT] Failed to save shipping address:', error)
        throw new Error('Failed to save shipping address')
      }

      // ⭐ STEP 1: Create order FIRST (before token generation)
      debugLog('📝 [ORDER] Creating order before payment...')
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
      debugLog('✅ [ORDER] Order created:', orderData.order_number)
      // Immediately reset cart badge
      window.dispatchEvent(new Event('cart-updated'))
      
      // Route to the configured payment gateway
      if (activeGateway === 'stripe') {
        debugLog('💳 [STRIPE] Creating Stripe checkout session...')
        const stripeCurrency = isIDRegion ? 'idr' : 'usd'
        
        // Compute Stripe line items ensuring they sum exactly to checkout total
        const rawStripeItems = cartItems.map(item => {
          const itemWithVariant = item as any
          let basePrice = isIDRegion && (item.product as any).price_idr
            ? (item.product as any).price_idr
            : (item.product as any).price_usd || 0
          
          if (itemWithVariant.variant_sku && (item.product as any).variants) {
            const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) {
              basePrice = isIDRegion ? variant.price_idr : variant.price_usd
            }
          }
          
          const discounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const price = discounted !== null ? discounted : basePrice
          const netPrice = price
          
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

        // Ensure sum of rounded items matches desired item total
        const roundedItemsTotal = roundedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const desiredItemsTotal = subtotal
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
            currency: stripeCurrency,
          }),
        })
        
        const stripeData = await stripeResponse.json()
        
        if (!stripeResponse.ok) {
          console.error('❌ [STRIPE] Failed to create checkout session:', stripeData.error)
          throw new Error(stripeData.error || 'Failed to create Stripe session')
        }
        
        debugLog('✅ [STRIPE] Redirecting to Stripe checkout...')
        setIsProcessing(false)
        window.location.href = stripeData.url
        return
      }

      // For PayPal gateway - show inline PayPal buttons
      if (activeGateway === 'paypal') {
        debugLog('💳 [PAYPAL] Preparing PayPal checkout...')
        const paypalCurrency = 'usd'
        const paypalItems = cartItems.map(item => {
          const itemWithVariant = item as any
          let basePrice = (item.product as any).price_usd || 0
          if (itemWithVariant.variant_sku && (item.product as any).variants) {
            const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) basePrice = variant.price_usd
          }
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const price = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          return {
            name: itemWithVariant.variant_name ? `${item.product.name} - ${itemWithVariant.variant_name}` : item.product.name,
            price: Math.round(price * 100) / 100,
            quantity: item.quantity,
          }
        })
        const paypalTotal = total
        setPaypalOrderData({
          orderId: orderData.order_id,
          amount: paypalTotal,
          currency: paypalCurrency,
          items: paypalItems,
          shippingCost: shipping,
        })
        setIsProcessing(false)
        return
      }
      
      // For Midtrans gateway
      debugLog('💳 [MIDTRANS] Processing payment via Midtrans...')
      
      // Check if this is a guest user
      const isGuest = session?.user?.is_anonymous
      debugLog('🔵 [DEBUG] Is guest user?', isGuest)
      debugLog('🔵 [DEBUG] Session:', session)

      // Check for existing pending order FIRST (applies to both guests and logged-in users)
      // This prevents duplicate inventory reservations
      if (orderData.is_existing) {
        debugLog('♻️ [ORDER] Reusing existing pending order')
        toast.info(t.checkout.continuingPendingOrder)

        // For guest orders, always redirect to tracking page
        if (isGuest) {
          const customerEmail = orderData.customer_email || ''
          const redirectUrl = '/track-order?order=' + orderData.order_number + '&email=' + encodeURI(customerEmail)
          debugLog('🔵 [GUEST REUSE] Redirecting guest to existing order tracking:', redirectUrl)
          setIsProcessing(false)
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 500)
          return
        }

        // For Stripe orders, reuse existing checkout session URL
        if (orderData.payment_gateway === 'stripe' && orderData.stripe_session_id) {
          debugLog('💳 [STRIPE] Reusing existing Stripe checkout session:', orderData.stripe_session_id)
          try {
            const response = await fetch(`/api/stripe/checkout-session/${orderData.stripe_session_id}`)
            const data = await response.json()
            if (data.url) {
              setIsProcessing(false)
              window.location.href = data.url
              return
            }
            console.error('❌ [STRIPE REUSE] No URL returned for existing session:', data)
          } catch (error) {
            console.error('❌ [STRIPE REUSE] Failed to retrieve existing session URL:', error)
          }
          // If reuse fails, fall through to create a new Stripe session below
        }
        
        // If reusing and has valid snap_token, use it directly
        if (orderData.snap_token && orderData.expiry_time) {
          const expiryDate = new Date(orderData.expiry_time)
          if (expiryDate > new Date()) {
            debugLog('✅ [ORDER] Reusing existing snap_token')
            
            // Logged-in users: open payment modal with existing token
            const redirectUrl = '/account/orders/' + orderData.order_id
            debugLog('🔵 [USER REUSE] Redirect URL for logged-in user:', redirectUrl)
            
            if (typeof window !== 'undefined' && (window as any).snap) {
              ;(window as any).snap.pay(orderData.snap_token, {
                onSuccess: (result: any) => {
                  debugLog('✅ [PAYMENT] Payment successful!', result)
                  toast.success('Payment successful! Processing your order...')
                  debugLog('🔄 [REDIRECT] Redirecting to:', redirectUrl)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                },
                onPending: (result: any) => {
                  debugLog('⏳ [PAYMENT] Payment pending', result)
                  toast.info('Payment pending. You can continue payment later.')
                  debugLog('🔄 [REDIRECT] Redirecting to:', redirectUrl)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                },
                onError: (result: any) => {
                  console.error('❌ [PAYMENT] Payment error', result)
                  toast.error('Payment failed. You can retry later.')
                  debugLog('🔄 [REDIRECT] Redirecting to:', redirectUrl)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                },
                onClose: () => {
                  debugLog('🚪 [PAYMENT] Payment modal closed by user')
                  toast.info(t.checkout.continuePaymentLater)
                  router.push(redirectUrl)
                  setIsProcessing(false)
                }
              })
              return // Exit early, no need to generate new token
            }
          } else {
            debugLog('⏰ [ORDER] Existing snap_token expired, generating new one')
          }
        }
      }
      
      // For NEW guest orders, redirect immediately to track-order page
      if (isGuest) {
        const customerEmail = orderData.customer_email || ''
        const redirectUrl = '/track-order?order=' + orderData.order_number + '&email=' + encodeURI(customerEmail)
        debugLog('🔵 [GUEST] Redirecting guest immediately to:', redirectUrl)
        toast.success('Order created! Redirecting to tracking page...')
        setIsProcessing(false)
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 500)
        return
      }

      // ⭐ STEP 2: Generate Midtrans token using order_number
      debugLog('💳 [ORDER] Creating Midtrans payment token...')
      debugLog('💰 [ORDER] Total amount (IDR):', convertToIDR(total))
      debugLog('📋 [ORDER] Selected Address:', selectedAddress)
      debugLog('📋 [ORDER] Full Name:', selectedAddress.full_name)
      debugLog('📋 [ORDER] Phone:', selectedAddress.phone)
      debugLog('📋 [ORDER] Email:', session.user.email)
      
      // Safely extract customer details with fallbacks
      const addressData = selectedAddress as any // Cast to any for fallback checks
      const fullName = selectedAddress.full_name || addressData.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Customer'
      const firstName = fullName.split(' ')[0] || 'Customer'
      const lastName = fullName.split(' ').slice(1).join(' ') || ''
      const phone = selectedAddress.phone || addressData.phone_number || session.user.user_metadata?.phone || '0000000000'
      
      debugLog('📋 [ORDER] Extracted - First Name:', firstName)
      debugLog('📋 [ORDER] Extracted - Last Name:', lastName)
      debugLog('📋 [ORDER] Extracted - Phone:', phone)
      debugLog('📦 [ORDER] Items for Midtrans:', itemsForMidtrans)
      debugLog('📦 [ORDER] Items count:', itemsForMidtrans?.length || 0)
      
      // Ensure items is always an array
      const safeItems = Array.isArray(itemsForMidtrans) && itemsForMidtrans.length > 0 
        ? itemsForMidtrans 
        : [{
            id: 'default',
            name: 'Order Items',
            price: convertToIDR(total),
            quantity: 1
          }]
      
      debugLog('📦 [ORDER] Safe Items:', safeItems)
      
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
      debugLog('🎫 [ORDER] Midtrans response:', midtransData)

      if (!midtransResponse.ok) {
        console.error('❌ [ORDER] Failed to create payment token:', midtransData.error)
        throw new Error(midtransData.error || 'Failed to create payment token')
      }
      debugLog('✅ [ORDER] Payment token created successfully')
      debugLog('📊 [TOKEN DEBUG] Midtrans token details:', {
        token_preview: midtransData.token?.substring(0, 20) + '...',
        token_length: midtransData.token?.length,
        has_redirect_url: !!midtransData.redirect_url,
        order_id: orderData.order_id
      })

      // ⭐ STEP 3: Save snap_token back to order
      debugLog('💾 [TOKEN DEBUG] Saving snap_token to order...')
      debugLog('📤 [TOKEN DEBUG] Update request payload:', {
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

      debugLog('📥 [TOKEN DEBUG] Update response status:', updateTokenResponse.status)

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
        debugLog('✅ [TOKEN DEBUG] snap_token saved successfully!', successData)
        debugLog('✅ [ORDER] snap_token saved to order')
      }

      // Guest users should have already been redirected earlier
      // This code only runs for logged-in users
      
      // Logged-in users: open payment modal here
      debugLog('🪟 [ORDER] Opening Midtrans payment modal for logged-in user...')
      const redirectUrl = '/account/orders/' + orderData.order_id
      debugLog('🔵 [USER] Redirect URL for logged-in user:', redirectUrl)
      
      if (typeof window !== 'undefined' && (window as any).snap) {
        ;(window as any).snap.pay(midtransData.token, {
          onSuccess: (result: any) => {
            debugLog('✅ [PAYMENT] Payment successful!', result)
            toast.success('Payment successful! Processing your order...')
            debugLog('🔄 [REDIRECT] Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            setIsProcessing(false)
          },
          onPending: (result: any) => {
            debugLog('⏳ [PAYMENT] Payment pending', result)
            toast.info('Payment pending. You can continue payment later.')
            debugLog('🔄 [REDIRECT] Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            setIsProcessing(false)
          },
          onError: (result: any) => {
            console.error('❌ [PAYMENT] Payment error', result)
            toast.error('Payment failed. You can retry later.')
            debugLog('🔄 [REDIRECT] Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            setIsProcessing(false)
          },
          onClose: () => {
            debugLog('🚪 [PAYMENT] Payment modal closed by user')
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
    debugLog('🚀 [GUEST] handleGuestCheckout called')
    
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

      debugLog('🔵 [GUEST] Session:', session)
      debugLog('🔵 [GUEST] Is anonymous?', session.user.is_anonymous)

      // Fetch DHL shipping cost for guest address
      debugLog('🚀 [GUEST] Fetching shipping cost for guest address...')
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
      const guestTotal = subtotal + guestShipping + tax - discount
      const pricing_snapshot = {
        subtotal,
        discount,
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

      debugLog('✅ [GUEST] Checkout session created:', sessionData.session_id)

      // ⭐ STEP 1: Create order FIRST (before token generation) - ORDER-FIRST ARCHITECTURE
      debugLog('📝 [GUEST] Creating order before payment...')
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

      debugLog('✅ [GUEST] Order created:', orderData.order_number)
      debugLog('🔵 [GUEST] Order data:', orderData)
      // Immediately reset cart badge
      window.dispatchEvent(new Event('cart-updated'))

      // Resolve the payment gateway for this guest based on CMS config
      const guestIsIDRegion = region?.code === 'ID'
      const guestActiveGateway = resolveCheckoutGateway(region?.code, paymentGatewayConfig)
      debugLog('💳 [GUEST CHECKOUT] Resolved gateway:', guestActiveGateway, 'for region:', region?.code)

      // Persist guest order info for tracking/continue payment
      const orderInfo = JSON.stringify({
        order_number: orderData.order_number,
        customer_email: guestData.email
      })
      sessionStorage.setItem('guestOrderInfo', orderInfo)
      localStorage.setItem('guestOrderInfo', orderInfo)
      
      const orderHistoryItem = {
        order_number: orderData.order_number,
        customer_email: guestData.email,
        created_at: new Date().toISOString()
      }
      const existingHistory = localStorage.getItem('orderHistory')
      let orderHistory = existingHistory ? JSON.parse(existingHistory) : []
      const orderExists = orderHistory.some((o: any) => o.order_number === orderData.order_number)
      if (!orderExists) {
        orderHistory.unshift(orderHistoryItem)
        orderHistory = orderHistory.slice(0, 10)
        localStorage.setItem('orderHistory', JSON.stringify(orderHistory))
        debugLog('📚 [GUEST] Order added to session history')
      }

      // Stripe path for guests
      if (guestActiveGateway === 'stripe') {
        debugLog('💳 [GUEST STRIPE] Creating Stripe checkout session...')
        const stripeCurrency = guestIsIDRegion ? 'idr' : 'usd'

        const rawStripeItems = [...cartItems, ...quickAddedItems].map(item => {
          const itemWithVariant = item as any
          let basePrice = guestIsIDRegion && (item.product as any).price_idr
            ? (item.product as any).price_idr
            : (item.product as any).price_usd || 0
          if (itemWithVariant.variant_sku && (item.product as any).variants) {
            const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) {
              basePrice = guestIsIDRegion ? variant.price_idr : variant.price_usd
            }
          }
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const price = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          return {
            name: itemWithVariant.variant_name ? `${item.product.name} - ${itemWithVariant.variant_name}` : item.product.name,
            price: Math.round(price * 100) / 100,
            quantity: item.quantity,
            variant_name: itemWithVariant.variant_name,
            image_url: item.product.image_urls?.[0],
          }
        })

        const stripeResponse = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.order_id,
            customerEmail: guestData.email,
            customerName: guestData.full_name,
            items: rawStripeItems,
            shippingCost: guestShipping,
            totalAmount: guestTotal,
            currency: stripeCurrency,
          }),
        })

        const stripeData = await stripeResponse.json()
        if (!stripeResponse.ok) {
          console.error('❌ [GUEST STRIPE] Failed to create checkout session:', stripeData.error)
          throw new Error(stripeData.error || 'Failed to create Stripe session')
        }
        debugLog('✅ [GUEST STRIPE] Redirecting to Stripe checkout...')
        setIsProcessing(false)
        window.location.href = stripeData.url
        return
      }

      // PayPal path for guests
      if (guestActiveGateway === 'paypal') {
        debugLog('💳 [GUEST PAYPAL] Preparing PayPal checkout...')
        const paypalItems = [...cartItems, ...quickAddedItems].map(item => {
          const itemWithVariant = item as any
          let basePrice = (item.product as any).price_usd || 0
          if (itemWithVariant.variant_sku && (item.product as any).variants) {
            const variant = (item.product as any).variants.find((v: any) => v.sku === itemWithVariant.variant_sku)
            if (variant) basePrice = variant.price_usd
          }
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, itemWithVariant.variant_name)
          const price = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          return {
            name: itemWithVariant.variant_name ? `${item.product.name} - ${itemWithVariant.variant_name}` : item.product.name,
            price: Math.round(price * 100) / 100,
            quantity: item.quantity,
          }
        })
        setPaypalOrderData({
          orderId: orderData.order_id,
          amount: guestTotal,
          currency: 'usd',
          items: paypalItems,
          shippingCost: guestShipping,
        })
        setIsProcessing(false)
        return
      }

      // If order already has snap_token and it's not expired, reuse it
      if (orderData.snap_token && orderData.expiry_time) {
        const expiryDate = new Date(orderData.expiry_time)
        if (expiryDate > new Date()) {
          debugLog('✅ [GUEST] Reusing existing snap_token')

          if (typeof window !== 'undefined' && (window as any).snap) {
            ;(window as any).snap.pay(orderData.snap_token, {
              onSuccess: (result: any) => {
                debugLog('✅ [PAYMENT] Payment successful!', result)
                toast.success('Payment successful! Processing your order...')
                window.location.href = '/track-order'
              },
              onPending: (result: any) => {
                debugLog('⏳ [PAYMENT] Payment pending', result)
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
                debugLog('🚪 [PAYMENT] Payment modal closed by user')
                toast.info('You can continue payment anytime from the order tracking page')
                window.location.href = '/track-order'
                setIsProcessing(false)
              }
            })
            return
          }
        }
      }

      // Generate new Midtrans token for guest
      debugLog('💳 [GUEST] Generating new Midtrans token...')
      
      const USD_TO_IDR = 15000
      const convertToIDR = (amount: number) => {
        if (guestIsIDRegion) {
          return Math.round(amount)
        }
        return Math.round(amount * USD_TO_IDR)
      }

      const itemsForMidtrans = [
        ...[...cartItems, ...quickAddedItems].map(item => {
          const basePrice = getBasePrice(item.product, (item as any).variant_sku)
          const itemName = (item as any).variant_name || item.product.name
          const campaignDiscounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
          const effectivePrice = campaignDiscounted !== null ? campaignDiscounted : getEffectivePrice(basePrice, null)
          
          return {
            id: item.product_id,
            name: itemName,
            price: convertToIDR(effectivePrice),
            quantity: item.quantity,
          }
        }),
        {
          id: 'shipping',
          name: 'Shipping Fee',
          price: convertToIDR(guestShipping),
          quantity: 1,
        },
        ...(tax > 0 ? [{
          id: 'tax',
          name: 'Tax (10%)',
          price: convertToIDR(tax),
          quantity: 1,
        }] : [])
      ]

      const midtransResponse = await fetch('/api/midtrans/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.order_number,
          amount: convertToIDR(guestTotal),
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

      const midtransData = await midtransResponse.json()
      if (!midtransResponse.ok) {
        console.error('❌ [GUEST] Midtrans token creation failed:', midtransData)
        throw new Error(midtransData.error || 'Failed to create payment token')
      }

      await fetch('/api/orders/update-snap-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          snap_token: midtransData.token,
          snap_redirect_url: midtransData.redirect_url,
        }),
      })

      if (typeof window !== 'undefined' && (window as any).snap) {
        ;(window as any).snap.pay(midtransData.token, {
          onSuccess: (result: any) => {
            debugLog('✅ [PAYMENT] Payment successful!', result)
            toast.success('Payment successful! Processing your order...')
            window.location.href = '/track-order'
          },
          onPending: (result: any) => {
            debugLog('⏳ [PAYMENT] Payment pending', result)
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
            debugLog('🚪 [PAYMENT] Payment modal closed by user')
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

  // Fetch shipping cost when address is selected (debounced to avoid rapid API calls)
  useEffect(() => {
    if (!selectedAddressId || savedAddresses.length === 0 || !region) return
    const timer = setTimeout(() => {
      fetchShippingCost()
    }, 400)
    return () => clearTimeout(timer)
  }, [selectedAddressId, region])

  const fetchShippingCost = async (address?: any): Promise<number | null> => {
    setIsLoadingShipping(true)
    try {
      const targetAddress = address || savedAddresses.find(a => a.id === selectedAddressId)
      if (!targetAddress) {
        debugLog('⚠️ [SHIPPING] No address available for rate calculation')
        setShippingCost(null)
        return null
      }

      debugLog('🚀 [SHIPPING] Fetching DHL rates for address:', targetAddress.city, targetAddress.postal_code)

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
        if (data.dhlDetail) console.error('❌ [SHIPPING] DHL detail:', data.dhlDetail)
        // Keep as null so UI shows "Calculated at checkout" instead of "FREE"
        setShippingCost(null)
        return null
      }

      // Pick the cheapest rate
      const cheapest = data.rates.reduce((min: any, r: any) => r.totalPrice < min.totalPrice ? r : min, data.rates[0])
      debugLog('✅ [SHIPPING] Cheapest DHL rate:', cheapest.serviceType, cheapest.totalPrice, cheapest.currency)

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
        debugLog('💱 [SHIPPING] Converted', dhlPrice, 'IDR →', convertedShipping.toFixed(2), 'USD')
      } else if (dhlCurrency === 'USD' && isIDRegion) {
        convertedShipping = dhlPrice * USD_TO_IDR
        debugLog('💱 [SHIPPING] Converted', dhlPrice, 'USD →', convertedShipping.toFixed(0), 'IDR')
      } else {
        debugLog('💱 [SHIPPING] No conversion needed:', dhlPrice, dhlCurrency)
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
  const allItems = useMemo(() => [...cartItems, ...quickAddedItems], [cartItems, quickAddedItems])
  
  // Helper to convert USD to local currency (matches formatPrice logic)
  const convertToLocalCurrency = useCallback((usdAmount: number): number => {
    const currencyCode = region?.currency_code || currency
    if (currencyCode === 'USD') return usdAmount
    if (currencyCode === 'IDR') return usdAmount // IDR prices are pre-converted
    const formatted = formatPrice(usdAmount, currencyCode)
    const numericValue = parseFloat(formatted.replace(/[^0-9.-]+/g, ''))
    return isNaN(numericValue) ? usdAmount : numericValue
  }, [region?.currency_code, currency])
  
  const subtotal = useMemo(() => allItems.reduce((total, item) => {
    const basePrice = getBasePrice(item.product, (item as any).variant_sku)
    const salePrice = getEffectivePrice(basePrice, null)
    const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
    const price = discounted !== null ? discounted : salePrice
    return total + (price * item.quantity)
  }, 0), [allItems, region, activeDiscounts])

  const shipping = shippingCost ?? 0
  
  const tax = useMemo(() => {
    const taxableAmount = cartItems.reduce((total, item) => {
      const product = item.product as any
      if (product.tax_enabled) {
        const basePrice = getBasePrice(product, (item as any).variant_sku)
        const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
        const price = discounted !== null ? discounted : basePrice
        return total + (price * item.quantity)
      }
      return total
    }, 0)
    return Math.round(taxableAmount * 0.1 * 100) / 100
  }, [cartItems, region, activeDiscounts])

  const total = useMemo(() => 
    Math.round((subtotal + shipping + tax - discount) * 100) / 100,
  [subtotal, shipping, tax, discount])
  
  const displaySubtotal = useMemo(() => allItems.reduce((total, item) => {
    const basePrice = getBasePrice(item.product, (item as any).variant_sku)
    const salePrice = getEffectivePrice(basePrice, null)
    const discounted = getDiscountedPrice(item.product, item.product_id, (item as any).variant_name)
    const priceUSD = discounted !== null ? discounted : salePrice
    const itemTotalUSD = priceUSD * item.quantity
    const priceLocal = convertToLocalCurrency(itemTotalUSD)
    return total + priceLocal
  }, 0), [allItems, region, activeDiscounts, convertToLocalCurrency])
  
  const displayShipping = useMemo(() => Math.round(convertToLocalCurrency(shipping) * 100) / 100, [shipping, convertToLocalCurrency])
  const displayTax = useMemo(() => Math.round(convertToLocalCurrency(tax) * 100) / 100, [tax, convertToLocalCurrency])
  const displayDiscount = useMemo(() => Math.round(convertToLocalCurrency(discount) * 100) / 100, [discount, convertToLocalCurrency])
  const displayTotal = useMemo(() => Math.round((displaySubtotal + displayShipping + displayTax - displayDiscount) * 100) / 100,
  [displaySubtotal, displayShipping, displayTax, displayDiscount])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white font-montserrat">
        {/* Hero Header Skeleton */}
        <div className="border-b border-border/40 bg-luxury-gray-light py-10 md:py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Left column skeleton */}
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3 w-1/3 bg-gray-200 rounded" />
                      <div className="h-4 w-1/4 bg-gray-200 rounded mt-4" />
                    </div>
                  </div>
                </div>
              ))}
              {/* Address skeleton */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse mt-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                <div className="h-20 w-full bg-gray-100 rounded-lg" />
              </div>
            </div>
            {/* Right column skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse sticky top-4">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between"><div className="h-4 w-16 bg-gray-200 rounded" /><div className="h-4 w-20 bg-gray-200 rounded" /></div>
                  <div className="flex justify-between"><div className="h-4 w-16 bg-gray-200 rounded" /><div className="h-4 w-20 bg-gray-200 rounded" /></div>
                </div>
                <div className="h-px bg-gray-200 my-4" />
                <div className="flex justify-between"><div className="h-6 w-16 bg-gray-200 rounded" /><div className="h-6 w-28 bg-gray-200 rounded" /></div>
                <div className="h-12 w-full bg-gray-200 rounded-lg mt-6" />
              </div>
            </div>
          </div>
        </div>
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

      {/* Checkout Progress Indicator */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Step 1: Address */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
              selectedAddressId || isGuest
                ? 'bg-luxury-navy text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {selectedAddressId || isGuest ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : '1'}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              selectedAddressId || isGuest ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {t.checkout.stepAddress}
            </span>
          </div>
          {/* Connector */}
          <div className={`h-px w-8 sm:w-16 ${selectedAddressId || isGuest ? 'bg-luxury-navy' : 'bg-gray-200'}`} />
          {/* Step 2: Review */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
              allItems.length > 0
                ? 'bg-luxury-navy text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {allItems.length > 0 ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : '2'}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              allItems.length > 0 ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {t.checkout.stepReview}
            </span>
          </div>
          {/* Connector */}
          <div className={`h-px w-8 sm:w-16 ${isProcessing ? 'bg-luxury-navy' : 'bg-gray-200'}`} />
          {/* Step 3: Payment */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
              isProcessing
                ? 'bg-luxury-navy text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              isProcessing ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {t.checkout.stepPayment}
            </span>
          </div>
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
            <CartItemsList
              items={allItems}
              regionCode={region?.code}
              currency={currency}
              activeDiscounts={activeDiscounts}
              removeQuickItem={removeQuickItem}
              t={t}
            />


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
          <OrderSummary
            allItems={allItems}
            publicVouchers={publicVouchers}
            appliedPromo={appliedPromo}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            isApplyingPromo={isApplyingPromo}
            discount={discount}
            displaySubtotal={displaySubtotal}
            displayShipping={displayShipping}
            displayTax={displayTax}
            displayDiscount={displayDiscount}
            displayTotal={displayTotal}
            shippingCost={shippingCost}
            isLoadingShipping={isLoadingShipping}
            tax={tax}
            regionCurrency={region?.currency_code || currency}
            isGuest={isGuest}
            isProcessing={isProcessing}
            selectedAddressId={selectedAddressId || ''}
            savedAddresses={savedAddresses}
            pendingOrder={pendingOrder}
            onApplyPromo={applyPromoCode}
            onRemovePromo={removePromoCode}
            onPlaceOrder={handlePlaceOrder}
            onShowCheckoutModal={() => setShowCheckoutModal(true)}
            t={t}
          />

          {/* PayPal Inline Checkout */}
          {paypalOrderData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 154 40" className="h-7 w-auto" fill="none">
                      <path fill="#253B80" d="M23.5 8.2c-1.6-1.8-4.5-2.6-8.2-2.6H5.3c-.8 0-1.4.6-1.5 1.3L1.2 28.1c-.1.5.3 1 .8 1h5.7l1.4-9c0-.6.6-1.1 1.5-1.1h2.8c5.5 0 9.8-2.2 11-8.7v-.3c0-.1 0-.2-.1-.3-.2-1.2-.7-2.2-1.4-3z"/>
                      <path fill="#179BD7" d="M51.2 17.3c-.6 3.9-3.6 3.9-6.5 3.9h-1.7l1.2-7.4c.1-.5.5-.8 1-.8h.8c2 0 3.8 0 4.8 1.1.6.6.7 1.6.5 2.8z"/>
                    </svg>
                  </div>
                  <button
                    onClick={() => setPaypalOrderData(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Order Summary */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Order Summary</p>
                  <div className="space-y-2">
                    {paypalOrderData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate pr-2">
                          {item.name} <span className="text-gray-400">× {item.quantity}</span>
                        </span>
                        <span className="text-gray-900 font-medium whitespace-nowrap">
                          {formatPrice(item.price * item.quantity, 'USD')}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-900 font-medium">
                        {paypalOrderData.shippingCost > 0 ? formatPrice(paypalOrderData.shippingCost, 'USD') : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-luxury-navy">
                    {formatPrice(paypalOrderData.amount, 'USD')}
                  </span>
                </div>

                {/* PayPal Buttons */}
                <div className="px-6 py-5">
                  <p className="text-xs text-gray-500 text-center mb-3">
                    Click below to pay securely with PayPal
                  </p>
                  <PayPalCheckout
                    orderId={paypalOrderData.orderId}
                    amount={paypalOrderData.amount}
                    currency={paypalOrderData.currency}
                    items={paypalOrderData.items}
                    shippingCost={paypalOrderData.shippingCost}
                    onSuccess={(data) => {
                      setPaypalOrderData(null)
                      if (data.status === 'paid') {
                        toast.success('Payment successful! Processing your order...')
                        router.push('/account/orders/' + paypalOrderData.orderId)
                      } else if (data.status === 'pending') {
                        toast.info('Payment pending. You can complete it later.')
                        router.push('/track-order?order=' + paypalOrderData.orderId)
                      }
                    }}
                    onError={(error) => {
                      console.error('PayPal payment error:', error)
                      toast.error('PayPal payment failed. Please try again.')
                      setPaypalOrderData(null)
                    }}
                  />
                  <p className="text-[11px] text-gray-400 text-center mt-3">
                    Your payment is secured by PayPal encryption
                  </p>
                </div>
              </div>
            </div>
          )}
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
