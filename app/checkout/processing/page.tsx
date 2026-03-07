'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/common'

export default function ProcessingPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear Buy Now item from sessionStorage
    sessionStorage.removeItem('buyNowItem')
    
    // Redirect to home after a brief moment
    // The Midtrans callback should have already redirected to confirmation
    const timeout = setTimeout(() => {
      router.push('/')
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing your payment...</h2>
        <p className="mt-2 text-gray-600">Please wait while we confirm your order</p>
      </div>
    </div>
  )
}
