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
  const [activeDiscounts, setActiveDiscounts] = useState<Map<string, number>>(new Map())

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
              stock_quantity,
              variants
            )
          )
        `)
        .eq('id', params.id)
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      const orderData = data as any
      console.log('📦 [ORDER DETAILS] Order data:', orderData)
      console.log('📦 [ORDER DETAILS] Order items:', orderData?.order_items)
      if (orderData?.order_items?.[0]) {
        console.log('📦 [ORDER DETAILS] First item product:', orderData.order_items[0].product)
        console.log('📦 [ORDER DETAILS] First item image_urls:', orderData.order_items[0].product?.image_urls)
      }
      setOrder(orderData)

      // Fetch active discounts for order items
      if (orderData?.order_items?.length > 0) {
        const productIds = orderData.order_items.map((i: any) => i.product_id)
        const now = new Date().toISOString()
        const { data: discData } = await supabase
          .from('discount_products')
          .select(`product_id, variant_id, discounted_price, discounts!inner(start_date, end_date, is_active)`)
          .eq('is_active', true)
          .eq('discounts.is_active', true)
          .lte('discounts.start_date', now)
          .gte('discounts.end_date', now)
          .in('product_id', productIds)
        if (discData && discData.length > 0) {
          const discMap = new Map<string, number>()

          // Build variant_id -> variant_name lookup from order items' product variants JSONB
          const variantIdToName = new Map<string, string>()
          orderData.order_items.forEach((item: any) => {
            const variants: any[] = item.product?.variants || []
            variants.forEach((v: any) => {
              if (v.id && v.name) variantIdToName.set(v.id, v.name)
            })
          })

          discData.forEach((d: any) => {
            // Product-level discount (no variant_id)
            if (!d.variant_id) {
              if (!discMap.has(d.product_id) || d.discounted_price < discMap.get(d.product_id)!) {
                discMap.set(d.product_id, d.discounted_price)
              }
            } else {
              // Variant-specific: resolve variant_id -> variant_name
              const variantName = variantIdToName.get(d.variant_id)
              if (variantName) {
                const variantNameKey = `${d.product_id}-${variantName}`
                if (!discMap.has(variantNameKey) || d.discounted_price < discMap.get(variantNameKey)!) {
                  discMap.set(variantNameKey, d.discounted_price)
                }
              }
              // Also store as product-level fallback (lowest variant discount wins)
              if (!discMap.has(d.product_id) || d.discounted_price < discMap.get(d.product_id)!) {
                discMap.set(d.product_id, d.discounted_price)
              }
            }
          })
          setActiveDiscounts(discMap)
        }
      }
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
      <div className="container mx-auto px-4 py-4 sm:py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-5 sm:mb-8">
            <Link
              href="/account/orders"
              className="text-gray-600 hover:text-gray-900 mb-4 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              ← {t.account.backToOrders}
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif mb-1">{t.account.orderDetails}</h1>
            <p className="text-gray-500 text-sm sm:text-base">Order #{order.order_number}</p>
          </div>

          {/* Payment Status Alert for Pending Orders */}
          {order.payment_status === 'pending' && (
            <div className="mb-5 sm:mb-8 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-yellow-900 mb-1">
                    ⏳ {t.account.waitingForPayment}
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-800 mb-1">
                    {t.account.orderNotComplete}
                  </p>
                  {order.expiry_time && (
                    <p className="text-xs text-yellow-700">
                      {t.account.completeBefore}: {new Date(order.expiry_time).toLocaleString('id-ID', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Jakarta',
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleContinuePayment}
                  disabled={isProcessingPayment || (order.expiry_time ? new Date(order.expiry_time) < new Date() : false)}
                  className="w-full sm:w-auto px-5 py-3 bg-luxury-gold text-luxury-navy rounded-xl hover:bg-luxury-gold-light disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                >
                  {isProcessingPayment ? t.common.loading : t.account.continuePayment}
                </button>
              </div>
            </div>
          )}

          {/* Expired Order Alert */}
          {order.payment_status === 'expired' && (
            <div className="mb-5 sm:mb-8 bg-gray-50 border-2 border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                    ⏰ {t.account.paymentLinkExpired}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700">
                    {t.account.paymentLinkExpiredMessage}
                  </p>
                </div>
                <button
                  onClick={handleOrderAgain}
                  className="w-full sm:w-auto px-5 py-3 bg-luxury-navy text-white rounded-xl hover:bg-luxury-navy/80 font-semibold text-sm transition-colors"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 sm:mb-8">
            <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100">
              <h2 className="text-xl sm:text-2xl font-serif">Detail Pesanan</h2>
            </div>
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
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
                <div>
                  <p className="text-gray-600 text-xs mb-1">Status Pembayaran</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                    order.payment_status === 'completed'          ? 'bg-green-100 text-green-700' :
                    order.payment_status === 'pending'            ? 'bg-yellow-100 text-yellow-700' :
                    order.payment_status === 'authorized'         ? 'bg-blue-100 text-blue-700' :
                    order.payment_status === 'under_review'       ? 'bg-orange-100 text-orange-700' :
                    order.payment_status === 'refunded'           ? 'bg-teal-100 text-teal-700' :
                    order.payment_status === 'partially_refunded' ? 'bg-teal-50 text-teal-600' :
                    order.payment_status === 'chargeback'         ? 'bg-purple-100 text-purple-700' :
                    order.payment_status === 'expired'            ? 'bg-gray-100 text-gray-500' :
                    order.payment_status === 'failed'             ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {order.payment_status === 'completed'          ? t.account.paymentCompleted :
                     order.payment_status === 'pending'            ? t.account.pendingPayment :
                     order.payment_status === 'authorized'         ? t.account.paymentAuthorized :
                     order.payment_status === 'under_review'       ? t.account.paymentUnderReview :
                     order.payment_status === 'refunded'           ? t.account.paymentRefunded :
                     order.payment_status === 'partially_refunded' ? t.account.paymentPartiallyRefunded :
                     order.payment_status === 'chargeback'         ? t.account.paymentChargeback :
                     order.payment_status === 'expired'            ? t.account.paymentExpired :
                     order.payment_status === 'failed'             ? t.account.paymentFailed :
                     order.payment_status}
                  </span>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 sm:mb-8">
          <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100">
            <h2 className="text-xl sm:text-2xl font-serif">Produk Pesanan</h2>
          </div>
          <div className="p-4 sm:p-8">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex gap-3 sm:gap-6 mb-4 pb-4 sm:mb-6 sm:pb-6 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                {(() => {
                  // Get variant image if item has variant
                  let displayImage = null
                  if (item.variant_name && item.product.variants) {
                    const variant = item.product.variants.find(v => v.name === item.variant_name)
                    if (variant?.image_url) {
                      displayImage = variant.image_url
                    }
                  }
                  // Fallback to product image
                  if (!displayImage && item.product.image_urls?.[0]) {
                    displayImage = item.product.image_urls[0]
                  }
                  
                  return displayImage ? (
                    <img
                      src={displayImage}
                      alt={item.variant_name || item.product.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', displayImage)
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error('❌ Image failed to load:', displayImage)
                        console.error('Error event:', e)
                        target.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center';
                        placeholder.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                        target.parentNode?.insertBefore(placeholder, target);
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )
                })()}
                <div className="flex-1 min-w-0">
                  {item.variant_name ? (
                    <h3 className="font-semibold text-sm sm:text-base leading-snug mb-0.5 truncate">{item.variant_name}</h3>
                  ) : (
                    <h3 className="font-semibold text-sm sm:text-base leading-snug mb-0.5">{item.product.name}</h3>
                  )}
                  <p className="text-xs text-gray-500">Jumlah: {item.quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {(() => {
                    const discKey = item.variant_name ? `${item.product_id}-${item.variant_name}` : item.product_id
                    const discounted = activeDiscounts.get(discKey) ?? activeDiscounts.get(item.product_id)
                    const displayPrice = discounted ?? item.price_at_purchase
                    const hasDiscount = discounted !== undefined && discounted < item.price_at_purchase
                    return (
                      <>
                        {hasDiscount && (
                          <p className="text-xs text-gray-400 line-through">{formatPrice(item.price_at_purchase * item.quantity, order.currency_code)}</p>
                        )}
                        <p className="font-semibold text-sm sm:text-base">{formatPrice(displayPrice * item.quantity, order.currency_code)}</p>
                        <p className="text-xs text-gray-500">{formatPrice(displayPrice, order.currency_code)} each</p>
                      </>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100">
                <h2 className="text-xl sm:text-2xl font-serif">Alamat Pengiriman</h2>
              </div>
              <div className="p-4 sm:p-8">
                {(() => {
                  const addr = order.shipping_address as any
                  return (
                    <>
                      <p className="font-semibold text-base mb-0.5">
                        {order.shipping_address?.full_name || addr?.name || order.customer_email?.split('@')[0] || 'Customer'}
                      </p>
                      <p className="text-gray-600 text-sm mb-3">
                        {order.shipping_address?.phone || addr?.phone_number || 'N/A'}
                      </p>
                      <div className="text-gray-700 space-y-1">
                        <p>{order.shipping_address?.address_line1 || addr?.address || 'N/A'}</p>
                        {order.shipping_address?.address_line2 && (
                          <p>{order.shipping_address.address_line2}</p>
                        )}
                        <p>
                          {order.shipping_address?.city || 'N/A'}, {order.shipping_address?.state || addr?.state_province || addr?.province || ''} {order.shipping_address?.postal_code || ''}
                        </p>
                        <p>{order.shipping_address?.country || 'Indonesia'}</p>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100">
              <h2 className="text-xl sm:text-2xl font-serif">Ringkasan Pesanan</h2>
            </div>
            <div className="p-4 sm:p-8">
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
