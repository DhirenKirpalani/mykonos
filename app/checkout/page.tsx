'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Lock, MapPin, CheckCircle2, ShoppingBag, ChevronDown } from 'lucide-react'
import { CheckoutModal } from '@/components/CheckoutModal'
import { getEffectivePrice } from '@/lib/utils/pricing'
import { useCurrency } from '@/hooks/useCurrency'
import { formatPrice as formatCurrencyPrice } from '@/lib/utils/currency'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice as formatRegionPrice } from '@/lib/utils/region'
import { useLanguage } from '@/contexts/LanguageContext'

type CartItem = {
  id: string
  product_id: string
  quantity: number
  product: {
    name: string
    slug: string
    image_urls: string[]
    price_usd: number
    price_idr: number
    sale_price: number | null
    stock_quantity?: number
    min_purchase_quantity?: number | null
    max_purchase_quantity?: number | null
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
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [isBuyNow, setIsBuyNow] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [shippingCost, setShippingCost] = useState<number>(15)
  const [isLoadingShipping, setIsLoadingShipping] = useState(false)
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([])
  const [quickAddedItems, setQuickAddedItems] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [discount, setDiscount] = useState(0)
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [isRecommendedExpanded, setIsRecommendedExpanded] = useState(true)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
  })

  useEffect(() => {
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
    
    initializeCheckout()

    // Listen for cart updates only in cart flow (not buy now flow)
    const handleCartUpdate = async () => {
      console.log('🔔 [CHECKOUT] Received cart-updated event')
      // Only refetch if we're in cart flow, not buy now flow
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      
      console.log('🔍 [CHECKOUT] Is buy now flow?', isBuyNowFlow)
      
      if (!isBuyNowFlow) {
        console.log('🔄 [CHECKOUT] Refetching cart items...')
        // Small delay to ensure database has been updated
        await new Promise(resolve => setTimeout(resolve, 100))
        // Refetch cart items when cart is updated
        await initializeCheckout()
        console.log('✅ [CHECKOUT] Cart items refetched')
      } else {
        console.log('⚠️ [CHECKOUT] Skipping refetch (buy now flow)')
      }
    }
    window.addEventListener('cart-updated', handleCartUpdate)
    console.log('👂 [CHECKOUT] Event listener registered for cart-updated')

    // Listen for page visibility changes to refetch cart when navigating back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [CHECKOUT] Page became visible, refetching cart...')
        const urlParams = new URLSearchParams(window.location.search)
        const isBuyNowFlow = urlParams.get('buyNow') === 'true'
        if (!isBuyNowFlow) {
          initializeCheckout()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for focus events (when user returns to the tab/window)
    const handleFocus = () => {
      console.log('🎯 [CHECKOUT] Window focused, refetching cart...')
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      if (!isBuyNowFlow) {
        initializeCheckout()
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      // Cleanup script on unmount
      if (snapScript.parentNode) {
        snapScript.parentNode.removeChild(snapScript)
      }
      window.removeEventListener('cart-updated', handleCartUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const initializeCheckout = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('🔍 [CHECKOUT INIT] Session info:', {
        hasSession: !!session,
        userId: session?.user?.id,
        isAnonymous: session?.user?.is_anonymous
      })
      
      // Check if guest or logged-in user
      const guestUser = !session || session.user.is_anonymous === true
      setIsGuest(guestUser)

      // Check for Buy Now item in sessionStorage
      const buyNowItem = sessionStorage.getItem('buyNowItem')
      console.log('🔍 [CHECKOUT INIT] Buy now item in storage:', buyNowItem ? 'YES' : 'NO')
      
      // Check URL params to determine flow
      const urlParams = new URLSearchParams(window.location.search)
      const isBuyNowFlow = urlParams.get('buyNow') === 'true'
      console.log('🔍 [CHECKOUT INIT] Is buy now flow from URL?', isBuyNowFlow)
      
      // Clear buyNowItem if not in buy now flow to prevent interference
      if (buyNowItem && !isBuyNowFlow) {
        console.log('⚠️ [CHECKOUT INIT] Clearing stale buyNowItem from sessionStorage')
        sessionStorage.removeItem('buyNowItem')
      }
      
      if (buyNowItem && isBuyNowFlow) {
        // Handle Buy Now flow - fetch product details
        console.log('🛍️ [CHECKOUT INIT] Using BUY NOW flow')
        const buyNowData = JSON.parse(buyNowItem)
        
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, slug, image_urls, price_usd, price_idr, sale_price, stock_quantity, min_purchase_quantity, max_purchase_quantity')
          .eq('id', buyNowData.product_id)
          .single()

        if (productError || !product) {
          toast.error('Product not found')
          sessionStorage.removeItem('buyNowItem')
          router.push('/checkout')
          return
        }

        // Type assertion for product data
        const typedProduct = product as any

        // Create cart item structure for Buy Now
        const buyNowCartItem = {
          id: 'buy-now-temp',
          product_id: typedProduct.id,
          quantity: buyNowData.quantity,
          variant_name: buyNowData.variant_name || null,
          variant_sku: buyNowData.variant_sku || null,
          product: {
            name: typedProduct.name,
            slug: typedProduct.slug,
            image_urls: typedProduct.image_urls,
            price_usd: typedProduct.price_usd,
            price_idr: typedProduct.price_idr,
            sale_price: typedProduct.sale_price,
            variants: typedProduct.variants
          }
        }

        setCartItems([buyNowCartItem])
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
              product:products(name, slug, image_urls, price_usd, price_idr, sale_price, stock_quantity, min_purchase_quantity, max_purchase_quantity, variants)
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
        .select('id, name, slug, image_urls, price_usd, price_idr, sale_price, stock_quantity, min_purchase_quantity, max_purchase_quantity')
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
        .select('id, name, slug, image_urls, price_usd, price_idr, sale_price, stock_quantity, min_purchase_quantity, max_purchase_quantity')
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
        sale_price: number | null
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
            sale_price: typedProduct.sale_price
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
        const price = getEffectivePrice(basePrice, item.product.sale_price)
        return total + (price * item.quantity)
      }, 0)

      const { data, error } = await supabase
        .rpc('validate_promo_code', {
          p_code: promoCode.trim().toUpperCase(),
          p_cart_total: itemsSubtotal
        } as any)

      if (error) throw error

      const typedData = data as any

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

      // Check if this is a Buy Now flow with item still in sessionStorage
      const buyNowItem = sessionStorage.getItem('buyNowItem')
      console.log('🛒 [ORDER] Buy Now item in storage:', buyNowItem ? 'Yes' : 'No')
      
      let sessionData
      
      // Only use manual session if buyNowItem exists AND we have temp cart items
      // After login, buyNowItem is cleared and items are in cart, so use regular flow
      if (buyNowItem && cartItems.length > 0 && cartItems[0].id === 'buy-now-temp') {
        console.log('🎯 [ORDER] Using Buy Now flow with manual cart snapshot')
        // For Buy Now: Create checkout session with manual cart snapshot
        const buyNowData = JSON.parse(buyNowItem)
        const product = cartItems[0]?.product
        
        if (!product) {
          throw new Error('Product not found')
        }
        
        const basePrice = region?.code === 'ID' && (product as any).price_idr 
          ? (product as any).price_idr 
          : (product as any).price_usd || 0
        const price = getEffectivePrice(basePrice, product.sale_price)
        const quantity = buyNowData.quantity || 1
        const subtotal = price * quantity
        
        console.log('📝 [ORDER] Creating manual checkout session...')
        const sessionResponse = await fetch('/api/checkout/session/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.user.id,
            cart_snapshot: [{
              product_id: buyNowData.product_id,
              quantity: quantity,
              price: price
            }],
            pricing_snapshot: {
              subtotal,
              discount: 0,
              shipping: subtotal >= 100 ? 0 : 15,
              tax: subtotal * 0.1,
              total: subtotal + (subtotal >= 100 ? 0 : 15) + (subtotal * 0.1),
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
        const sessionResponse = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.user.id,
            currency_code: region?.currency_code,
            region_code: region?.code,
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

      // Create Midtrans payment token
      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)
      if (!selectedAddress) {
        throw new Error('Shipping address not found')
      }

      // Convert to IDR only if region is not Indonesia (prices already in IDR for ID region)
      const USD_TO_IDR = 15000 // Approximate exchange rate
      const isIDRegion = region?.code === 'ID'
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
          const basePrice = region?.code === 'ID' && (item.product as any).price_idr 
            ? (item.product as any).price_idr 
            : (item.product as any).price_usd || 0
          return {
            id: item.product_id,
            name: item.product.name,
            price: convertToIDR(getEffectivePrice(basePrice, item.product.sale_price)),
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
        // Add tax as a line item
        {
          id: 'tax',
          name: 'Tax (10%)',
          price: convertToIDR(tax),
          quantity: 1,
        }
      ]

      console.log('💳 [ORDER] Creating Midtrans payment token...')
      console.log('💰 [ORDER] Total amount (IDR):', convertToIDR(total))
      const midtransResponse = await fetch('/api/midtrans/create-token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          orderId: sessionData.session_id,
          amount: convertToIDR(total),
          customerDetails: {
            firstName: selectedAddress.full_name.split(' ')[0],
            lastName: selectedAddress.full_name.split(' ').slice(1).join(' '),
            email: session.user.email,
            phone: selectedAddress.phone,
          },
          items: itemsForMidtrans,
        }),
      })

      const midtransData = await midtransResponse.json()
      console.log('🎫 [ORDER] Midtrans response:', midtransData)

      if (!midtransResponse.ok) {
        console.error('❌ [ORDER] Failed to create payment token:', midtransData.error)
        throw new Error(midtransData.error || 'Failed to create payment token')
      }
      console.log('✅ [ORDER] Payment token created successfully')

      // Open Midtrans Snap modal
      console.log('🪟 [ORDER] Opening Midtrans payment modal...')
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(midtransData.token, {
          onSuccess: (result: any) => {
            // Payment successful - Midtrans will redirect to finish URL
            // The processing page will handle order completion
            console.log('✅ [PAYMENT] Payment successful!', result)
            console.log('🔄 [PAYMENT] Midtrans will redirect to callback URL')
            toast.success('Payment successful! Processing your order...')
          },
          onPending: (result: any) => {
            console.log('⏳ [PAYMENT] Payment pending', result)
            toast.info('Payment pending. Please complete your payment.')
            setIsProcessing(false)
          },
          onError: (result: any) => {
            console.error('❌ [PAYMENT] Payment error', result)
            toast.error('Payment failed. Please try again.')
            setIsProcessing(false)
          },
          onClose: () => {
            console.log('🚪 [PAYMENT] Payment modal closed by user')
            toast.info('Payment cancelled')
            setIsProcessing(false)
          }
        })
      } else {
        throw new Error('Midtrans Snap not loaded. Please refresh the page.')
      }
    } catch (error: any) {
      console.error('Place order error:', error)
      toast.error(error.message || 'Failed to place order')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGuestCheckout = async (guestData: any) => {
    setIsProcessing(true)
    try {
      // Convert to IDR only if region is not Indonesia (prices already in IDR for ID region)
      const USD_TO_IDR = 15000 // Approximate exchange rate
      const isIDRegion = region?.code === 'ID'
      const convertToIDR = (amount: number) => {
        // If already in IDR region, just round to whole number
        if (isIDRegion) {
          return Math.round(amount)
        }
        // Otherwise convert USD to IDR
        return Math.round(amount * USD_TO_IDR)
      }

      // Get current session (anonymous or authenticated)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No session found. Please refresh the page.')
      }

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
          return {
            product_id: item.product_id,
            quantity: item.quantity,
            price: getEffectivePrice(basePrice, item.product.sale_price)
          }
        })
        sessionPayload.items = itemsToCheckout
      }

      // Create checkout session
      const sessionResponse = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionPayload,
          currency_code: region?.currency_code,
          region_code: region?.code,
        }),
      })

      const sessionData = await sessionResponse.json()
      if (!sessionResponse.ok) {
        throw new Error(sessionData.error || 'Failed to create checkout session')
      }

      // Update with guest shipping info
      const updateResponse = await fetch('/api/checkout/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          customer_email: guestData.email,
          new_address: {
            full_name: guestData.full_name,
            phone: guestData.phone,
            address_line1: guestData.address_line1,
            address_line2: guestData.address_line2,
            city: guestData.city,
            state_province: guestData.state_province,
            postal_code: guestData.postal_code,
            country: guestData.country,
          },
          current_step: 1,
        }),
      })

      if (!updateResponse.ok) {
        const updateData = await updateResponse.json()
        throw new Error(updateData.error || 'Failed to update shipping info')
      }

      // Prepare items for Midtrans - include shipping and tax as line items
      const itemsForMidtrans = [
        ...[...cartItems, ...quickAddedItems].map(item => {
          const basePrice = getBasePrice(item.product, (item as any).variant_sku)
          const itemName = (item as any).variant_name 
            ? `${item.product.name} - ${(item as any).variant_name}`
            : item.product.name
          return {
            id: item.product_id,
            name: itemName,
            price: convertToIDR(getEffectivePrice(basePrice, item.product.sale_price)),
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
        // Add tax as a line item
        {
          id: 'tax',
          name: 'Tax (10%)',
          price: convertToIDR(tax),
          quantity: 1,
        }
      ]

      // Create Midtrans payment token
      const midtransResponse = await fetch('/api/midtrans/create-token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: sessionData.session_id,
          amount: convertToIDR(total),
          customerDetails: {
            firstName: guestData.full_name.split(' ')[0],
            lastName: guestData.full_name.split(' ').slice(1).join(' ') || guestData.full_name,
            email: guestData.email,
            phone: guestData.phone,
          },
          items: itemsForMidtrans,
        }),
      })

      const midtransData = await midtransResponse.json()

      if (!midtransResponse.ok) {
        throw new Error(midtransData.error || 'Failed to create payment token')
      }

      // Open Midtrans Snap modal
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(midtransData.token, {
          onSuccess: async (result: any) => {
            // Payment successful - complete the order
            toast.success('Payment successful! Processing your order...')
            
            try {
              const completeResponse = await fetch('/api/checkout/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  checkout_session_id: sessionData.session_id,
                  payment_method_type: 'midtrans',
                }),
              })

              const completeData = await completeResponse.json()

              if (completeResponse.ok && completeData.order_id) {
                sessionStorage.removeItem('buyNowItem')
                router.push(`/checkout/confirmation?order=${completeData.order_number}`)
              } else {
                throw new Error(completeData.error || 'Failed to place order')
              }
            } catch (error: any) {
              console.error('Order completion error:', error)
              toast.error('Payment successful but order completion failed. Please contact support.')
            }
          },
          onPending: (result: any) => {
            toast.info('Payment pending. Please complete your payment.')
            setIsProcessing(false)
          },
          onError: (result: any) => {
            toast.error('Payment failed. Please try again.')
            setIsProcessing(false)
          },
          onClose: () => {
            toast.info('Payment cancelled')
            setIsProcessing(false)
          }
        })
      } else {
        console.error('❌ [ORDER] Midtrans Snap not loaded')
        throw new Error('Midtrans Snap not loaded. Please refresh the page.')
      }
    } catch (error: any) {
      console.error('❌ [ORDER] Order placement failed:', error)
      console.error('❌ [ORDER] Error details:', error.message)
      toast.error(error.message || 'Failed to complete checkout')
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
      if (itemId === 'buy-now-temp') {
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
      if (itemId === 'buy-now-temp') {
        sessionStorage.removeItem('buyNowItem')
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
      })
      setIsEditingAddress(true)
    }
  }

  const handleSaveAddress = async () => {
    try {
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
        } as any)
        .eq('id', selectedAddressId)

      if (error) throw error

      // Update local state
      setSavedAddresses(prev =>
        prev.map(addr =>
          addr.id === selectedAddressId
            ? { ...addr, ...editForm }
            : addr
        )
      )

      setIsEditingAddress(false)
      toast.success('Address updated successfully')
    } catch (error: any) {
      console.error('Failed to update address:', error)
      toast.error('Failed to update address')
    }
  }

  // Fetch shipping cost when address is selected
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0) {
      fetchShippingCost()
    }
  }, [selectedAddressId])

  const fetchShippingCost = async () => {
    const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)
    if (!selectedAddress) return

    setIsLoadingShipping(true)
    try {
      // Calculate total weight (assuming 500g per item as default)
      const totalWeight = cartItems.reduce((sum, item) => sum + (item.quantity * 500), 0)

      const response = await fetch('/api/shipping/kirimaja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'Jakarta', // Default origin, should be from store settings
          destination: selectedAddress.city,
          weight: totalWeight,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.costs && data.costs.length > 0) {
          // Use the first shipping option
          setShippingCost(data.costs[0].cost)
        }
      }
    } catch (error) {
      console.error('Failed to fetch shipping cost:', error)
      // Keep default shipping cost on error
    } finally {
      setIsLoadingShipping(false)
    }
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

  // Combine cart items and quick-added items for total calculation
  const allItems = [...cartItems, ...quickAddedItems]
  
  const subtotal = allItems.reduce((total, item) => {
    const basePrice = getBasePrice(item.product, (item as any).variant_sku)
    const price = getEffectivePrice(basePrice, item.product.sale_price)
    return total + (price * item.quantity)
  }, 0)

  const shipping = subtotal >= 100 ? 0 : shippingCost
  const tax = subtotal * 0.1
  const total = subtotal + shipping + tax - discount

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm flex-wrap">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-500 transition-colors hover:text-gray-900"
              aria-label="Home"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            {cartItems.length > 0 && cartItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link
                  href={`/products/${item.product.slug}`}
                  className="text-gray-500 transition-colors hover:text-gray-900 truncate max-w-[150px]"
                  title={item.product.name}
                >
                  {item.product.name}
                </Link>
              </div>
            ))}
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-900" aria-current="page">
              Checkout
            </span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t.checkout.title} ({allItems.reduce((sum, item) => sum + item.quantity, 0)} {allItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? t.checkout.item : t.checkout.items})
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Free Shipping Progress Bar */}
            {subtotal < 100 && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-5 w-5 text-luxury-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {100 - subtotal > 0 
                      ? t.checkout.freeShipping.replace('{amount}', region ? formatRegionPrice(100 - subtotal, region) : formatCurrencyPrice(100 - subtotal, currency))
                      : t.checkout.qualifyFreeShipping}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-luxury-gold h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((subtotal / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cart Items */}
            {allItems.map((item) => {
              const basePrice = getBasePrice(item.product, (item as any).variant_sku)
              const price = getEffectivePrice(basePrice, item.product.sale_price)
              const hasDiscount = item.product.sale_price && item.product.sale_price < basePrice
              
              return (
                <div key={item.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={item.product.image_urls[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Details & Controls */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Product Name and Remove Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-sm sm:text-base text-gray-900 line-clamp-2 leading-tight">
                            {item.product.name}
                          </h3>
                          {(item as any).variant_name && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                              {(item as any).variant_name}
                            </p>
                          )}
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
                      <div className="flex items-center justify-between gap-3 mt-2">
                        <span className="text-sm sm:text-base text-gray-600">
                          Qty: {item.quantity}
                        </span>
                        <p className="text-sm sm:text-base font-bold text-gray-900">
                          {region ? formatRegionPrice(price * item.quantity, region) : formatCurrencyPrice(price * item.quantity, currency)}
                        </p>
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-full_name">{t.checkout.fullName} *</Label>
                        <Input
                          id="edit-full_name"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">{t.checkout.phone} *</Label>
                        <Input
                          id="edit-phone"
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit-address_line1">{t.checkout.addressLine1} *</Label>
                      <Input
                        id="edit-address_line1"
                        value={editForm.address_line1}
                        onChange={(e) => setEditForm({...editForm, address_line1: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-address_line2">{t.checkout.addressLine2}</Label>
                      <Input
                        id="edit-address_line2"
                        value={editForm.address_line2}
                        onChange={(e) => setEditForm({...editForm, address_line2: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-city">{t.checkout.city} *</Label>
                        <Input
                          id="edit-city"
                          value={editForm.city}
                          onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-state">{t.checkout.stateProvince} *</Label>
                        <Input
                          id="edit-state"
                          value={editForm.state_province}
                          onChange={(e) => setEditForm({...editForm, state_province: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-postal">{t.checkout.postalCode} *</Label>
                        <Input
                          id="edit-postal"
                          value={editForm.postal_code}
                          onChange={(e) => setEditForm({...editForm, postal_code: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-country">{t.checkout.country} *</Label>
                        <Input
                          id="edit-country"
                          value={editForm.country}
                          onChange={(e) => setEditForm({...editForm, country: e.target.value})}
                          required
                        />
                      </div>
                    </div>

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
                        className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light"
                      >
                        {t.checkout.saveChanges}
                      </Button>
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
                        <div>
                          <p className="font-medium text-gray-900">{address.full_name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state_province} {address.postal_code}
                          </p>
                          <p className="text-sm text-gray-600">{address.phone}</p>
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
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t.checkout.orderSummary}</h2>

              {/* Promo Code Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.checkout.promoCode}</h3>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">{appliedPromo.code}</p>
                      <p className="text-xs text-green-700">-{region ? formatRegionPrice(discount, region) : formatCurrencyPrice(discount, currency)} {t.checkout.discountApplied}</p>
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
                  <span className="font-medium text-gray-900">{region ? formatRegionPrice(subtotal, region) : formatCurrencyPrice(subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t.checkout.discount}</span>
                    <span className="font-medium">-{region ? formatRegionPrice(discount, region) : formatCurrencyPrice(discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t.checkout.shipping}</span>
                  <span className={`font-medium ${shipping === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {isLoadingShipping ? (
                      <span className="text-xs">{t.checkout.calculating}</span>
                    ) : shipping === 0 ? (
                      t.checkout.free
                    ) : (
                      region ? formatRegionPrice(shipping, region) : formatCurrencyPrice(shipping, currency)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t.checkout.tax}</span>
                  <span className="font-medium text-gray-900">{region ? formatRegionPrice(tax, region) : formatCurrencyPrice(tax, currency)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 mb-6 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">{t.checkout.total}</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-luxury-navy">{region ? formatRegionPrice(total, region) : formatCurrencyPrice(total, currency)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {allItems.reduce((sum, item) => sum + item.quantity, 0)} {allItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? t.checkout.item : t.checkout.items}
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkout Button - For both logged-in and guest users */}
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
                        <Lock className="h-5 w-5" />
                        {t.checkout.placeOrder} · {region ? formatRegionPrice(total, region) : formatCurrencyPrice(total, currency)}
                      </span>
                    )}
                  </Button>

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

                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      {t.checkout.haveAccount}{' '}
                      <a href="/login" className="text-luxury-navy hover:underline font-semibold">
                        {t.checkout.signIn}
                      </a>
                      {' '}{t.checkout.fasterCheckout}
                    </p>
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

      {/* Guest Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onSubmit={handleGuestCheckout}
      />
    </div>
  )
}
