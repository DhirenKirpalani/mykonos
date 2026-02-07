// Shopping cart types

import { Product } from './product'

export interface CartItem {
  id: string
  user_id: string | null
  session_id: string | null
  product_id: string
  quantity: number
  price_at_add: number | null
  created_at: string
  updated_at: string
  product?: Product
}

export interface CartItemWithProduct extends CartItem {
  product: Product
}

export interface CartValidationIssue {
  cart_item_id: string
  is_valid: boolean
  issue_type: 'insufficient_stock' | 'price_changed' | 'product_not_found' | null
  issue_message: string | null
  current_price: number
  current_stock: number
}

export interface CartSummary {
  items: CartItemWithProduct[]
  item_count: number
  subtotal: number
  has_issues: boolean
  validation_issues: CartValidationIssue[]
}

export interface CartWithPricing extends CartSummary {
  discount: number
  discount_description: string | null
  shipping: number
  tax: number
  total: number
  promo_code_applied: string | null
}
