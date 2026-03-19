/**
 * Helper functions for order-first checkout architecture
 */

import { supabase } from '@/lib/supabase/client'

export interface PendingOrder {
  id: string
  order_number: string
  snap_token: string | null
  snap_redirect_url: string | null
  expiry_time: string | null
  payment_status: string
  total_amount: number
}

/**
 * Check if user has a pending order that can be resumed
 */
export async function findPendingOrder(userId?: string, sessionId?: string): Promise<PendingOrder | null> {
  if (!userId && !sessionId) return null

  let query = supabase
    .from('orders')
    .select('id, order_number, snap_token, snap_redirect_url, expiry_time, payment_status, total_amount')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  if (userId) {
    query = query.eq('user_id', userId)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data, error } = await query.single()

  if (error || !data) return null

  const order = data as any

  // Check if order has expired
  if (order.expiry_time && new Date(order.expiry_time) < new Date()) {
    return null
  }

  return order
}

/**
 * Get button text based on order state
 */
export function getCheckoutButtonText(
  pendingOrder: PendingOrder | null,
  isProcessing: boolean,
  t: any
): string {
  if (isProcessing) return t.checkout.processing || 'Processing...'
  if (pendingOrder) return 'Continue Payment'
  return t.checkout.placeOrder || 'Place Order'
}

/**
 * Get button icon based on order state
 */
export function shouldShowLockIcon(pendingOrder: PendingOrder | null): boolean {
  return !pendingOrder // Show lock only for new orders
}
