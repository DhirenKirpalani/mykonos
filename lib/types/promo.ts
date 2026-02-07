// Promo code and pricing types

export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number | null
  max_discount_amount: number | null
  usage_limit_global: number | null
  usage_limit_per_user: number | null
  usage_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PromoCodeRegion {
  id: string
  promo_code_id: string
  region_id: string
  created_at: string
}

export interface PromoCodeUsage {
  id: string
  promo_code_id: string
  user_id: string
  order_id: string | null
  discount_amount: number
  used_at: string
}

export interface PromoCodeValidation {
  is_valid: boolean
  error_message: string | null
  discount_amount: number
  promo_code_id: string | null
  promo_code?: PromoCode
}

export interface PricingCalculation {
  subtotal: number
  discount: number
  discount_type: 'promo_code' | 'sale' | null
  discount_description: string | null
  shipping: number
  tax: number
  total: number
  promo_code_applied: string | null
}

export type PricingType = 'local' | 'international' | 'standard'
