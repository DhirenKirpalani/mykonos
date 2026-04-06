// Product management types

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
  created_at: string
  created_by: string | null
}

export interface ProductCollection {
  id: string
  product_id: string
  collection_id: string
  display_order: number
  created_at: string
}

export interface InventoryChange {
  id: string
  product_id: string
  changed_by: string
  old_quantity: number
  new_quantity: number
  change_amount: number
  reason: string | null
  created_at: string
}

export interface ProductFormData {
  name: string
  slug: string
  description: string
  price: number
  size: string
  category: string
  collection: string
  is_new: boolean
  stock_quantity: number
  fragrance_family?: string | null
  editorial_priority?: number
  is_visible: boolean
}

export interface ImageUploadData {
  image_url: string
  alt_text?: string
  display_order: number
  is_primary: boolean
}

export interface ImageReorderData {
  image_id: string
  display_order: number
}
