'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Clock, CheckCircle2, Package, X, MapPin } from 'lucide-react'
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline'
import { formatPrice } from '@/lib/utils'
import { getCountryName } from '@/lib/utils/country'

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  currency_code: string
  created_at: string
  customer_email: string
  expiry_time?: string | null
  packed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  tracking_number?: string | null
  carrier_code?: string | null
  payment_gateway?: string | null
  payment_method_type?: string | null
  payment_metadata?: {
    transaction_status?: string
    transaction_time?: string
    payment_type?: string
    channel?: string
    expiry_time?: string
  }
  items?: any[]
  shipping_address?: any
}

interface OrderDetailsModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  lang?: string
  t: any
  onContinuePayment?: () => void
  isProcessingPayment?: boolean
}

export function OrderDetailsModal({ order, isOpen, onClose, lang = 'id', t, onContinuePayment, isProcessingPayment = false }: OrderDetailsModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (!order) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'packed': return 'bg-purple-100 text-purple-800'
      case 'shipped': return 'bg-indigo-100 text-indigo-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'processing': return <Clock className="h-4 w-4" />
      case 'packed': return <Package className="h-4 w-4" />
      case 'shipped': return <Package className="h-4 w-4" />
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />
      case 'cancelled': return <X className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getTranslatedStatus = (status: string) => {
    const translations: Record<string, string> = {
      'pending': lang === 'id' ? 'Menunggu' : 'Pending',
      'processing': lang === 'id' ? 'Diproses' : 'Processing',
      'packed': lang === 'id' ? 'Dikemas' : 'Packed',
      'shipped': lang === 'id' ? 'Dikirim' : 'Shipped',
      'delivered': lang === 'id' ? 'Terkirim' : 'Delivered',
      'cancelled': lang === 'id' ? 'Dibatalkan' : 'Cancelled',
    }
    return translations[status] || status
  }

  const content = (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="text-base font-semibold text-gray-900">{t('trackOrder.orderStatus')}</h3>
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
            if (orderStatus === 'shipped') return lang === 'id' ? 'Dikirim' : 'Shipped'
            if (orderStatus === 'packed') return lang === 'id' ? 'Dikemas' : 'Packed'
            if (orderStatus === 'delivered') return lang === 'id' ? 'Terkirim' : 'Delivered'
            if (orderStatus === 'cancelled') return lang === 'id' ? 'Dibatalkan' : 'Cancelled'
            
            // Then check payment status from Midtrans
            if (paymentStatus === 'settlement' || paymentStatus === 'capture') return lang === 'id' ? 'Diproses' : 'Processing'
            if (paymentStatus === 'authorize') return lang === 'id' ? 'Diotorisasi' : 'Authorized'
            if (paymentStatus === 'challenge') return lang === 'id' ? 'Dalam Peninjauan' : 'Under Review'
            if (paymentStatus === 'pending') return lang === 'id' ? 'Menunggu Pembayaran' : 'Awaiting Payment'
            if (paymentStatus === 'refund') return lang === 'id' ? 'Dikembalikan' : 'Refunded'
            if (paymentStatus === 'partial_refund') return lang === 'id' ? 'Dikembalikan Sebagian' : 'Partially Refunded'
            if (paymentStatus === 'chargeback') return lang === 'id' ? 'Disengketakan' : 'Disputed'
            if (paymentStatus === 'reversal') return lang === 'id' ? 'Diproses' : 'Processing'
            if (paymentStatus === 'expire') return lang === 'id' ? 'Kadaluarsa' : 'Expired'
            if (paymentStatus === 'deny' || paymentStatus === 'cancel') return lang === 'id' ? 'Dibatalkan' : 'Cancelled'
            
            // Fallback to processing if payment completed
            if (orderStatus === 'processing') return lang === 'id' ? 'Diproses' : 'Processing'
            return getTranslatedStatus(orderStatus)
          })()}
        </span>
      </div>

      {/* Order Status Timeline */}
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
        carrier={order.carrier_code || null}
      />

      {/* Payment Status Alerts */}
      {order.payment_metadata?.transaction_status === 'settlement' || order.payment_metadata?.transaction_status === 'capture' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 text-sm mb-0.5">{lang === 'id' ? 'Pembayaran Berhasil' : 'Payment Successful'}</h4>
              <p className="text-xs text-green-700">{lang === 'id' ? 'Pembayaran Anda telah dikonfirmasi. Pesanan sedang diproses.' : 'Your payment has been confirmed. Order is being processed.'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {order.payment_status === 'pending' && order.expiry_time && new Date(order.expiry_time) < new Date() ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 text-sm mb-0.5">{lang === 'id' ? 'Pembayaran Kadaluarsa' : 'Payment Expired'}</h4>
              <p className="text-xs text-red-700">{lang === 'id' ? 'Waktu pembayaran telah habis.' : 'Payment time has expired.'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Order Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm pt-4 border-t">
        <div>
          <p className="text-gray-600 text-xs mb-1">{t('trackOrder.orderNumber')}</p>
          <p className="font-mono font-semibold text-gray-900 text-xs">{order.order_number}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-1">{t('trackOrder.orderDate')}</p>
          <p className="font-semibold text-gray-900 text-xs">
            {order.payment_metadata?.transaction_time
              ? new Date(order.payment_metadata.transaction_time).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date(order.created_at).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
            }
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-1">Email</p>
          <p className="font-semibold text-gray-900 text-xs truncate">{order.customer_email}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-1">{lang === 'id' ? 'Total' : 'Total'}</p>
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
            <p className="font-semibold text-gray-900 text-xs capitalize">{order.payment_gateway}</p>
          </div>
        )}
        {(order.payment_metadata?.payment_type || order.payment_method_type) && (
          <div>
            <p className="text-gray-600 text-xs mb-1">Payment Method</p>
            <p className="font-semibold text-gray-900 text-xs capitalize">
              {(order.payment_metadata?.payment_type || order.payment_method_type || '').replace('_', ' ')}
            </p>
          </div>
        )}
        {order.tracking_number && (
          <div>
            <p className="text-gray-600 text-xs mb-1">{lang === 'id' ? 'Nomor Resi' : 'Tracking Number'}</p>
            <p className="font-mono font-semibold text-gray-900 text-xs">{order.tracking_number}</p>
          </div>
        )}
        {(order.payment_metadata?.expiry_time || order.expiry_time) && order.payment_status === 'pending' && (
          <div>
            <p className="text-gray-600 text-xs mb-1">{lang === 'id' ? 'Bayar Sebelum' : 'Pay Before'}</p>
            <p className="font-semibold text-gray-900 text-xs">
              {new Date(order.payment_metadata?.expiry_time || order.expiry_time!).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-luxury-navy" />
            {lang === 'id' ? 'Alamat Pengiriman' : 'Shipping Address'}
          </h4>
          <div className="text-gray-700 space-y-1 text-xs">
            <p>{order.shipping_address.address_line1}</p>
            {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
            <p>
              {order.shipping_address.city}{order.shipping_address.state_province ? `, ${order.shipping_address.state_province}` : ''}{' '}
              {order.shipping_address.postal_code}
            </p>
            {order.shipping_address.country && <p>{getCountryName(order.shipping_address.country)}</p>}
            {order.shipping_address.phone && order.shipping_address.phone.trim() && (
              <p className="pt-2 text-gray-600">Telepon: {order.shipping_address.phone}</p>
            )}
          </div>
        </div>
      )}

      {/* Continue Payment Button */}
      {order.payment_status === 'pending' && !order.payment_metadata?.transaction_status && order.expiry_time && new Date(order.expiry_time) >= new Date() && onContinuePayment && (
        <div className="pt-4 border-t">
          <button
            onClick={onContinuePayment}
            disabled={isProcessingPayment}
            className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-luxury-navy font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingPayment ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Lanjutkan Pembayaran' : 'Continue Payment')}
          </button>
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('trackOrder.orderDetails')}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('trackOrder.orderDetails')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 overflow-y-auto max-h-[80vh]">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
