'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package, Mail, MapPin, Calendar, Truck, CheckCircle2, Clock, UserPlus, LogIn } from 'lucide-react'
import { formatPrice } from '@/lib/utils/currency'
import { getCountryName } from '@/lib/utils/country'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline'
import { OrderDetailsModal } from '@/components/OrderDetailsModal'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

type OrderItem = {
  id: string
  product_id: string
  quantity: number
  price_at_purchase: number
  variant_name?: string | null
  variant_sku?: string | null
  product: {
    name: string
    image_urls: string[]
    variants?: Array<{
      name: string
      sku: string
      image_url?: string
    }>
  }
}

type Order = {
  id: string
  order_number: string
  status: string
  payment_status: string
  customer_email: string
  shipping_address: {
    full_name: string
    phone: string
    address_line1: string
    address_line2?: string
    city: string
    state_province: string
    postal_code: string
    country: string
  }
  total_amount: number
  currency_code: string
  created_at: string
  completed_at: string | null
  packed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  carrier_code?: string
  tracking_number?: string
  tracking_url?: string
  dhl_shipment_number?: string
  estimated_delivery_date?: string
  snap_token?: string
  stripe_session_id?: string
  stripe_payment_intent_id?: string
  expiry_time?: string
  payment_method_type?: string
  payment_gateway?: string
  order_items?: OrderItem[]
  payment_metadata?: {
    transaction_time?: string
    expiry_time?: string
    payment_type?: string
    channel?: string
    [key: string]: any
  }
}

export default function TrackOrderPage() {
  const { t, lang } = useTranslation()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [notFound, setNotFound] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [activeDiscounts, setActiveDiscounts] = useState<Map<string, number>>(new Map())

  // Helper function to translate order status
  const getTranslatedStatus = (status: string) => {
    const statusKey = status.toLowerCase().replace(/\s+/g, '_')
    return t(`trackOrder.statuses.${statusKey}`) || status
  }
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [sessionOrders, setSessionOrders] = useState<Order[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalOrder, setModalOrder] = useState<Order | null>(null)

  // Fetch active discounts whenever order changes
  useEffect(() => {
    if (!order?.order_items?.length) return
    const fetchDiscounts = async () => {
      const productIds = (order.order_items as any[]).map((i: any) => i.product_id).filter(Boolean)
      if (!productIds.length) return
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('discount_products')
        .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
        .eq('is_active', true)
        .eq('discounts.is_active', true)
        .lte('discounts.start_date', now)
        .gte('discounts.end_date', now)
        .in('product_id', productIds)
      if (data && data.length > 0) {
        const discMap = new Map<string, number>()

        // Build variant_id -> variant_name lookup from order items' product variants JSONB
        const variantIdToName = new Map<string, string>()
        ;(order.order_items as any[]).forEach((item: any) => {
          const variants: any[] = item.product?.variants || []
          variants.forEach((v: any) => {
            if (v.id && v.name) variantIdToName.set(v.id, v.name)
          })
        })

        data.forEach((d: any) => {
          if (!d.variant_id) {
            if (!discMap.has(d.product_id) || d.discounted_price < discMap.get(d.product_id)!) {
              discMap.set(d.product_id, d.discounted_price)
            }
          } else {
            const variantName = variantIdToName.get(d.variant_id)
            if (variantName) {
              const variantNameKey = `${d.product_id}-${variantName}`
              if (!discMap.has(variantNameKey) || d.discounted_price < discMap.get(variantNameKey)!) {
                discMap.set(variantNameKey, d.discounted_price)
              }
            }
            // Product-level fallback (lowest variant discount)
            if (!discMap.has(d.product_id) || d.discounted_price < discMap.get(d.product_id)!) {
              discMap.set(d.product_id, d.discounted_price)
            }
          }
        })
        setActiveDiscounts(discMap)
      }
    }
    fetchDiscounts()
  }, [order?.id])

  // Check for payment cancellation from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment_canceled') === 'true') {
      toast.info('Payment was canceled. You can continue payment anytime from your order.')
      // Clean up URL
      window.history.replaceState({}, '', '/track-order')
    }
  }, [])

  // Pre-fill email for authenticated (non-anonymous) users and lock the field
  useEffect(() => {
    if (user && !user.is_anonymous && user.email) {
      setEmail(user.email)
    }
  }, [user])

  // Load session order history on mount — deferred so the form renders first
  useEffect(() => {
    const loadSessionOrders = async () => {
      setLoadingHistory(true)
      
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        
        // If user is logged in (not anonymous)
        if (session && !session.user.is_anonymous) {
          const authenticatedEmail = session.user.email
          console.log('🔐 [SECURITY] User authenticated with email:', authenticatedEmail)
          
          // Clear localStorage if it contains orders from a different email
          const orderHistory = localStorage.getItem('orderHistory')
          if (orderHistory) {
            const orders = JSON.parse(orderHistory)
            if (orders.length > 0 && orders[0].customer_email !== authenticatedEmail) {
              console.log('🧹 [SECURITY] Clearing guest order history - email mismatch')
              localStorage.removeItem('orderHistory')
            }
          }
          
          // Fetch summary only — full detail loaded on-demand when user clicks
          const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, status, payment_status, total_amount, currency_code, created_at, customer_email, snap_token, stripe_session_id, stripe_payment_intent_id, expiry_time, payment_metadata, shipping_address')
            .eq('customer_email', authenticatedEmail)
            .order('created_at', { ascending: false })
            .limit(5)
          
          if (error) {
            console.error('Error fetching orders:', error)
          } else if (data) {
            setSessionOrders(data as Order[])
            console.log('✅ [ORDER HISTORY] Loaded', data.length, 'orders for authenticated user')
          }
        } else {
          // Guest user - load from localStorage
          const orderHistory = localStorage.getItem('orderHistory')
          let mostRecentEmail: string | null = null
          
          if (orderHistory) {
            const orders = JSON.parse(orderHistory)
            
            // 🔒 SECURITY: Get the most recent order's email
            if (orders.length > 0) {
              mostRecentEmail = orders[0].customer_email
              
              // 🔒 SECURITY: Filter out orders from different emails
              const filteredOrders = orders.filter((o: any) => o.customer_email === mostRecentEmail)
              
              // If we filtered out orders, update localStorage
              if (filteredOrders.length !== orders.length) {
                console.log('🧹 [SECURITY] Removing orders from different emails. Before:', orders.length, 'After:', filteredOrders.length)
                localStorage.setItem('orderHistory', JSON.stringify(filteredOrders))
              }
            }
          }
          
          // If we have an email, fetch ALL orders for that email from database
          if (mostRecentEmail) {
            console.log('📚 [ORDER HISTORY] Fetching guest orders for:', mostRecentEmail)
            
            // Fetch summary only — full detail loaded on-demand when user clicks
            const { data, error } = await supabase
              .from('orders')
              .select('id, order_number, status, payment_status, total_amount, currency_code, created_at, customer_email, snap_token, stripe_session_id, stripe_payment_intent_id, expiry_time, payment_metadata, shipping_address')
              .eq('customer_email', mostRecentEmail)
              .order('created_at', { ascending: false })
              .limit(5)
            
            if (error) {
              console.error('Error fetching orders:', error)
            } else if (data) {
              setSessionOrders(data as Order[])
              console.log('✅ [ORDER HISTORY] Loaded', data.length, 'guest orders from database')
            }
          } else {
            console.log('⚠️ [ORDER HISTORY] No email found in localStorage')
          }
        }
        
        setLoadingHistory(false)
      } catch (error) {
        console.error('Error loading order history:', error)
        setLoadingHistory(false)
      }
    }
    
    // Defer so the search form renders on first paint before hitting the DB
    const timer = setTimeout(loadSessionOrders, 50)
    return () => clearTimeout(timer)
  }, [])

  // Auto-load order from localStorage or sessionStorage on mount
  useEffect(() => {
    // First check sessionStorage (from checkout redirect)
    let guestOrderInfo = sessionStorage.getItem('guestOrderInfo')
    let fromSession = true
    
    // If not in sessionStorage, check localStorage (persistent)
    if (!guestOrderInfo) {
      guestOrderInfo = localStorage.getItem('guestOrderInfo')
      fromSession = false
    }
    
    if (guestOrderInfo) {
      try {
        const { order_number, customer_email } = JSON.parse(guestOrderInfo)
        
        if (order_number && customer_email) {
          console.log('🔄 [AUTO-LOAD] Found saved order info, auto-loading...', {
            order_number,
            from: fromSession ? 'sessionStorage' : 'localStorage'
          })
          
          setEmail(customer_email)
          setOrderNumber(order_number)
          
          // Auto-search for the order immediately
          const autoSearch = async () => {
            setIsSearching(true)
            setNotFound(false)
            setOrder(null)

            try {
              const res = await fetch(
                `/api/orders/track?email=${encodeURIComponent(customer_email)}&order_number=${encodeURIComponent(order_number)}`
              )
              const json = await res.json()

              if (!res.ok || !json.order) {
                console.error('❌ [AUTO-LOAD] Order not found', { order_number, customer_email })
                setNotFound(true)
                // Don't show error toast for auto-load, just clear localStorage
                if (!fromSession) {
                  localStorage.removeItem('guestOrderInfo')
                  console.log('🗑️ [AUTO-LOAD] Cleared invalid order from localStorage')
                }
              } else {
                console.log('✅ [AUTO-LOAD] Order loaded successfully')
                setOrder(json.order as Order)
                // Clear sessionStorage after successful load (but keep localStorage)
                if (fromSession) {
                  sessionStorage.removeItem('guestOrderInfo')
                }
                // Show create account option for all guest orders
                if (!user) {
                  setShowCreateAccount(true)
                }
              }
            } catch (error) {
              console.error('❌ [AUTO-LOAD] Failed to fetch order:', error)
              setNotFound(true)
            } finally {
              setIsSearching(false)
            }
          }

          autoSearch()
        }
      } catch (error) {
        console.error('Error parsing guest order info:', error)
        localStorage.removeItem('guestOrderInfo')
      }
    }
  }, [user])

  // Real-time polling for payment status updates
  useEffect(() => {
    if (!order || !order.order_number || !order.customer_email) {
      return
    }

    // Poll for any status changes (payment status OR order status)
    const shouldPoll = ['pending', 'expired', 'failed'].includes(order.payment_status) || 
                       ['pending_payment', 'processing', 'packed', 'shipped'].includes(order.status)
    if (!shouldPoll) {
      return
    }

    console.log('🔄 [POLLING] Starting real-time status polling for order:', order.order_number, 'Payment:', order.payment_status, 'Order:', order.status)

    const pollInterval = setInterval(async () => {
      try {
        console.log('🔍 [POLLING] Checking order status...')
        const { data, error } = await supabase
          .from('orders')
          .select('payment_status, status, snap_token, stripe_session_id, stripe_payment_intent_id, expiry_time, payment_metadata, packed_at, shipped_at, tracking_number, tracking_url, carrier_code')
          .eq('order_number', order.order_number)
          .eq('customer_email', order.customer_email)
          .single()

        if (!error && data) {
          console.log('📊 [POLLING] Fetched data:', {
            payment_status: data.payment_status,
            status: data.status,
            has_metadata: !!data.payment_metadata
          })

          // Check if payment status OR order status has changed
          if (data.payment_status !== order.payment_status || data.status !== order.status) {
            console.log('🔔 [POLLING] Status changed:', {
              old_payment: order.payment_status,
              new_payment: data.payment_status,
              old_status: order.status,
              new_status: data.status,
              order_number: order.order_number
            })
            
            // Update the order with new status
            setOrder(prev => prev ? { ...prev, ...data } : null)
            
            // Show notification based on new status
            if (data.payment_status === 'paid') {
              toast.success(t('trackOrder.paymentSuccessful'))
            } else if (data.payment_status === 'expired') {
              toast.error(lang === 'id' ? 'Pembayaran telah kadaluarsa. Silakan hubungi dukungan untuk tautan pembayaran baru.' : 'Payment has expired. Please contact support for a new payment link.')
            } else if (data.payment_status === 'failed') {
              toast.error(t('trackOrder.paymentFailed'))
            }
          } else {
            console.log('✓ [POLLING] No status change detected')
          }
        } else if (error) {
          console.error('❌ [POLLING] Error fetching order:', error)
        }
      } catch (error) {
        console.error('❌ [POLLING] Error fetching order status:', error)
      }
    }, 5000) // Poll every 5 seconds for faster updates

    // Cleanup interval on unmount or when order changes
    return () => {
      console.log('🛑 [POLLING] Stopping payment status polling')
      clearInterval(pollInterval)
    }
  }, [order?.order_number, order?.customer_email, order?.payment_status])

  // Real-time countdown timer
  useEffect(() => {
    if (!order) return

    const expiryTime = order.payment_metadata?.expiry_time || order.expiry_time
    if (!expiryTime) return

    const updateCountdown = () => {
      const now = new Date()
      const expiry = new Date(expiryTime)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining(t('trackOrder.timeUnits.expired'))
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeRemaining(`${hours}${t('trackOrder.timeUnits.hours')} ${minutes}${t('trackOrder.timeUnits.minutes')} ${seconds}${t('trackOrder.timeUnits.seconds')}`)
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [order?.payment_metadata?.expiry_time, order?.expiry_time, t])

  const handleContinuePayment = async (orderToUse?: Order) => {
    const currentOrder = orderToUse || order
    
    console.log('🔵 [PAYMENT DEBUG] handleContinuePayment called')
    console.log('📦 [PAYMENT DEBUG] Order data:', {
      order_id: currentOrder?.id,
      order_number: currentOrder?.order_number,
      payment_status: currentOrder?.payment_status,
      snap_token: currentOrder?.snap_token ? 'exists' : 'missing',
      stripe_session_id: (currentOrder as any)?.stripe_session_id ? 'exists' : 'missing',
      expiry_time: currentOrder?.expiry_time,
      has_payment_metadata: !!currentOrder?.payment_metadata
    })

    if (!currentOrder) {
      console.error('❌ [PAYMENT DEBUG] No order found')
      toast.error('Unable to continue payment. Please contact support.')
      return
    }

    // Check if this is a Stripe order (non-ID region)
    const stripeSessionId = (currentOrder as any)?.stripe_session_id
    if (stripeSessionId) {
      console.log('💳 [STRIPE] Detected Stripe order, redirecting to Stripe checkout...')
      
      // Redirect to Stripe checkout
      try {
        const response = await fetch(`/api/stripe/checkout-session/${stripeSessionId}`)
        const data = await response.json()
        
        if (data.url) {
          window.location.href = data.url
        } else {
          toast.error('Unable to continue payment. Please contact support.')
        }
      } catch (error) {
        console.error('❌ [STRIPE] Failed to get checkout URL:', error)
        toast.error('Unable to continue payment. Please contact support.')
      }
      return
    }

    // For Midtrans orders (ID region), validate snap_token exists
    if (!currentOrder.snap_token) {
      console.error('❌ [PAYMENT DEBUG] snap_token is missing!', {
        order_id: currentOrder.id,
        order_number: currentOrder.order_number,
        payment_status: currentOrder.payment_status,
        created_at: currentOrder.created_at,
        time_since_creation: currentOrder.created_at ? 
          `${Math.round((new Date().getTime() - new Date(currentOrder.created_at).getTime()) / 1000 / 60)} minutes` : 
          'unknown'
      })
      toast.error('Payment token is missing. Please contact support to generate a new payment link.')
      return
    }

    console.log('✅ [PAYMENT DEBUG] snap_token exists:', currentOrder.snap_token.substring(0, 20) + '...')

    // Check if token is expired
    if (currentOrder.expiry_time && new Date(currentOrder.expiry_time) < new Date()) {
      const expiryDate = new Date(currentOrder.expiry_time)
      const now = new Date()
      const hoursExpired = Math.round((now.getTime() - expiryDate.getTime()) / 1000 / 60 / 60)
      
      console.error('❌ [PAYMENT DEBUG] Token expired!', {
        expiry_time: currentOrder.expiry_time,
        current_time: now.toISOString(),
        hours_expired: hoursExpired,
        order_id: currentOrder.id
      })
      toast.error('Payment link has expired. Please contact support to generate a new payment link.')
      return
    }

    console.log('✅ [PAYMENT DEBUG] Token is valid and not expired')
    setIsProcessingPayment(true)

    try {
      console.log('🔵 [PAYMENT DEBUG] Starting payment flow...')
      
      // Load Midtrans Snap script if not already loaded
      if (typeof window !== 'undefined' && !(window as any).snap) {
        console.log('📥 [PAYMENT DEBUG] Loading Midtrans Snap script...')
        const script = document.createElement('script')
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
        script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
        document.body.appendChild(script)
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('✅ [PAYMENT DEBUG] Midtrans Snap script loaded successfully')
            resolve(true)
          }
          script.onerror = () => {
            console.error('❌ [PAYMENT DEBUG] Failed to load Midtrans Snap script')
            reject(new Error('Failed to load payment system'))
          }
        })
      } else {
        console.log('✅ [PAYMENT DEBUG] Midtrans Snap already loaded')
      }

      // Open Snap modal
      if (typeof window !== 'undefined' && (window as any).snap) {
        console.log('🚀 [PAYMENT DEBUG] Opening payment modal with token:', currentOrder.snap_token.substring(0, 20) + '...')
        const snapPay = (window as any).snap.pay as Function
        snapPay(currentOrder.snap_token, {
          onSuccess: (result: any) => {
            console.log('✅ [PAYMENT DEBUG] Payment successful!', result)
            console.log('📊 [PAYMENT DEBUG] Success details:', {
              order_id: result.order_id,
              transaction_id: result.transaction_id,
              payment_type: result.payment_type,
              transaction_status: result.transaction_status
            })
            toast.success(t('trackOrder.paymentSuccessful'))
            // Set state and refresh order status
            setEmail(currentOrder.customer_email)
            setOrderNumber(currentOrder.order_number)
            setTimeout(() => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent
              handleSearch(fakeEvent)
            }, 100)
          },
          onPending: (result: any) => {
            console.log('⏳ [PAYMENT DEBUG] Payment pending', result)
            console.log('📊 [PAYMENT DEBUG] Pending details:', {
              order_id: result.order_id,
              transaction_status: result.transaction_status
            })
            toast.info(t('trackOrder.paymentPendingToast'))
            // Set state and refresh order status
            setEmail(currentOrder.customer_email)
            setOrderNumber(currentOrder.order_number)
            setTimeout(() => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent
              handleSearch(fakeEvent)
            }, 100)
          },
          onError: (result: any) => {
            console.error('❌ [PAYMENT DEBUG] Payment error', result)
            console.error('📊 [PAYMENT DEBUG] Error details:', {
              status_code: result.status_code,
              status_message: result.status_message,
              transaction_id: result.transaction_id
            })
            toast.error(t('trackOrder.paymentFailed'))
          },
          onClose: () => {
            console.log('🔴 [PAYMENT DEBUG] Payment modal closed by user')
            toast.info(t('trackOrder.paymentCancelled'))
            setIsProcessingPayment(false)
          }
        })
      } else {
        throw new Error(t('trackOrder.paymentSystemError'))
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || t('trackOrder.paymentError'))
      setIsProcessingPayment(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 [ORDER DEBUG] Searching for order...', {
      email: email?.toLowerCase().trim(),
      orderNumber: orderNumber?.toUpperCase().trim()
    })

    if (!email || !orderNumber) {
      console.error('❌ [ORDER DEBUG] Missing email or order number')
      toast.error(t('trackOrder.enterBothFields'))
      return
    }

    setIsSearching(true)
    setNotFound(false)
    setOrder(null)

    try {
      const trimmedEmail = email.toLowerCase().trim()
      const trimmedOrder = orderNumber.toUpperCase().trim()
      const res = await fetch(
        `/api/orders/track?email=${encodeURIComponent(trimmedEmail)}&order_number=${encodeURIComponent(trimmedOrder)}`
      )
      const json = await res.json()
      const data = json.order

      if (!res.ok || !data) {
        console.error('❌ [ORDER DEBUG] Order not found', {
          email: trimmedEmail,
          orderNumber: trimmedOrder
        })
        setNotFound(true)
        toast.error('Order not found. Please check your email and order number.')
        return
      }

      console.log('✅ [ORDER DEBUG] Order found!', {
        order_id: data.id,
        order_number: data.order_number,
        payment_status: data.payment_status,
        status: data.status,
        has_snap_token: !!data.snap_token,
        snap_token_preview: data.snap_token ? data.snap_token.substring(0, 20) + '...' : 'NULL',
        expiry_time: data.expiry_time,
        created_at: data.created_at,
        total_amount: data.total_amount
      })

      console.log('📅 [TIMESTAMP DEBUG] Order timestamps:', {
        created_at: data.created_at,
        packed_at: data.packed_at,
        shipped_at: data.shipped_at,
        delivered_at: data.delivered_at,
        payment_time: data.payment_metadata?.transaction_time,
        has_packed_at: !!data.packed_at,
        has_shipped_at: !!data.shipped_at,
        has_delivered_at: !!data.delivered_at
      })

      // 🔒 SECURITY CHECK: If user is authenticated, verify email matches
      if (user && !user.is_anonymous) {
        const authenticatedEmail = user.email
        const orderEmail = data.customer_email
        
        if (authenticatedEmail?.toLowerCase() !== orderEmail?.toLowerCase()) {
          console.error('🚨 [SECURITY] Email mismatch! User:', authenticatedEmail, 'Order:', orderEmail)
          setNotFound(true)
          toast.error('This order does not belong to your account.')
          return
        }
      }

      setOrder(data as Order)
      
      // Save to localStorage for persistence when user navigates away
      if (!user || user.is_anonymous) {
        const orderInfo = JSON.stringify({
          order_number: data.order_number,
          customer_email: email.toLowerCase().trim()
        })
        localStorage.setItem('guestOrderInfo', orderInfo)
        console.log('💾 [ORDER DEBUG] Order info saved to localStorage for guest user')
        setShowCreateAccount(true)
      }
    } catch (error) {
      console.error('❌ [ORDER DEBUG] Failed to fetch order:', error)
      toast.error('Failed to fetch order details')
    } finally {
      setIsSearching(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
        return <Clock className="h-5 w-5" />
      case 'shipped':
        return <Truck className="h-5 w-5" />
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${order && order.payment_status === 'pending' && !order.payment_metadata?.transaction_status && order.expiry_time && new Date(order.expiry_time) >= new Date() ? 'pb-28 sm:pb-12' : ''}`}>
      {/* Breadcrumb - Desktop only */}
      <div className="container mx-auto px-4 max-w-2xl mb-4 hidden md:block">
        <Breadcrumbs 
          items={[
            { label: t('trackOrder.title') || 'Track Order', href: '/track-order' }
          ]} 
        />
      </div>
      
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-luxury-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-luxury-navy" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('trackOrder.title')}</h1>
          <p className="text-gray-600">
            {t('trackOrder.subtitle')}
          </p>
        </div>

        {/* Session Order History */}
        {sessionOrders.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-luxury-navy" />
              {t('trackOrder.yourRecentOrders')}
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {sessionOrders.map((sessionOrder) => (
                <div
                  key={sessionOrder.id}
                  className={`rounded-lg shadow-sm p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer ${
                    selectedOrderId === sessionOrder.id
                      ? 'bg-luxury-navy/5 border-2 border-luxury-navy'
                      : 'bg-white border border-gray-200'
                  }`}
                  onClick={async () => {
                    setSelectedOrderId(sessionOrder.id)
                    setIsSearching(true)
                    try {
                      const res = await fetch(
                        `/api/orders/track?email=${encodeURIComponent(sessionOrder.customer_email)}&order_number=${encodeURIComponent(sessionOrder.order_number)}`
                      )
                      const json = await res.json()
                      if (res.ok && json.order) {
                        setModalOrder(json.order as Order)
                        setIsModalOpen(true)
                      } else {
                        toast.error('Order not found')
                      }
                    } catch {
                      toast.error('Failed to fetch order details')
                    } finally {
                      setIsSearching(false)
                    }
                  }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-semibold text-sm text-gray-900 mb-1.5">
                          {sessionOrder.order_number}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            sessionOrder.payment_status === 'pending' && sessionOrder.expiry_time && new Date(sessionOrder.expiry_time) < new Date()
                              ? 'bg-red-100 text-red-800'
                              : sessionOrder.status === 'shipped' ? 'bg-indigo-100 text-indigo-800'
                              : sessionOrder.status === 'delivered' ? 'bg-green-100 text-green-800'
                              : sessionOrder.status === 'packed' ? 'bg-purple-100 text-purple-800'
                              : sessionOrder.status === 'cancelled' ? 'bg-red-100 text-red-800'
                              : sessionOrder.payment_status === 'completed' ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sessionOrder.payment_status === 'pending' && sessionOrder.expiry_time && new Date(sessionOrder.expiry_time) < new Date()
                              ? (lang === 'id' ? '⏰ Kadaluarsa' : '⏰ Expired')
                              : sessionOrder.status === 'shipped' ? (lang === 'id' ? '🚚 Dikirim' : '🚚 Shipped')
                              : sessionOrder.status === 'delivered' ? (lang === 'id' ? '✅ Terkirim' : '✅ Delivered')
                              : sessionOrder.status === 'packed' ? (lang === 'id' ? '📦 Dikemas' : '📦 Packed')
                              : sessionOrder.status === 'cancelled' ? (lang === 'id' ? '❌ Dibatalkan' : '❌ Cancelled')
                              : sessionOrder.payment_status === 'completed' ? (lang === 'id' ? '⏳ Diproses' : '⏳ Processing')
                              : (lang === 'id' ? '💳 Menunggu Pembayaran' : '💳 Awaiting Payment')
                            }
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">
                          {formatPrice(
                            sessionOrder.total_amount, 
                            ((sessionOrder.payment_metadata as any)?.currency_code || sessionOrder.currency_code) as any
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-xs text-gray-500">
                          {new Date(sessionOrder.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(sessionOrder.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {/* Action hint */}
                    {sessionOrder.payment_status === 'pending' && sessionOrder.expiry_time && new Date(sessionOrder.expiry_time) >= new Date() && (
                      <div className="flex items-center gap-2 text-xs text-luxury-gold">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-medium">{lang === 'id' ? 'Klik untuk melanjutkan pembayaran' : 'Click to continue payment'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-500">
                {t('trackOrder.orSearchDifferent')}
              </p>
              {user && !user.is_anonymous && (
                <Link
                  href="/account/orders"
                  className="text-xs sm:text-sm font-semibold text-luxury-gold hover:text-luxury-gold/80 transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  {t('trackOrder.viewAllOrders')} →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Manual Search Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('trackOrder.searchForOrder')}</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('trackOrder.emailLabel')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    if (!user || user.is_anonymous) setEmail(e.target.value)
                  }}
                  placeholder={t('trackOrder.emailPlaceholder')}
                  className={`pl-10 ${user && !user.is_anonymous ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  readOnly={!!(user && !user.is_anonymous)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('trackOrder.emailHint')}
              </p>
            </div>

            <div>
              <Label htmlFor="orderNumber">{t('trackOrder.orderNumberLabel')} *</Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder={t('trackOrder.orderNumberPlaceholder')}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('trackOrder.orderNumberHint')}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-luxury-navy hover:bg-luxury-navy-light"
              disabled={isSearching}
            >
              {isSearching ? t('common.loading') : t('trackOrder.button')}
            </Button>
          </form>
        </div>

        {/* Not Found Message */}
        {notFound && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Order Not Found</h3>
            <p className="text-red-700 mb-4">
              We couldn't find an order matching the provided email and order number.
            </p>
            <p className="text-sm text-red-600">
              Please check your order confirmation email and try again.
            </p>
          </div>
        )}

        {/* Order Details - Pesanan Terbaru Anda */}
        {order && (
          <div className="space-y-6">
            {/* Main Order Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('trackOrder.orderStatus')}</h2>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  (() => {
                    // Check if payment expired
                    if (order.payment_status === 'pending' && order.expiry_time && new Date(order.expiry_time) < new Date()) {
                      return 'bg-red-100 text-red-800'
                    }
                    const status = order.payment_metadata?.transaction_status
                    if (status === 'settlement' || status === 'capture' || status === 'reversal') return 'bg-blue-100 text-blue-800'
                    if (status === 'authorize') return 'bg-purple-100 text-purple-800'
                    if (status === 'challenge') return 'bg-orange-100 text-orange-800'
                    if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
                    if (status === 'refund') return 'bg-gray-100 text-gray-800'
                    if (status === 'partial_refund') return 'bg-indigo-100 text-indigo-800'
                    if (status === 'chargeback') return 'bg-red-100 text-red-800'
                    if (status === 'expire' || status === 'deny' || status === 'cancel') return 'bg-red-100 text-red-800'
                    return getStatusColor(order.status)
                  })()
                }`}>
                  {(() => {
                    const status = order.payment_metadata?.transaction_status
                    if (status === 'settlement' || status === 'capture' || status === 'reversal') return <Clock className="h-4 w-4" />
                    if (status === 'authorize') return <CheckCircle2 className="h-4 w-4" />
                    if (status === 'challenge') return <Clock className="h-4 w-4" />
                    if (status === 'refund' || status === 'partial_refund') return <Package className="h-4 w-4" />
                    if (status === 'chargeback') return <Clock className="h-4 w-4" />
                    return getStatusIcon(order.status)
                  })()}
                  {(() => {
                    // Check if payment expired
                    if (order.payment_status === 'pending' && order.expiry_time && new Date(order.expiry_time) < new Date()) {
                      return lang === 'id' ? 'Pembayaran Kadaluarsa' : 'Payment Expired'
                    }
                    
                    const paymentStatus = order.payment_metadata?.transaction_status
                    const orderStatus = order.status
                    
                    // Priority: Check order status first (shipped, packed, etc.)
                    if (orderStatus === 'shipped') return 'Dikirim'
                    if (orderStatus === 'packed') return 'Dikemas'
                    if (orderStatus === 'delivered') return 'Terkirim'
                    if (orderStatus === 'cancelled') return 'Dibatalkan'
                    
                    // Then check payment status from Midtrans
                    if (paymentStatus === 'settlement' || paymentStatus === 'capture') return 'Diproses'
                    if (paymentStatus === 'authorize') return 'Diotorisasi'
                    if (paymentStatus === 'challenge') return 'Dalam Peninjauan'
                    if (paymentStatus === 'pending') return 'Menunggu Pembayaran'
                    if (paymentStatus === 'refund') return 'Dikembalikan'
                    if (paymentStatus === 'partial_refund') return 'Dikembalikan Sebagian'
                    if (paymentStatus === 'chargeback') return 'Disengketakan'
                    if (paymentStatus === 'reversal') return 'Diproses'
                    if (paymentStatus === 'expire') return 'Kadaluarsa'
                    if (paymentStatus === 'deny' || paymentStatus === 'cancel') return 'Dibatalkan'
                    
                    // Fallback to processing if payment completed
                    if (orderStatus === 'processing') return 'Diproses'
                    return getTranslatedStatus(orderStatus)
                  })()}
                </span>
              </div>

              {/* Order Status Timeline */}
              {(() => {
                console.log('🎯 [TIMELINE RENDER] Rendering OrderStatusTimeline with props:', {
                  currentStatus: order.status,
                  paymentStatus: order.payment_status,
                  createdAt: order.created_at,
                  paidAt: order.payment_metadata?.transaction_time || null,
                  packedAt: order.packed_at || null,
                  shippedAt: order.shipped_at || null,
                  deliveredAt: order.delivered_at || null,
                  trackingNumber: order.tracking_number || null,
                  carrier: order.carrier_code || null
                })
                return (
                  <OrderStatusTimeline
                    currentStatus={order.status}
                    paymentStatus={order.payment_status}
                    createdAt={order.created_at}
                    paidAt={order.payment_metadata?.transaction_time || null}
                    packedAt={order.packed_at || null}
                    shippedAt={order.shipped_at || null}
                    deliveredAt={order.delivered_at || null}
                    cancelledAt={null}
                    expiryTime={order.expiry_time || null}
                    trackingNumber={order.tracking_number || null}
                    trackingUrl={order.tracking_url || null}
                    carrier={order.carrier_code || null}
                    paymentMetadata={order.payment_metadata}
                  />
                )
              })()}


              {/* Success Payment Alert */}
              {(order.payment_metadata?.transaction_status === 'settlement' || order.payment_metadata?.transaction_status === 'capture') && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-1">Pembayaran Berhasil</h3>
                      <p className="text-sm text-green-700">
                        Pembayaran Anda telah dikonfirmasi. Pesanan sedang diproses dan akan segera dikirim.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Expired Alert */}
              {order.payment_status === 'pending' && !order.payment_metadata?.transaction_status && order.expiry_time && (() => {
                const isExpired = new Date(order.expiry_time) < new Date()
                return isExpired ? (
                  <div className="mb-4 rounded-lg p-4 bg-red-50 border border-red-200">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 mt-0.5 text-red-600" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 text-red-900">
                          {lang === 'id' ? 'Pembayaran Kadaluarsa' : 'Payment Expired'}
                        </h3>
                        <p className="text-sm text-red-700">
                          {lang === 'id' 
                            ? 'Waktu pembayaran telah habis. Silakan buat pesanan baru untuk melanjutkan.' 
                            : 'Payment time has expired. Please create a new order to continue.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Authorized Payment Alert */}
              {order.payment_metadata?.transaction_status === 'authorize' && (
                <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 mb-1">Pembayaran Diotorisasi</h3>
                      <p className="text-sm text-purple-700">
                        Pembayaran Anda telah diotorisasi dan akan segera diproses.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Challenge/Under Review Alert */}
              {order.payment_metadata?.transaction_status === 'challenge' && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900 mb-1">Pembayaran Dalam Peninjauan</h3>
                      <p className="text-sm text-orange-700">
                        Pembayaran Anda sedang ditinjau untuk keamanan. Kami akan memberi tahu Anda setelah dikonfirmasi.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Alert */}
              {order.payment_metadata?.transaction_status === 'refund' && (
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Pembayaran Dikembalikan</h3>
                      <p className="text-sm text-gray-700">
                        Pembayaran Anda telah dikembalikan. Dana akan kembali ke akun Anda dalam 3-7 hari kerja.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Partial Refund Alert */}
              {order.payment_metadata?.transaction_status === 'partial_refund' && (
                <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-indigo-900 mb-1">Pengembalian Sebagian Diproses</h3>
                      <p className="text-sm text-indigo-700">
                        Pengembalian sebagian telah diproses. Dana akan kembali ke akun Anda dalam 3-7 hari kerja.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chargeback Alert */}
              {order.payment_metadata?.transaction_status === 'chargeback' && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-1">Pembayaran Disengketakan</h3>
                      <p className="text-sm text-red-700">
                        Chargeback telah dimulai untuk pesanan ini. Tim kami akan menghubungi Anda mengenai hal ini.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reversal Alert */}
              {order.payment_metadata?.transaction_status === 'reversal' && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-1">Chargeback Dibatalkan</h3>
                      <p className="text-sm text-green-700">
                        Chargeback telah dibatalkan. Pembayaran Anda dikembalikan dan pesanan sedang diproses.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expired Payment Alert */}
              {(order.payment_status === 'expired' || order.payment_metadata?.transaction_status === 'expire') && (
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Pembayaran Kadaluarsa</h3>
                      <p className="text-sm text-gray-700">
                        Link pembayaran telah kadaluarsa. Silakan hubungi customer support untuk bantuan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed/Cancelled Payment Alert */}
              {(order.payment_metadata?.transaction_status === 'deny' || order.payment_metadata?.transaction_status === 'cancel') && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-1">Pembayaran Gagal</h3>
                      <p className="text-sm text-red-700">
                        Pembayaran Anda {order.payment_metadata?.transaction_status === 'deny' ? 'ditolak' : 'dibatalkan'}. Silakan coba lagi atau gunakan metode pembayaran lain.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Items */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('trackOrder.products')}</h3>
                  <div className="space-y-3">
                    {order.order_items.map((item) => {
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
                      let itemImage: string | null = null
                      if (item.variant_name && item.product.variants) {
                        const variant = item.product.variants.find(v => v.name === item.variant_name)
                        if (variant?.image_url) itemImage = parseImg(variant.image_url)
                      }
                      // Fallback to product images
                      if (!itemImage) {
                        const raw = item.product.image_urls
                        const urls: string[] = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw as any) } catch { return [] } })()
                        itemImage = urls.find(u => u && !u.includes('placehold.co')) || null
                      }
                      // Fallback to any variant image
                      if (!itemImage && item.product.variants) {
                        for (const v of item.product.variants) {
                          const img = parseImg(v.image_url)
                          if (img) { itemImage = img; break }
                        }
                      }

                      return (
                      <div key={item.id} className="flex gap-3">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={item.variant_name || item.product.name}
                            className="w-16 h-16 object-contain rounded-lg bg-gray-50 p-1 flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center">
                            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.variant_name || item.product.name}</p>
                          {(() => {
                            const discKey = item.variant_name ? `${item.product_id}-${item.variant_name}` : item.product_id
                            const discounted = activeDiscounts.get(discKey) ?? activeDiscounts.get(item.product_id)
                            const displayPrice = discounted ?? item.price_at_purchase
                            return (
                              <p className="text-xs text-gray-500">
                                {formatPrice(displayPrice, order.currency_code as any)} × {item.quantity}
                              </p>
                            )
                          })()}
                        </div>
                        <div className="text-right">
                          {(() => {
                            const discKey = item.variant_name ? `${item.product_id}-${item.variant_name}` : item.product_id
                            const discounted = activeDiscounts.get(discKey) ?? activeDiscounts.get(item.product_id)
                            const displayPrice = discounted ?? item.price_at_purchase
                            const hasDiscount = discounted !== undefined && discounted < item.price_at_purchase
                            return (
                              <>
                                {hasDiscount && (
                                  <p className="text-xs text-gray-400 line-through">
                                    {formatPrice(item.price_at_purchase * item.quantity, order.currency_code as any)}
                                  </p>
                                )}
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatPrice(displayPrice * item.quantity, order.currency_code as any)}
                                </p>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )
                    })}
                  </div>
                </div>
              )}

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b">
                <div>
                  <p className="text-gray-600 text-xs mb-1">{t('trackOrder.orderNumber')}</p>
                  <p className="font-mono font-semibold text-gray-900 text-xs">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">{t('trackOrder.orderDate')}</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {order.payment_metadata?.transaction_time
                      ? new Date(order.payment_metadata.transaction_time).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Jakarta'
                        })
                      : new Date(order.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'Asia/Jakarta'
                        })
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Email</p>
                  <p className="font-semibold text-gray-900 text-xs truncate">{order.customer_email}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">{t('trackOrder.totalAmount')}</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {formatPrice(
                      order.total_amount, 
                      ((order.payment_metadata as any)?.currency_code || order.currency_code) as any
                    )}
                  </p>
                </div>
                {order.payment_gateway && (
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Payment Gateway</p>
                    <p className="font-semibold text-gray-900 text-xs capitalize">
                      {order.payment_gateway}
                    </p>
                  </div>
                )}
                {(order.payment_metadata?.payment_type || order.payment_method_type) && (
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Payment Method Type</p>
                    <p className="font-semibold text-gray-900 text-xs capitalize">
                      {(order.payment_metadata?.payment_type || order.payment_method_type || '').replace('_', ' ')}
                    </p>
                  </div>
                )}
                {order.payment_metadata?.channel && (
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Payment Channel</p>
                    <p className="font-semibold text-gray-900 text-xs capitalize">
                      {order.payment_metadata.channel.replace('_', ' ')}
                    </p>
                  </div>
                )}
                {/* Show expiry time for pending orders */}
                {(order.payment_metadata?.expiry_time || order.expiry_time) && order.payment_status === 'pending' && (
                  <>
                    <div>
                      <p className="text-gray-600 text-xs mb-1">{t('trackOrder.payBefore')}</p>
                      <p className="font-semibold text-gray-900 text-xs">
                        {new Date(order.payment_metadata?.expiry_time || order.expiry_time!).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Jakarta'
                        })}
                      </p>
                    </div>
                    {/* Only show Waktu Tersisa if payment is not successful */}
                    {!(order.payment_metadata?.transaction_status === 'settlement' || order.payment_metadata?.transaction_status === 'capture') && (
                      <div>
                        <p className="text-gray-600 text-xs mb-1">{t('trackOrder.timeRemaining')}</p>
                        <p className="font-semibold text-gray-900 text-xs">
                          {timeRemaining || 'Menghitung...'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Shipping Address - Inside Main Card */}
              {order.shipping_address && (
                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-luxury-navy" />
                    {t('trackOrder.shippingAddress')}
                  </h3>
                  <div className="text-gray-700 space-y-1 text-sm">
                    {(() => {
                      const addr = order.shipping_address as any
                      let fullName = order.shipping_address?.full_name || addr?.name || ''
                      const email = order.customer_email || ''
                      
                      // Format name - get actual customer name from shipping address or email
                      let displayName = fullName
                      
                      // Check if name looks like an email username (no spaces, contains numbers, all lowercase)
                      const looksLikeUsername = fullName && 
                        !fullName.includes(' ') && 
                        /[0-9]/.test(fullName) && 
                        fullName === fullName.toLowerCase()
                      
                      // If name looks like email username, try to get better name
                      if (looksLikeUsername || (fullName && email && fullName === email.split('@')[0])) {
                        // Try to extract name from email before @ symbol
                        const emailName = email ? email.split('@')[0] : fullName
                        // Clean up: remove numbers, replace dots/underscores with spaces, capitalize
                        const cleaned = emailName
                          .replace(/[0-9]/g, '')
                          .replace(/[._-]/g, ' ')
                          .trim()
                          .split(' ')
                          .filter((word: string) => word.length > 0)
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                        displayName = cleaned || fullName
                      }
                      
                      // Final fallback if still no valid name
                      if (!displayName || displayName.trim() === '') {
                        displayName = email ? email.split('@')[0] : 'Customer'
                      }
                      
                      // Format phone
                      const phone = order.shipping_address?.phone || addr?.phone_number || ''
                      const displayPhone = phone && phone.trim() ? phone : '-'
                      
                      return (
                        <>
                          <p>{order.shipping_address?.address_line1 || addr?.address || ''}</p>
                          {order.shipping_address?.address_line2 && (
                            <p>{order.shipping_address.address_line2}</p>
                          )}
                          <p>
                            {order.shipping_address?.city || 'N/A'}{order.shipping_address?.state_province || addr?.province ? `, ${order.shipping_address?.state_province || addr?.province}` : ''}{' '}
                            {order.shipping_address?.postal_code || ''}
                          </p>
                          {order.shipping_address?.country && (
                            <p>{getCountryName(order.shipping_address.country)}</p>
                          )}
                          {displayPhone !== '-' && (
                            <p className="pt-2 text-gray-600">
                              Telepon: {displayPhone}
                            </p>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Simpan Pesanan Anda Card */}
            {(!user || (user && user.is_anonymous)) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">Simpan Pesanan Anda</h3>
                    <p className="text-xs sm:text-sm text-blue-700 mb-3">
                      Buat akun untuk melacak pesanan ini dengan mudah dan mengelola pembelian di masa mendatang.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={() => {
                          sessionStorage.setItem('signupContext', JSON.stringify({
                            email,
                            orderNumber: order.order_number,
                            fromTrackOrder: true
                          }))
                          window.location.href = '/register'
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Buat Akun
                      </Button>
                      <Button 
                        onClick={() => {
                          sessionStorage.setItem('signinContext', JSON.stringify({
                            email,
                            redirectTo: '/track-order'
                          }))
                          window.location.href = '/login'
                        }}
                        variant="outline" 
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Sudah Punya Akun?
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Sticky bottom payment bar — mobile only, when payment pending and not expired */}
      {order && order.payment_status === 'pending' && !order.payment_metadata?.transaction_status && order.expiry_time && new Date(order.expiry_time) >= new Date() && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-4 shadow-lg sm:hidden">
          <Button
            onClick={() => handleContinuePayment()}
            disabled={isProcessingPayment}
            className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy font-semibold py-3 text-base"
          >
            {isProcessingPayment ? t('common.loading') : t('trackOrder.continuePayment')}
          </Button>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={modalOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setModalOrder(null)
          setSelectedOrderId(null)
        }}
        lang={lang}
        t={t}
        onContinuePayment={() => modalOrder && handleContinuePayment(modalOrder)}
        isProcessingPayment={isProcessingPayment}
      />
    </div>
  )
}
