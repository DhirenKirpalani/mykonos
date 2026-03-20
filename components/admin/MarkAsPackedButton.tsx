'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package, Loader2 } from 'lucide-react'

interface MarkAsPackedButtonProps {
  orderId: string
  orderNumber: string
  orderStatus: string
  paymentStatus: string
  packedAt?: string | null
  onSuccess?: () => void
}

export function MarkAsPackedButton({
  orderId,
  orderNumber,
  orderStatus,
  paymentStatus,
  packedAt,
  onSuccess,
}: MarkAsPackedButtonProps) {
  const [isMarking, setIsMarking] = useState(false)

  // Can only mark as packed if:
  // - Payment is completed
  // - Order is in processing status
  // - Not already packed
  const canMarkPacked = 
    paymentStatus === 'completed' && 
    orderStatus === 'processing' &&
    !packedAt

  const handleMarkPacked = async () => {
    if (!canMarkPacked) {
      toast.error('Order cannot be marked as packed in current state')
      return
    }

    setIsMarking(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/admin/orders/mark-packed', {
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
        throw new Error(error.error || 'Failed to mark as packed')
      }

      const result = await response.json()

      toast.success(
        <div>
          <div className="font-semibold">Order marked as packed!</div>
          <div className="text-sm text-muted-foreground mt-1">
            Order {orderNumber} is ready for shipment.
          </div>
        </div>
      )

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to mark order as packed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to mark as packed')
    } finally {
      setIsMarking(false)
    }
  }

  // If already packed, show status
  if (packedAt) {
    return (
      <Button variant="outline" disabled size="sm">
        <Package className="h-4 w-4 mr-2" />
        Already Packed
      </Button>
    )
  }

  // If can't pack, show disabled button
  if (!canMarkPacked) {
    return (
      <Button variant="outline" disabled size="sm">
        <Package className="h-4 w-4 mr-2" />
        Cannot Pack
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleMarkPacked}
      disabled={isMarking}
      className="bg-luxury-gold hover:bg-luxury-gold/90"
    >
      {isMarking ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Marking...
        </>
      ) : (
        <>
          <Package className="h-4 w-4 mr-2" />
          Mark as Packed
        </>
      )}
    </Button>
  )
}
