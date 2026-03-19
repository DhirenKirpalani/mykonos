'use client'

import { Check, Package, CreditCard, Box, Truck, CheckCircle2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderStatusTimelineProps {
  currentStatus: string
  paymentStatus: string
  createdAt: string
  paidAt?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  trackingNumber?: string | null
  carrier?: string | null
}

type TimelineStep = {
  id: string
  label: string
  icon: React.ReactNode
  status: 'completed' | 'current' | 'pending'
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
  trackingNumber,
  carrier,
}: OrderStatusTimelineProps) {
  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: 'placed',
        label: 'Order Placed',
        icon: <Package className="w-5 h-5" />,
        status: 'completed',
        timestamp: createdAt,
      },
      {
        id: 'paid',
        label: 'Payment Confirmed',
        icon: <CreditCard className="w-5 h-5" />,
        status: paymentStatus === 'completed' ? 'completed' : paymentStatus === 'pending' ? 'current' : 'pending',
        timestamp: paidAt,
      },
      {
        id: 'packed',
        label: 'Order Packed',
        icon: <Box className="w-5 h-5" />,
        status: packedAt ? 'completed' : currentStatus === 'processing' && paymentStatus === 'completed' ? 'current' : 'pending',
        timestamp: packedAt,
      },
      {
        id: 'shipped',
        label: 'Shipped',
        icon: <Truck className="w-5 h-5" />,
        status: shippedAt ? 'completed' : currentStatus === 'shipped' ? 'current' : 'pending',
        timestamp: shippedAt,
      },
      {
        id: 'delivered',
        label: 'Delivered',
        icon: <CheckCircle2 className="w-5 h-5" />,
        status: deliveredAt || currentStatus === 'completed' ? 'completed' : 'pending',
        timestamp: deliveredAt,
      },
    ]

    return steps
  }

  const steps = getSteps()
  const currentStepIndex = steps.findIndex(step => step.status === 'current')

  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusMessage = () => {
    if (currentStatus === 'cancelled') return 'Order has been cancelled'
    if (currentStatus === 'completed') return 'Your order has been delivered!'
    if (currentStatus === 'shipped') return 'Your order is on the way'
    if (currentStatus === 'processing' && paymentStatus === 'completed') return 'We are preparing your order'
    if (paymentStatus === 'pending') return 'Waiting for payment confirmation'
    return 'Order is being processed'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-serif">Order Status</h2>
          <a
            href="#help"
            className="inline-flex items-center gap-2 text-sm text-luxury-gold hover:text-luxury-gold/80 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Need Help?</span>
          </a>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-2">{getStatusMessage()}</p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Timeline */}
        <div className="relative">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const isCompleted = step.status === 'completed'
            const isCurrent = step.status === 'current'

            return (
              <div key={step.id} className="relative pb-8 last:pb-0">
                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-5 top-10 w-0.5 h-full -ml-px',
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
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
                      !isCompleted && !isCurrent && 'bg-white border-gray-300 text-gray-400'
                    )}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-4">
                      <h3
                        className={cn(
                          'text-sm sm:text-base font-semibold',
                          isCompleted && 'text-gray-900',
                          isCurrent && 'text-luxury-gold',
                          !isCompleted && !isCurrent && 'text-gray-400'
                        )}
                      >
                        {step.label}
                      </h3>
                      {step.timestamp && (
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {formatTimestamp(step.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Additional Info */}
                    {step.id === 'shipped' && trackingNumber && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                        <p className="text-xs text-gray-600 mb-1">Tracking Number</p>
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

        {/* Shipping Info */}
        {(trackingNumber || carrier) && currentStatus === 'shipped' && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-luxury-navy/5 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Shipping Information</h4>
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
              <h4 className="font-semibold text-sm mb-1">Questions about your order?</h4>
              <p className="text-sm text-gray-600">Our customer service team is here to help</p>
            </div>
            <button 
              onClick={() => {
                // Open Tawk.to chat widget
                if (typeof window !== 'undefined' && (window as any).Tawk_API) {
                  (window as any).Tawk_API.maximize()
                }
              }}
              className="px-4 py-2 bg-luxury-gold text-white rounded-md hover:bg-luxury-gold/90 transition-colors text-sm font-medium whitespace-nowrap"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
