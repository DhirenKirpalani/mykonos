'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { formatPrice } from '@/lib/utils'
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

type Order = Database['public']['Tables']['orders']['Row'] & {
  order_items: Array<{
    id: string
    product_id: string
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
  customer_email: string
  paid_at?: string | null
  packed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  tracking_number?: string | null
  carrier?: string | null
  snap_token?: string | null
  expiry_time?: string | null
  payment_metadata?: any
  payment_method_type?: string | null
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Helper function to translate order status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'Menunggu Pembayaran'
      case 'processing': return 'Diproses'
      case 'packed': return 'Dikemas'
      case 'shipped': return 'Dikirim'
      case 'delivered': return 'Terkirim'
      case 'cancelled': return 'Dibatalkan'
      case 'refunded': return 'Dikembalikan'
      case 'disputed': return 'Disengketakan'
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
    }
  }

  // Real-time countdown timer
  useEffect(() => {
    if (!order?.expiry_time && !order?.payment_metadata?.expiry_time) return

    const updateCountdown = () => {
      const expiryTime = order.payment_metadata?.expiry_time || order.expiry_time
      if (!expiryTime) return

      const now = new Date().getTime()
      const expiry = new Date(expiryTime).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Kadaluarsa')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}j ${minutes}m ${seconds}d`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [order?.expiry_time, order?.payment_metadata?.expiry_time])

  useEffect(() => {
    fetchOrderDetails()

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
          // Refetch order details to get updated data
          fetchOrderDetails()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  // Load Midtrans Snap script
  useEffect(() => {
    const snapScript = 'https://app.sandbox.midtrans.com/snap/snap.js'
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
    
    const script = document.createElement('script')
    script.src = snapScript
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    
    document.body.appendChild(script)
    
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const fetchOrderDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) {
        router.push('/login')
        return
      }
      
      // Check if user is anonymous
      if (session.user.is_anonymous) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            price_at_purchase,
            variant_name,
            variant_sku,
            product:products (
              id,
              name,
              slug,
              image_urls,
              price_usd,
              price_idr,
              sale_price,
              stock_quantity,
              variants
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
      case 'packed':
        return 'text-purple-600 bg-purple-50'
      case 'shipped':
        return 'text-indigo-600 bg-indigo-50'
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
      case 'expired':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  const handleOrderAgain = () => {
    if (!order || !order.order_items || order.order_items.length === 0) {
      toast.error('No items found in this order')
      return
    }

    // Prepare order items for checkout (similar to Buy Now flow)
    const orderAgainItems = order.order_items.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      variant_name: item.variant_name || null,
      variant_sku: item.variant_sku || null,
    }))

    // Store in sessionStorage
    sessionStorage.setItem('orderAgainItems', JSON.stringify(orderAgainItems))
    
    // Navigate to checkout with orderAgain parameter
    router.push('/checkout?orderAgain=true')
  }

  const handleContinuePayment = async () => {
    if (!order) return

    setIsProcessingPayment(true)
    try {
      // Check if order has expired
      if (order.expiry_time && new Date(order.expiry_time) < new Date()) {
        toast.error('Payment link has expired. Please create a new order.')
        setIsProcessingPayment(false)
        return
      }

      // Check if snap_token exists and is valid
      if (order.snap_token) {
        console.log('✅ [PAYMENT] Reusing existing snap_token')
        // Open Snap modal with existing token
        if (typeof window !== 'undefined' && (window as any).snap) {
          (window as any).snap.pay(order.snap_token, {
            onSuccess: (result: any) => {
              console.log('✅ [PAYMENT] Payment successful!', result)
              toast.success('Payment successful! Your order is being processed.')
              fetchOrderDetails() // Refresh order data
            },
            onPending: (result: any) => {
              console.log('⏳ [PAYMENT] Payment pending', result)
              toast.info('Payment pending. We will notify you once confirmed.')
              fetchOrderDetails()
              setIsProcessingPayment(false)
            },
            onError: (result: any) => {
              console.error('❌ [PAYMENT] Payment error', result)
              toast.error('Payment failed. Please try again.')
              setIsProcessingPayment(false)
            },
            onClose: () => {
              console.log('🚪 [PAYMENT] Payment modal closed')
              setIsProcessingPayment(false)
            }
          })
        } else {
          toast.error('Payment system not loaded. Please refresh the page.')
          setIsProcessingPayment(false)
        }
      } else {
        // No snap_token, need to regenerate
        toast.error('Payment link expired. Please create a new order.')
        setIsProcessingPayment(false)
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Failed to process payment. Please try again.')
      setIsProcessingPayment(false)
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
            {t.account.backToOrders}
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
            <Link
              href="/account/orders"
              className="text-gray-600 hover:text-gray-900 mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              ← {t.account.backToOrders}
            </Link>
            <h1 className="text-4xl font-serif mb-2">{t.account.orderDetails}</h1>
            <p className="text-gray-500 text-lg">Order #{order.order_number}</p>
          </div>

          {/* Payment Status Alert for Pending Orders */}
          {order.payment_status === 'pending' && (
            <div className="mb-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    ⏳ {t.account.waitingForPayment}
                  </h3>
                  <p className="text-sm text-yellow-800 mb-1">
                    {t.account.orderNotComplete}
                  </p>
                  {order.expiry_time && (
                    <p className="text-xs text-yellow-700">
                      {t.account.completeBefore}: {new Date(order.expiry_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleContinuePayment}
                  disabled={isProcessingPayment || (order.expiry_time ? new Date(order.expiry_time) < new Date() : false)}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {isProcessingPayment ? t.common.loading : t.account.continuePayment}
                </button>
              </div>
            </div>
          )}

          {/* Expired Order Alert */}
          {order.payment_status === 'expired' && (
            <div className="mb-8 bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ⏰ {t.account.paymentLinkExpired}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {t.account.paymentLinkExpiredMessage}
                  </p>
                </div>
                <button
                  onClick={handleOrderAgain}
                  className="px-6 py-3 bg-luxury-navy text-white rounded-lg hover:bg-luxury-navy-light font-semibold transition-colors"
                >
                  {t.account.orderAgain}
                </button>
              </div>
            </div>
          )}

          {/* Order Status Timeline */}
          <div className="mb-8">
            <OrderStatusTimeline
              currentStatus={order.status}
              paymentStatus={order.payment_status}
              createdAt={order.created_at}
              paidAt={order.completed_at}
              packedAt={order.packed_at}
              shippedAt={order.shipped_at}
              deliveredAt={order.delivered_at}
              cancelledAt={order.cancelled_at}
              expiryTime={order.expiry_time}
              trackingNumber={order.tracking_number}
              carrier={order.carrier}
              paymentMetadata={order.payment_metadata}
            />
          </div>

          {/* Order Details Grid - Same as Track Order Page */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif">Detail Pesanan</h2>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 text-xs mb-1">Nomor Pesanan</p>
                  <p className="font-mono font-semibold text-gray-900 text-sm">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Tanggal Pesanan</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {new Date(order.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Jakarta'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Email</p>
                  <p className="font-semibold text-gray-900 text-sm truncate">{order.customer_email}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Total Pembayaran</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatPrice(order.total_amount, order.currency_code)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs mb-1">Status Pesanan</p>
                  <p className="font-semibold text-gray-900 text-sm">{getStatusLabel(order.status)}</p>
                </div>
                {(order.payment_metadata?.payment_type || order.payment_method_type || order.payment_method) && (
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Metode Pembayaran</p>
                    <p className="font-semibold text-gray-900 text-sm capitalize">
                      {(order.payment_metadata?.payment_type || order.payment_method_type || order.payment_method || '').replace('_', ' ')}
                    </p>
                  </div>
                )}
                {(order.payment_metadata?.expiry_time || order.expiry_time) && (
                  <>
                    <div>
                      <p className="text-gray-600 text-xs mb-1">Bayar Sebelum</p>
                      <p className="font-semibold text-gray-900 text-sm">
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
                    {!(order.payment_metadata?.transaction_status === 'settlement' || order.payment_metadata?.transaction_status === 'capture') && order.payment_status === 'pending' && (
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Waktu Tersisa</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {timeRemaining || 'Menghitung...'}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {order.tracking_number && (
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Nomor Resi</p>
                    <p className="font-mono font-semibold text-gray-900 text-sm">{order.tracking_number}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-serif">Produk Pesanan</h2>
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
                  <p className="text-sm text-gray-500">Jumlah: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{formatPrice(item.price_at_purchase * item.quantity, order.currency_code)}</p>
                  <p className="text-sm text-gray-500">{formatPrice(item.price_at_purchase, order.currency_code)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif">Alamat Pengiriman</h2>
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
              <h2 className="text-2xl font-serif">Ringkasan Pesanan</h2>
            </div>
            <div className="p-8">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal, order.currency_code)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Ongkir</span>
                  <span className="font-medium">{formatPrice(order.shipping_cost, order.currency_code)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon</span>
                    <span className="font-medium">-{formatPrice(order.discount_amount, order.currency_code)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Pajak</span>
                    <span className="font-medium">{formatPrice(order.tax_amount, order.currency_code)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-4 border-t-2 border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(order.total_amount, order.currency_code)}</span>
                </div>
              </div>
              {order.payment_method && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Metode Pembayaran</p>
                  <p className="font-semibold capitalize">{order.payment_method.replace('_', ' ')}</p>
                </div>
              )}
              {order.payment_intent_id && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">ID Transaksi</p>
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
