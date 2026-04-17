'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

export default function StripeSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    if (orderId) {
      // Small delay to ensure webhook has processed
      setTimeout(() => {
        setIsProcessing(false)
        // Redirect to order details
        router.push(`/account/orders/${orderId}`)
      }, 2000)
    } else {
      // No order ID, redirect to home
      setTimeout(() => {
        router.push('/')
      }, 3000)
    }
  }, [orderId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {isProcessing ? (
          <>
            <Loader2 className="h-16 w-16 text-luxury-gold mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment...</h1>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">Redirecting to your order details...</p>
          </>
        )}
      </div>
    </div>
  )
}
