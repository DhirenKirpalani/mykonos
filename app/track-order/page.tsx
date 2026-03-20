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
}

export default function TrackOrderPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
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

  // Load session order history on mount
  useEffect(() => {
    const loadSessionOrders = async () => {
      setLoadingHistory(true)
      
      try {
        // First, try to get email from localStorage
        const orderHistory = localStorage.getItem('orderHistory')
        let userEmail: string | null = null
        
        if (orderHistory) {
          const orders = JSON.parse(orderHistory)
          if (orders.length > 0) {
            userEmail = orders[0].customer_email
          }
        }
        
        // If we have an email, fetch ALL orders for that email from database
        if (userEmail) {
          console.log('📚 [ORDER HISTORY] Fetching all orders for:', userEmail)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_email', userEmail)
            .order('created_at', { ascending: false })
            .limit(20) // Fetch up to 20 most recent orders
          
          if (error) {
            console.error('Error fetching orders:', error)
          } else if (data) {
            setSessionOrders(data as Order[])
            console.log('✅ [ORDER HISTORY] Loaded', data.length, 'orders from database')
          }
        } else {
          console.log('⚠️ [ORDER HISTORY] No email found in localStorage')
        }
        
        setLoadingHistory(false)
      } catch (error) {
        console.error('Error loading order history:', error)
        setLoadingHistory(false)
      }
    }
    
    loadSessionOrders()
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
              const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_number', order_number)
                .eq('customer_email', customer_email)
                .single()

              if (error || !data) {
                console.error('❌ [AUTO-LOAD] Order not found', { order_number, customer_email })
                setNotFound(true)
                // Don't show error toast for auto-load, just clear localStorage
                if (!fromSession) {
                  localStorage.removeItem('guestOrderInfo')
                  console.log('🗑️ [AUTO-LOAD] Cleared invalid order from localStorage')
                }
              } else {
                console.log('✅ [AUTO-LOAD] Order loaded successfully')
                setOrder(data as Order)
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
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', email.toLowerCase().trim())
        .eq('order_number', orderNumber.toUpperCase().trim())
        .single()

      if (error || !data) {
        console.error('❌ [ORDER DEBUG] Order not found', {
          error: error?.message,
          email: email.toLowerCase().trim(),
          orderNumber: orderNumber.toUpperCase().trim()
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

      setOrder(data as Order)
      
      // Save to localStorage for persistence when user navigates away
      if (!user) {
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
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('trackOrder.emailPlaceholder')}
                  className="pl-10"
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

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('trackOrder.orderStatus')}</h2>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {getTranslatedStatus(order.status)}
                </span>
              </div>

              {/* Payment Status Alert */}
              {order.payment_status === 'pending' && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-1">{t('trackOrder.paymentPending')}</h3>
                      <p className="text-sm text-yellow-700 mb-3">
                        Your order is waiting for payment. Complete your payment to process your order.
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

              {/* Guest User Actions - Create Account or Sign In */}
              {(!user || (user && user.is_anonymous)) && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <UserPlus className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">{t('trackOrder.saveYourOrder')}</h3>
                      <p className="text-xs sm:text-sm text-blue-700 mb-3">
                        {t('trackOrder.saveYourOrderText')}
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
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full text-xs sm:text-sm"
                        >
                          <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          {t('trackOrder.createAccount')}
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
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full text-xs sm:text-sm"
                        >
                          <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          {t('trackOrder.alreadyHaveAccount')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">{t('trackOrder.orderNumber')}</p>
                  <p className="font-mono font-semibold text-gray-900">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">{t('trackOrder.orderDate')}</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">{t('trackOrder.totalAmount')}</p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(order.total_amount, order.currency_code as any)}
                  </p>
                </div>
                {order.estimated_delivery_date && (
                  <div>
                    <p className="text-gray-600">Estimated Delivery</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(order.estimated_delivery_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Information */}
            {order.tracking_number && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-6 w-6 text-luxury-navy" />
                  <h2 className="text-xl font-bold text-gray-900">Tracking Information</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Carrier</p>
                    <p className="font-semibold text-gray-900">
                      {order.carrier_code || 'Standard Shipping'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tracking Number</p>
                    <p className="font-mono font-semibold text-gray-900">{order.tracking_number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-6 w-6 text-luxury-navy" />
                <h2 className="text-xl font-bold text-gray-900">{t('trackOrder.shippingAddress')}</h2>
              </div>
              <div className="text-gray-700 space-y-1">
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
                <p className="pt-2 text-gray-600">{t('trackOrder.phone')}: {order.shipping_address.phone}</p>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">{t('trackOrder.needHelp')}</h3>
              <p className="text-sm text-blue-700 mb-3">
                {t('trackOrder.needHelpText')}
              </p>
              <a
                href="/contact"
                className="text-sm text-luxury-navy hover:underline font-semibold"
              >
                {t('trackOrder.contactSupport')} →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
