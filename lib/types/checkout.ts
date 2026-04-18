// Checkout and order types

export type CheckoutStep = 1 | 2 | 3 | 4 | 5 | 6

export const CHECKOUT_STEPS = {
  CUSTOMER_INFO: 1,
  SHIPPING_ADDRESS: 2,
  SHIPPING_METHOD: 3,
  PAYMENT: 4,
  REVIEW: 5,
  CONFIRMATION: 6,
} as const

export const CHECKOUT_STEP_NAMES: Record<CheckoutStep, string> = {
  1: 'Customer Information',
  2: 'Shipping Address',
  3: 'Shipping Method',
  4: 'Payment',
  5: 'Review Order',
  6: 'Confirmation',
}

export interface ShippingMethod {
  id: string
  region_id: string
  carrier_name: string
  service_name: string
  description: string | null
  base_cost: number
  estimated_days_min: number
  estimated_days_max: number
  is_active: boolean
  display_order: number
  created_at: string
}

export interface PaymentMethod {
  id: string
  region_id: string
  method_type: 'card' | 'paypal' | 'bank_transfer' | 'apple_pay' | 'google_pay'
  provider: string
  display_name: string
  is_active: boolean
  display_order: number
  created_at: string
}

export interface CheckoutSession {
  id: string
  user_id: string | null
  session_id: string | null
  current_step: CheckoutStep
  customer_email: string | null
  customer_phone: string | null
  shipping_address_id: string | null
  shipping_method_id: string | null
  payment_method_type: string | null
  promo_code_id: string | null
  cart_snapshot: any
  pricing_snapshot: any
  expires_at: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: string
  shipping_address_id: string | null
  shipping_method_id: string | null
  payment_gateway: string | null
  payment_status: string
  payment_intent_id: string | null
  subtotal: number
  discount_amount: number
  promo_code_id: string | null
  shipping_cost: number
  tax_amount: number
  total_amount: number
  currency_code: string
  notes: string | null
  is_locked: boolean
  completed_at: string | null
  created_at: string
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: string
  notes: string | null
  created_at: string
}

export interface CheckoutFormData {
  customer_email?: string
  customer_phone?: string
  shipping_address_id?: string
  shipping_method_id?: string
  payment_method_type?: string
}

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export interface PaymentResult {
  success: boolean
  payment_intent_id?: string
  error_message?: string
  order_id?: string
  order_number?: string
}
