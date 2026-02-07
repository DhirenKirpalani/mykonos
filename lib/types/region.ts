// Region and localization types

export interface Region {
  id: string
  code: string
  name: string
  currency_code: string
  currency_symbol: string
  tax_rate: number
  is_active: boolean
  created_at: string
}

export interface CountryRegion {
  id: string
  country_code: string
  region_id: string
  is_shipping_available: boolean
  estimated_delivery_days_min: number | null
  estimated_delivery_days_max: number | null
  created_at: string
}

export interface RegionalPricing {
  id: string
  product_id: string
  region_id: string
  price: number
  sale_price: number | null
  created_at: string
  updated_at: string
}

export interface ShippingZone {
  id: string
  region_id: string
  name: string
  base_rate: number
  free_shipping_threshold: number | null
  created_at: string
}

export interface RegionDetectionResult {
  country_code: string
  region: Region
  country_region: CountryRegion
  shipping_zone: ShippingZone | null
  source: 'user_profile' | 'shipping_address' | 'ip_geolocation' | 'default'
}

export interface PriceDisplay {
  amount: number
  formatted: string
  currency_code: string
  currency_symbol: string
  original_amount?: number
  original_formatted?: string
  is_sale?: boolean
}
