'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { formatPrice } from '@/lib/utils'

type Order = Database['public']['Tables']['orders']['Row'] & {
  order_items: Array<{
    id: string
    quantity: number
    price_at_purchase: number
    product: {
      name: string
      image_urls: string[]
    }
  }>
  shipping_address: {
    full_name: string
    phone: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

  const fetchOrderDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

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
        .eq('id', params.id)
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setOrder(data as any)
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <button
            onClick={() => router.push('/account/orders')}
            className="text-blue-600 hover:underline"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/account/orders')}
              className="text-gray-600 hover:text-gray-900 mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              ← Back to Orders
            </button>
            <h1 className="text-4xl font-serif mb-2">Order Details</h1>
            <p className="text-gray-500 text-lg">Order #{order.order_number}</p>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Order Status</p>
              <span className={`inline-block px-4 py-2 rounded-md text-sm font-semibold capitalize ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Payment Status</p>
              <span className={`inline-block px-4 py-2 rounded-md text-sm font-semibold capitalize ${getPaymentStatusColor(order.payment_status)}`}>
                {order.payment_status}
              </span>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Order Date</p>
              <p className="font-medium text-gray-900">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-serif">Order Items</h2>
          </div>
          <div className="p-8">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex gap-6 mb-6 pb-6 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                <img
                  src={item.product.image_urls[0] || '/placeholder.png'}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{formatPrice(item.price_at_purchase * item.quantity)}</p>
                  <p className="text-sm text-gray-500">{formatPrice(item.price_at_purchase)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif">Shipping Address</h2>
            </div>
            <div className="p-8">
              <p className="font-semibold text-lg mb-1">{order.shipping_address.full_name}</p>
              <p className="text-gray-600 mb-4">{order.shipping_address.phone}</p>
              <div className="text-gray-700 space-y-1">
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && (
                  <p>{order.shipping_address.address_line2}</p>
                )}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
                <p>{order.shipping_address.country}</p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif">Order Summary</h2>
            </div>
            <div className="p-8">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span className="font-medium">{formatPrice(order.shipping_cost)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Tax</span>
                    <span className="font-medium">{formatPrice(order.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-4 border-t-2 border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
              </div>
              {order.payment_method && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Payment Method</p>
                  <p className="font-semibold capitalize">{order.payment_method.replace('_', ' ')}</p>
                </div>
              )}
              {order.payment_intent_id && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Transaction ID</p>
                  <p className="font-mono text-xs text-gray-600 break-all">{order.payment_intent_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
