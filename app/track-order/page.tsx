'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package, Mail, MapPin, Calendar, Truck, CheckCircle2, Clock, UserPlus, LogIn } from 'lucide-react'
import { formatPrice } from '@/lib/utils/currency'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

type OrderItem = {
  id: string
  quantity: number
  price_at_purchase: number
  product: {
    name: string
    image_urls: string[]
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
  carrier_code?: string
  tracking_number?: string
  estimated_delivery_date?: string
  snap_token?: string
  expiry_time?: string
  payment_method_type?: string
  order_items?: OrderItem[]
  payment_metadata?: {
    transaction_time?: string
    expiry_time?: string
    payment_type?: string
    [key: string]: any
  }
}

export default function TrackOrderPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [notFound, setNotFound] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

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
          
          // Fetch orders for authenticated user's email only
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                id,
                quantity,
                price_at_purchase,
                product:products (
                  name,
                  image_urls
                )
              )
            `)
            .eq('customer_email', authenticatedEmail)
            .order('created_at', { ascending: false })
            .limit(20)
          
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
            
            const { data, error } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  id,
                  quantity,
                  price_at_purchase,
                  product:products (
                    name,
                    image_urls
                  )
                )
              `)
              .eq('customer_email', mostRecentEmail)
              .order('created_at', { ascending: false })
              .limit(20)
            
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
          .select('payment_status, status, snap_token, expiry_time, payment_metadata, packed_at, shipped_at, tracking_number, carrier_code')
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
              toast.success('Payment successful! Your order is being processed.')
            } else if (data.payment_status === 'expired') {
              toast.error('Payment has expired. Please contact support for a new payment link.')
            } else if (data.payment_status === 'failed') {
              toast.error('Payment failed. Please try again or contact support.')
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
        setTimeRemaining('Kadaluarsa')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeRemaining(`${hours}j ${minutes}m ${seconds}s`)
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [order?.payment_metadata?.expiry_time, order?.expiry_time])

  const handleContinuePayment = async () => {
    console.log('🔵 [PAYMENT DEBUG] handleContinuePayment called')
    console.log('📦 [PAYMENT DEBUG] Order data:', {
      order_id: order?.id,
      order_number: order?.order_number,
      payment_status: order?.payment_status,
      has_snap_token: !!order?.snap_token,
      snap_token_length: order?.snap_token?.length || 0,
      expiry_time: order?.expiry_time,
      created_at: order?.created_at
    })

    if (!order) {
      console.error('❌ [PAYMENT DEBUG] No order found')
      toast.error('Unable to continue payment. Please contact support.')
      return
    }

    // Validate snap_token exists
    if (!order.snap_token) {
      console.error('❌ [PAYMENT DEBUG] snap_token is missing!', {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        created_at: order.created_at,
        time_since_creation: order.created_at ? 
          `${Math.round((new Date().getTime() - new Date(order.created_at).getTime()) / 1000 / 60)} minutes` : 
          'unknown'
      })
      toast.error('Payment token is missing. Please contact support to generate a new payment link.')
      return
    }

    console.log('✅ [PAYMENT DEBUG] snap_token exists:', order.snap_token.substring(0, 20) + '...')

    // Check if token is expired
    if (order.expiry_time && new Date(order.expiry_time) < new Date()) {
      const expiryDate = new Date(order.expiry_time)
      const now = new Date()
      const hoursExpired = Math.round((now.getTime() - expiryDate.getTime()) / 1000 / 60 / 60)
      
      console.error('❌ [PAYMENT DEBUG] Token expired!', {
        expiry_time: order.expiry_time,
        current_time: now.toISOString(),
        hours_expired: hoursExpired,
        order_id: order.id
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
        console.log('🚀 [PAYMENT DEBUG] Opening payment modal with token:', order.snap_token.substring(0, 20) + '...')
        const snapPay = (window as any).snap.pay as Function
        snapPay(order.snap_token, {
          onSuccess: (result: any) => {
            console.log('✅ [PAYMENT DEBUG] Payment successful!', result)
            console.log('📊 [PAYMENT DEBUG] Success details:', {
              order_id: result.order_id,
              transaction_id: result.transaction_id,
              payment_type: result.payment_type,
              transaction_status: result.transaction_status
            })
            toast.success('Payment successful! Your order is being processed.')
            // Refresh order status
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent
            handleSearch(fakeEvent)
          },
          onPending: (result: any) => {
            console.log('⏳ [PAYMENT DEBUG] Payment pending', result)
            console.log('📊 [PAYMENT DEBUG] Pending details:', {
              order_id: result.order_id,
              transaction_status: result.transaction_status
            })
            toast.info('Payment is pending. We will notify you once confirmed.')
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent
            handleSearch(fakeEvent)
          },
          onError: (result: any) => {
            console.error('❌ [PAYMENT DEBUG] Payment error', result)
            console.error('📊 [PAYMENT DEBUG] Error details:', {
              status_code: result.status_code,
              status_message: result.status_message,
              transaction_id: result.transaction_id
            })
            toast.error('Payment failed. Please try again.')
          },
          onClose: () => {
            console.log('🔴 [PAYMENT DEBUG] Payment modal closed by user')
            toast.info('Payment cancelled. You can continue payment anytime.')
            setIsProcessingPayment(false)
          }
        })
      } else {
        throw new Error('Payment system not loaded. Please refresh the page.')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Failed to open payment. Please try again.')
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
      toast.error('Please enter both email and order number')
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
    <div className="min-h-screen bg-gray-50 py-12">
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
                  onClick={() => {
                    setSelectedOrderId(sessionOrder.id)
                    setOrder(sessionOrder)
                    setEmail(sessionOrder.customer_email)
                    setOrderNumber(sessionOrder.order_number)
                    setNotFound(false)
                    if (!user) {
                      setShowCreateAccount(true)
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-1">
                        <p className="font-mono font-semibold text-xs sm:text-sm text-gray-900 truncate">
                          {sessionOrder.order_number}
                        </p>
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${getStatusColor(sessionOrder.status)}`}>
                          {getTranslatedStatus(sessionOrder.status)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">
                        {formatPrice(sessionOrder.total_amount, sessionOrder.currency_code as any)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {new Date(sessionOrder.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {sessionOrder.payment_status === 'pending' && (
                        <Button
                          size="sm"
                          className="bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy text-[10px] sm:text-xs px-3 py-1.5 h-auto whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOrder(sessionOrder)
                            setEmail(sessionOrder.customer_email)
                            setOrderNumber(sessionOrder.order_number)
                            handleContinuePayment()
                          }}
                        >
                          {t('trackOrder.payNow')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 text-center">
                {t('trackOrder.orSearchDifferent')}
              </p>
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
                  required
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
                  required
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
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Status Pesanan</h2>
                <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 ${
                  (() => {
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

              {/* Payment Status Alert */}
              {order.payment_status === 'pending' && !order.payment_metadata?.transaction_status && order.expiry_time && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-1">{t('trackOrder.paymentPending')}</h3>
                      <p className="text-sm text-yellow-700 mb-3">
                        Selesaikan pembayaran sebelum waktu habis untuk memproses pesanan Anda.
                      </p>
                      <Button
                        onClick={handleContinuePayment}
                        disabled={isProcessingPayment}
                        className="bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy"
                      >
                        {isProcessingPayment ? t('common.loading') : t('trackOrder.continuePayment')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Produk</h3>
                  <div className="space-y-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <img
                          src={item.product.image_urls[0] || '/placeholder.png'}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(item.price_at_purchase * item.quantity, order.currency_code as any)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b">
                <div>
                  <p className="text-gray-600 text-xs mb-1">Nomor Pesanan</p>
                  <p className="font-mono font-semibold text-gray-900 text-xs">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Tanggal Pesanan</p>
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
                  <p className="text-gray-600 text-xs mb-1">Total Pembayaran</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {formatPrice(order.total_amount, order.currency_code as any)}
                  </p>
                </div>
                {(order.payment_metadata?.payment_type || order.payment_method_type) && (
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Metode Pembayaran</p>
                    <p className="font-semibold text-gray-900 text-xs capitalize">
                      {(order.payment_metadata?.payment_type || order.payment_method_type || '').replace('_', ' ')}
                    </p>
                  </div>
                )}
                {(order.payment_metadata?.expiry_time || order.expiry_time) && (
                  <>
                    <div>
                      <p className="text-gray-600 text-xs mb-1">Bayar Sebelum</p>
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
                        <p className="text-gray-600 text-xs mb-1">Waktu Tersisa</p>
                        <p className="font-semibold text-gray-900 text-xs">
                          {timeRemaining || 'Menghitung...'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Shipping Address - Inside Main Card */}
              <div className="pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-luxury-navy" />
                  Alamat Pengiriman
                </h3>
                <div className="text-gray-700 space-y-1 text-sm">
                  <p className="font-semibold">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && (
                    <p>{order.shipping_address.address_line2}</p>
                  )}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state_province}{' '}
                    {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                  <p className="pt-2 text-gray-600">Telepon: {order.shipping_address.phone}</p>
                </div>
              </div>
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

            {/* Butuh Bantuan Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Butuh Bantuan?</h3>
              <p className="text-sm text-blue-700 mb-3">
                Jika Anda memiliki pertanyaan tentang pesanan Anda, tim dukungan kami siap membantu.
              </p>
              <a
                href="/contact"
                className="text-sm text-luxury-navy hover:underline font-semibold"
              >
                Hubungi Customer Support →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
