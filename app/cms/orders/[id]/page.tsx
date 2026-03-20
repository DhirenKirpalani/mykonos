'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Package, User, MapPin, CreditCard, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FulfillOrderButton } from '@/components/admin/FulfillOrderButton'
import { MarkAsPackedButton } from '@/components/admin/MarkAsPackedButton'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  currency_code: string
  created_at: string
  customer_email: string
  packed_at?: string | null
  user: {
    first_name: string
    last_name: string
    email: string
  } | null
  shipping_address: any
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    product: {
      name: string
      sku: string
    }
  }>
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()

    // Set up real-time subscription for order updates
    const channel = supabase
      .channel(`order-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          console.log('🔄 [REALTIME] Order updated:', payload.new)
          // Refetch the complete order data to get all relations
          fetchOrder()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  const fetchOrder = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/orders/admin/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch order')
      }

      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-gold"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Order not found</p>
          <Link href="/cms/orders">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-orange-100 text-orange-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'packed':
        return 'bg-purple-100 text-purple-800'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'IDR') {
      return `Rp${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment'
      case 'pending':
        return 'Pending'
      case 'processing':
        return 'Processing'
      case 'packed':
        return 'Packed'
      case 'shipped':
        return 'Shipped'
      case 'delivered':
        return 'Delivered'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cms/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
            <p className="text-gray-600">Order Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
          <MarkAsPackedButton
            orderId={order.id}
            orderNumber={order.order_number}
            orderStatus={order.status}
            paymentStatus={order.payment_status}
            packedAt={order.packed_at}
            onSuccess={fetchOrder}
          />
          <FulfillOrderButton
            orderId={order.id}
            orderNumber={order.order_number}
            orderStatus={order.status}
            paymentStatus={order.payment_status}
            onSuccess={fetchOrder}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-500 mt-1">SKU: {item.product.sku}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatCurrency(item.unit_price, order.currency_code)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.unit_price, order.currency_code)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(order.total_amount, order.currency_code)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </h2>
            <div className="space-y-2">
              {order.user ? (
                <>
                  <p className="font-medium text-gray-900">
                    {order.user.first_name} {order.user.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{order.user.email}</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-900">
                    Guest Order
                  </p>
                  <p className="text-sm text-gray-600">{order.customer_email}</p>
                  <p className="text-xs text-gray-500 mt-1">No registered account</p>
                </>
              )}
            </div>
          </div>

          {order.shipping_address && (
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </h2>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{order.shipping_address.full_name}</p>
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && (
                  <p>{order.shipping_address.address_line2}</p>
                )}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state_province}{' '}
                  {order.shipping_address.postal_code}
                </p>
                <p>{order.shipping_address.country}</p>
                <p className="pt-2">{order.shipping_address.phone}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  order.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 
                  order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.payment_status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date</span>
                <span className="text-gray-900">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(order.total_amount, order.currency_code)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
