'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package, Loader2 } from 'lucide-react'

interface FulfillOrderButtonProps {
  orderId: string
  orderNumber: string
  orderStatus: string
  paymentStatus: string
  onSuccess?: () => void
}

export function FulfillOrderButton({
  orderId,
  orderNumber,
  orderStatus,
  paymentStatus,
  onSuccess,
}: FulfillOrderButtonProps) {
  const [isFulfilling, setIsFulfilling] = useState(false)

  const canFulfill = 
    paymentStatus === 'completed' && 
    !['cancelled', 'refunded', 'shipped', 'delivered'].includes(orderStatus)

  const handleFulfill = async () => {
    if (!canFulfill) {
      toast.error('Order cannot be fulfilled in current state')
      return
    }

    setIsFulfilling(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/admin/shipping/fulfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create shipping job')
      }

      const result = await response.json()

      toast.success(
        <div>
          <div className="font-semibold">Shipping job created!</div>
          <div className="text-sm text-muted-foreground mt-1">
            Order {orderNumber} will be processed by the worker service.
          </div>
        </div>
      )

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to fulfill order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create shipping job')
    } finally {
      setIsFulfilling(false)
    }
  }

  if (!canFulfill) {
    return (
      <Button variant="outline" disabled size="sm">
        <Package className="h-4 w-4 mr-2" />
        Cannot Fulfill
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleFulfill}
      disabled={isFulfilling}
    >
      {isFulfilling ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating Job...
        </>
      ) : (
        <>
          <Package className="h-4 w-4 mr-2" />
          Fulfill Order
        </>
      )}
    </Button>
  )
}
