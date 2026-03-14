'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common'
import { formatPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, Package, Truck, Mail, Phone, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

type Order = {
  id: string
  order_number: string
  status: string
  total_amount: number
  currency_code: string
  created_at: string
  shipping_address: {
    full_name: string
    address_line1: string
    address_line2: string | null
    city: string
    state_province: string
    postal_code: string
    country: string
    phone: string
  }
  shipping_method: {
    carrier_name: string
    service_name: string
    estimated_days_min: number
    estimated_days_max: number
  }
}

function OrderConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  
  const [isLoading, setIsLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (orderNumber) {
      fetchOrder()
    } else {
      router.push('/')
    }
  }, [orderNumber])

  const fetchOrder = async () => {
    if (!orderNumber) {
      router.push('/')
      return
    }

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (error) throw error
      
      // For guest orders, shipping_address is already a JSONB object
      // For authenticated orders, we need to fetch the shipping address separately if needed
      const orderData = data as any
      
      // If shipping_method_id exists, fetch shipping method details
      if (orderData.shipping_method_id) {
        const { data: shippingMethod } = await supabase
          .from('shipping_methods')
          .select('*')
          .eq('id', orderData.shipping_method_id)
          .single()
        
        if (shippingMethod) {
          orderData.shipping_method = shippingMethod
        }
      }
      
      setOrder(orderData)
    } catch (error: any) {
      console.error('Failed to fetch order:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const getEstimatedDelivery = () => {
    if (!order?.shipping_method) return 'Soon'
    
    const minDays = order.shipping_method.estimated_days_min
    const maxDays = order.shipping_method.estimated_days_max
    
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + minDays)
    
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + maxDays)
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    return `${formatDate(minDate)} - ${formatDate(maxDate)}`
  }

  const copyOrderNumber = async () => {
    if (!order?.order_number) return
    
    try {
      await navigator.clipboard.writeText(order.order_number)
      setIsCopied(true)
      toast.success('Order number copied to clipboard!')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy order number')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your purchase. We've received your order and will process it shortly.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-gray-900">{order.order_number}</p>
                <button
                  onClick={copyOrderNumber}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy order number"
                >
                  {isCopied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Order Total</p>
              <p className="text-xl font-bold text-luxury-navy">{formatPrice(order.total_amount, order.currency_code as any)}</p>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="flex items-start gap-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Truck className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 mb-1">Estimated Delivery</p>
              <p className="text-gray-600">{getEstimatedDelivery()}</p>
              {order.shipping_method && (
                <p className="text-sm text-gray-500 mt-1">
                  via {order.shipping_method.carrier_name} {order.shipping_method.service_name}
                </p>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Shipping Address</h3>
            </div>
            <div className="pl-7 text-gray-600">
              <p className="font-medium text-gray-900">{order.shipping_address.full_name}</p>
              <p>{order.shipping_address.address_line1}</p>
              {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state_province} {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.country}</p>
              <p className="mt-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {order.shipping_address.phone}
              </p>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <Mail className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                A confirmation email with order details and tracking information has been sent to your email address.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            onClick={() => router.push('/track-order')}
            className="w-full sm:flex-1 bg-luxury-navy hover:bg-luxury-navy-light text-white font-semibold py-6 sm:py-4 rounded-lg text-base sm:text-sm shadow-md hover:shadow-lg transition-all"
          >
            Track Order
          </Button>
          <Button
            onClick={() => router.push('/products')}
            variant="outline"
            className="w-full sm:flex-1 border-2 border-luxury-navy text-luxury-navy hover:bg-luxury-navy hover:text-white font-semibold py-6 sm:py-4 rounded-lg text-base sm:text-sm transition-all"
          >
            Continue Shopping
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-4">What's Next?</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center flex-shrink-0 font-medium">
                1
              </div>
              <p>We'll send you an email confirmation with your order details</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center flex-shrink-0 font-medium">
                2
              </div>
              <p>Your order will be processed and prepared for shipment</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center flex-shrink-0 font-medium">
                3
              </div>
              <p>You'll receive tracking information once your order ships</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center flex-shrink-0 font-medium">
                4
              </div>
              <p>Enjoy your purchase! You have 15 days for free returns</p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help? Contact our{' '}
            <a href="/contact" className="text-luxury-navy hover:underline font-medium">
              customer support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  )
}
