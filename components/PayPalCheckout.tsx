'use client'

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { useState } from 'react'

interface PayPalCheckoutProps {
  orderId: string
  amount: number
  currency: string
  items: { name: string; price: number; quantity: number }[]
  shippingCost: number
  onSuccess: (data: { orderID: string; status: string }) => void
  onError?: (error: any) => void
}

function PayPalButtonInner({ orderId, amount, currency, items, shippingCost, onSuccess, onError }: PayPalCheckoutProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  const [captured, setCaptured] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  console.log('🔵 [PAYPAL-SDK] PayPalButtonInner mounted', {
    orderId,
    amount,
    currency,
    items: items?.length,
    shippingCost,
    isPending,
    isRejected,
  })

  if (isPending) {
    console.log('⏳ [PAYPAL-SDK] Script is loading...')
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent" />
        <p className="text-sm text-gray-500">Loading PayPal...</p>
      </div>
    )
  }

  if (isRejected) {
    console.error('❌ [PAYPAL-SDK] Script rejected! PayPal SDK failed to load.')
    console.error('❌ [PAYPAL-SDK] This usually means:')
    console.error('   - NEXT_PUBLIC_PAYPAL_CLIENT_ID is missing or invalid')
    console.error('   - Network/CORS issue loading the PayPal script')
    console.error('   - Invalid currency specified')
    console.error('❌ [PAYPAL-SDK] Current clientId:', process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? 'SET (length: ' + process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID.length + ')' : 'NOT SET')
    console.error('❌ [PAYPAL-SDK] Currency:', currency)
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-red-600 font-medium">Failed to load PayPal</p>
        <p className="text-xs text-gray-500">Please check your connection and try again</p>
        <p className="text-[10px] text-gray-400 mt-1">
          Client ID: {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? 'configured' : 'MISSING'} · Currency: {currency}
        </p>
      </div>
    )
  }

  console.log('✅ [PAYPAL-SDK] Script loaded successfully, rendering buttons')

  return (
    <div className="paypal-buttons-container">
      {errorMsg && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 }}
        disabled={captured}
        forceReRender={[amount, currency]}
        createOrder={async (_data, actions) => {
          console.log('🔵 [PAYPAL] createOrder called', { orderId, amount, currency, items, shippingCost })
          try {
            console.log('📡 [PAYPAL] Calling /api/paypal/create-order...')
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, items, shippingCost, totalAmount: amount, currency }),
            })
            console.log('📡 [PAYPAL] create-order response status:', response.status)
            const data = await response.json()
            console.log('📡 [PAYPAL] create-order response data:', data)
            if (!response.ok) {
              console.error('❌ [PAYPAL] create-order failed:', data)
              throw new Error(data.error || 'Failed to create PayPal order')
            }
            console.log('✅ [PAYPAL] PayPal order created, orderID:', data.orderID)
            return data.orderID
          } catch (err: any) {
            console.error('❌ [PAYPAL] createOrder error:', err)
            setErrorMsg(err.message || 'Failed to create order')
            throw err
          }
        }}
        onApprove={async (data, _actions) => {
          console.log('✅ [PAYPAL] Payment approved by user, orderID:', data.orderID)
          try {
            console.log('📡 [PAYPAL] Calling /api/paypal/capture-order...')
            const response = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paypalOrderId: data.orderID, orderId }),
            })
            console.log('📡 [PAYPAL] capture-order response status:', response.status)
            const captureData = await response.json()
            console.log('📡 [PAYPAL] capture-order response data:', captureData)
            if (!response.ok || !captureData.success) {
              console.error('❌ [PAYPAL] capture-order failed:', captureData)
              onError?.(captureData)
              return
            }
            console.log('✅ [PAYPAL] Payment captured successfully, status:', captureData.status)
            setCaptured(true)
            onSuccess({ orderID: data.orderID, status: captureData.status })
          } catch (err: any) {
            console.error('❌ [PAYPAL] onApprove error:', err)
            setErrorMsg(err.message || 'Payment capture failed')
            onError?.(err)
          }
        }}
        onError={(err) => {
          console.error('❌ [PAYPAL] PayPal button onError:', err)
          setErrorMsg('An error occurred with PayPal. Please try again.')
          onError?.(err)
        }}
      />
    </div>
  )
}

export function PayPalCheckout(props: PayPalCheckoutProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test'

  console.log('🔵 [PAYPAL-SDK] PayPalCheckout mounted', {
    clientId: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
    clientIdLength: clientId?.length,
    currency: props.currency,
    amount: props.amount,
    orderId: props.orderId,
  })

  if (!clientId || clientId === 'test') {
    console.error('❌ [PAYPAL-SDK] NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set or is "test"!')
    console.error('❌ [PAYPAL-SDK] Add NEXT_PUBLIC_PAYPAL_CLIENT_ID to your .env file and restart the dev server')
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: props.currency.toUpperCase(),
        intent: 'capture',
      }}
    >
      <PayPalButtonInner {...props} />
    </PayPalScriptProvider>
  )
}
