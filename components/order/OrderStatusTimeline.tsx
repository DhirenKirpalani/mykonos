'use client'

import { Check, Package, CreditCard, Box, Truck, CheckCircle2, HelpCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface OrderStatusTimelineProps {
  currentStatus: string
  paymentStatus: string
  createdAt: string
  paidAt?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  expiryTime?: string | null
  trackingNumber?: string | null
  carrier?: string | null
  paymentMetadata?: any
}

type TimelineStep = {
  id: string
  label: string
  icon: React.ReactNode
  status: 'completed' | 'current' | 'pending' | 'expired'
  timestamp?: string | null
}

export function OrderStatusTimeline({
  currentStatus,
  paymentStatus,
  createdAt,
  paidAt,
  packedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  expiryTime,
  trackingNumber,
  carrier,
  paymentMetadata,
}: OrderStatusTimelineProps) {
  const { t } = useLanguage()
  
  console.log('🔍 [TIMELINE COMPONENT] Received props:', {
    currentStatus,
    paymentStatus,
    createdAt,
    paidAt,
    packedAt,
    shippedAt,
    deliveredAt,
    cancelledAt,
    trackingNumber,
    carrier
  })
  
  const getSteps = (): TimelineStep[] => {
    // Check if payment expired
    const isPaymentExpired = paymentStatus === 'pending' && expiryTime && new Date(expiryTime) < new Date()
    
    // If payment expired, show simplified timeline
    if (isPaymentExpired) {
      return [
        {
          id: 'placed',
          label: t.account.orderPlaced,
          icon: <Package className="w-5 h-5" />,
          status: 'completed',
          timestamp: createdAt,
        },
        {
          id: 'expired',
          label: t.account.paymentExpired,
          icon: <CreditCard className="w-5 h-5" />,
          status: 'expired',
          timestamp: expiryTime,
        },
      ]
    }
    
    // If order is cancelled, show simplified timeline
    if (currentStatus === 'cancelled') {
      // Use payment_metadata.expiry_time as primary source (from Midtrans webhook)
      const cancelTimestamp = paymentMetadata?.expiry_time || expiryTime || cancelledAt || createdAt
      
      return [
        {
          id: 'placed',
          label: t.account.orderPlaced,
          icon: <Package className="w-5 h-5" />,
          status: 'completed',
          timestamp: createdAt,
        },
        {
          id: 'cancelled',
          label: t.account.orderCancelledLabel,
          icon: <Package className="w-5 h-5" />,
          status: 'completed',
          timestamp: cancelTimestamp,
        },
      ]
    }
    
    const steps: TimelineStep[] = [
      {
        id: 'placed',
        label: t.account.orderPlaced,
        icon: <Package className="w-5 h-5" />,
        status: 'completed',
        timestamp: createdAt,
      },
      {
        id: 'paid',
        label: t.account.paymentConfirmed,
        icon: <CreditCard className="w-5 h-5" />,
        status: paymentStatus === 'completed' ? 'completed' : paymentStatus === 'pending' ? 'current' : 'pending',
        timestamp: paidAt,
      },
      {
        id: 'packed',
        label: t.account.orderPacked,
        icon: <Box className="w-5 h-5" />,
        status: packedAt ? 'completed' : currentStatus === 'processing' && paymentStatus === 'completed' ? 'current' : 'pending',
        timestamp: packedAt,
      },
      {
        id: 'shipped',
        label: t.account.shipped,
        icon: <Truck className="w-5 h-5" />,
        status: shippedAt ? 'completed' : currentStatus === 'shipped' ? 'current' : 'pending',
        timestamp: shippedAt,
      },
      {
        id: 'delivered',
        label: t.account.delivered,
        icon: <CheckCircle2 className="w-5 h-5" />,
        status: deliveredAt || currentStatus === 'completed' ? 'completed' : 'pending',
        timestamp: deliveredAt,
      },
    ]

    console.log('📊 [TIMELINE STEPS] Generated steps:', steps.map(s => ({
      id: s.id,
      status: s.status,
      timestamp: s.timestamp,
      hasTimestamp: !!s.timestamp
    })))

    return steps
  }

  const steps = getSteps()
  const currentStepIndex = steps.findIndex(step => step.status === 'current')

  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) {
      console.log('⚠️ [TIMESTAMP FORMAT] No timestamp provided')
      return null
    }
    const date = new Date(timestamp)
    const formatted = date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    })
    console.log('✅ [TIMESTAMP FORMAT] Formatted:', { input: timestamp, output: formatted })
    return formatted
  }

  const getStatusMessage = () => {
    // Check if payment expired
    if (paymentStatus === 'pending' && expiryTime && new Date(expiryTime) < new Date()) {
      return t.account.paymentExpired
    }
    if (currentStatus === 'cancelled') return t.account.orderCancelled
    if (currentStatus === 'completed') return t.account.orderDelivered
    if (currentStatus === 'shipped') return t.account.orderOnTheWay
    if (currentStatus === 'processing' && paymentStatus === 'completed') return t.account.preparingOrder
    if (paymentStatus === 'pending') return t.account.waitingPayment
    return t.account.orderProcessing
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-serif">{t.trackOrder.orderStatus}</h2>
          <a
            href="#help"
            className="inline-flex items-center gap-2 text-sm text-luxury-gold hover:text-luxury-gold/80 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t.trackOrder.needHelp}</span>
          </a>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-2">{getStatusMessage()}</p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Horizontal Timeline */}
        <div className="relative">
          {/* Desktop: Horizontal Layout */}
          <div className="hidden md:block">
            <div className="flex items-start justify-between relative">
              {/* Connector Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ 
                    width: `${(steps.filter(s => s.status === 'completed').length - 1) / (steps.length - 1) * 100}%` 
                  }}
                />
              </div>

              {/* Steps */}
              {steps.map((step, index) => {
                const isCompleted = step.status === 'completed'
                const isCurrent = step.status === 'current'
                const isExpired = step.status === 'expired'

                return (
                  <div key={step.id} className="flex flex-col items-center relative" style={{ width: `${100 / steps.length}%` }}>
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all z-10 bg-white',
                        isCompleted && 'bg-green-500 border-green-500 text-white',
                        isCurrent && 'bg-luxury-gold border-luxury-gold text-white animate-pulse',
                        isExpired && 'bg-red-500 border-red-500 text-white',
                        !isCompleted && !isCurrent && !isExpired && 'border-gray-300 text-gray-400'
                      )}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
                    </div>

                    {/* Label */}
                    <h3
                      className={cn(
                        'text-xs sm:text-sm font-semibold mt-3 text-center',
                        isCompleted && 'text-gray-900',
                        isCurrent && 'text-luxury-gold',
                        isExpired && 'text-red-600',
                        !isCompleted && !isCurrent && !isExpired && 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </h3>

                    {/* Timestamp */}
                    {step.timestamp && (
                      <span className="text-xs text-gray-500 mt-1 text-center">
                        {formatTimestamp(step.timestamp)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Tracking Info Below Timeline */}
            {trackingNumber && (
              <div className="mt-8 p-4 bg-blue-50 rounded-md border border-blue-100">
                <p className="text-xs text-gray-600 mb-1">{t.account.trackingNumber}</p>
                <p className="text-sm font-mono font-semibold text-blue-900">{trackingNumber}</p>
                {carrier && (
                  <p className="text-xs text-gray-600 mt-1">Carrier: {carrier}</p>
                )}
              </div>
            )}
          </div>

          {/* Mobile: Vertical Layout */}
          <div className="md:hidden">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1
              const isCompleted = step.status === 'completed'
              const isCurrent = step.status === 'current'
              const isExpired = step.status === 'expired'

              return (
                <div key={step.id} className="relative pb-8 last:pb-0">
                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute left-5 top-10 w-0.5 h-full -ml-px',
                        isCompleted ? 'bg-green-500' : isExpired ? 'bg-red-500' : 'bg-gray-200'
                      )}
                    />
                  )}

                  {/* Step Content */}
                  <div className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                        isCompleted && 'bg-green-500 border-green-500 text-white',
                        isCurrent && 'bg-luxury-gold border-luxury-gold text-white animate-pulse',
                        isExpired && 'bg-red-500 border-red-500 text-white',
                        !isCompleted && !isCurrent && !isExpired && 'bg-white border-gray-300 text-gray-400'
                      )}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <h3
                        className={cn(
                          'text-sm font-semibold',
                          isCompleted && 'text-gray-900',
                          isCurrent && 'text-luxury-gold',
                          isExpired && 'text-red-600',
                          !isCompleted && !isCurrent && !isExpired && 'text-gray-400'
                        )}
                      >
                        {step.label}
                      </h3>
                      {step.timestamp && (
                        <span className="text-xs text-gray-500 block mt-1">
                          {formatTimestamp(step.timestamp)}
                        </span>
                      )}

                      {/* Tracking Info */}
                      {step.id === 'shipped' && trackingNumber && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                          <p className="text-xs text-gray-600 mb-1">{t.account.trackingNumber}</p>
                          <p className="text-sm font-mono font-semibold text-blue-900">{trackingNumber}</p>
                          {carrier && (
                            <p className="text-xs text-gray-600 mt-1">Carrier: {carrier}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Shipping Info */}
        {(trackingNumber || carrier) && currentStatus === 'shipped' && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-luxury-navy/5 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">{t.account.shippingInformation}</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {carrier && <p>Carrier: <span className="font-medium text-gray-900">{carrier}</span></p>}
                {trackingNumber && (
                  <p>Tracking: <span className="font-mono text-xs font-medium text-gray-900">{trackingNumber}</span></p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">{t.account.questionsOrder}</p>
              <p className="text-sm text-gray-600 mb-4">{t.account.customerServiceTeam}</p>
            </div>
            <a 
              href="/contact"
              className="px-4 py-2 bg-luxury-gold text-white rounded-md hover:bg-luxury-gold/90 transition-colors text-sm font-medium whitespace-nowrap inline-block text-center"
            >
              {t.account.contactSupport}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
