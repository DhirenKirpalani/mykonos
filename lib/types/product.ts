// Product and catalog types

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  sale_price: number | null
  size: string
  category: string
  collection: string
  fragrance_family: string | null
  is_new: boolean
  editorial_priority: number
  image_urls: string[]
  stock_quantity: number
  created_at: string
}

export interface FragranceFamily {
  id: string
  name: string
  description: string | null
  display_order: number
  created_at: string
}

export interface HomepageBanner {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image_url: string
  cta_text: string | null
  cta_link: string | null
  display_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface FeaturedCollection {
  id: string
  collection_id: string
  display_order: number
  is_active: boolean
  created_at: string
  collection?: any
}

export interface FeaturedProduct {
  id: string
  product_id: string
  display_order: number
  is_active: boolean
  created_at: string
  product?: Product
}

export type SortOption = 'editorial' | 'price-asc' | 'price-desc' | 'new-arrivals'

export interface ProductFilters {
  collection?: string
  fragrance_family?: string
  price_min?: number
  price_max?: number
  in_stock?: boolean
  search?: string
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
