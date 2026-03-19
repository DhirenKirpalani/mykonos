'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package, Mail, MapPin, Calendar, Truck, CheckCircle2, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils/currency'
import { useTranslation } from '@/hooks/useTranslation'

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
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Read order info from sessionStorage and auto-search on mount
  useEffect(() => {
    const guestOrderInfo = sessionStorage.getItem('guestOrderInfo')
    
    if (guestOrderInfo) {
      try {
        const { order_number, customer_email } = JSON.parse(guestOrderInfo)
        
        if (order_number && customer_email) {
          setEmail(customer_email)
          setOrderNumber(order_number)
          
          // Auto-search for the order
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
                setNotFound(true)
                toast.error('Order not found. Please check your email and order number.')
              } else {
                setOrder(data as Order)
                // Clear sessionStorage after successful load
                sessionStorage.removeItem('guestOrderInfo')
              }
            } catch (error) {
              console.error('Error fetching order:', error)
              setNotFound(true)
              toast.error('Failed to fetch order details')
            } finally {
              setIsSearching(false)
            }
          }

          autoSearch()
        }
      } catch (error) {
        console.error('Error parsing guest order info:', error)
      }
    }
  }, [])

  const handleContinuePayment = async () => {
    if (!order || !order.snap_token) {
      toast.error('Unable to continue payment. Please contact support.')
      return
    }

    // Check if token is expired
    if (order.expiry_time && new Date(order.expiry_time) < new Date()) {
      toast.error('Payment link has expired. Please contact support to generate a new payment link.')
      return
    }

    setIsProcessingPayment(true)

    try {
      // Load Midtrans Snap script if not already loaded
      if (typeof window !== 'undefined' && !(window as any).snap) {
        const script = document.createElement('script')
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
        script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
        document.body.appendChild(script)
        
        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      // Open Snap modal
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(order.snap_token, {
          onSuccess: (result: any) => {
            console.log('Payment successful!', result)
            toast.success('Payment successful! Your order is being processed.')
            // Refresh order status
            handleSearch({ preventDefault: () => {} } as React.FormEvent)
          },
          onPending: (result: any) => {
            console.log('Payment pending', result)
            toast.info('Payment is pending. We will notify you once confirmed.')
            handleSearch({ preventDefault: () => {} } as React.FormEvent)
          },
          onError: (result: any) => {
            console.error('Payment error', result)
            toast.error('Payment failed. Please try again.')
          },
          onClose: () => {
            console.log('Payment modal closed')
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
    
    if (!email || !orderNumber) {
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
        setNotFound(true)
        toast.error('Order not found. Please check your email and order number.')
        return
      }

      setOrder(data as Order)
    } catch (error) {
      console.error('Failed to fetch order:', error)
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

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
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
                <h2 className="text-xl font-bold text-gray-900">Order Status</h2>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              {/* Payment Status Alert */}
              {order.payment_status === 'pending' && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-1">Payment Pending</h3>
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

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Order Number</p>
                  <p className="font-mono font-semibold text-gray-900">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Order Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount</p>
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
                <h2 className="text-xl font-bold text-gray-900">Shipping Address</h2>
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
                <p className="pt-2 text-gray-600">Phone: {order.shipping_address.phone}</p>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-700 mb-3">
                If you have any questions about your order, please contact our customer support.
              </p>
              <a
                href="/contact"
                className="text-sm text-luxury-navy hover:underline font-semibold"
              >
                Contact Support →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
