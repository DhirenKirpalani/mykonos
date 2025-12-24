export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          price: number
          sale_price: number | null
          size: string
          category: string
          collection: string
          is_new: boolean
          image_urls: string[]
          stock_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          price: number
          sale_price?: number | null
          size: string
          category: string
          collection: string
          is_new?: boolean
          image_urls: string[]
          stock_quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          price?: number
          sale_price?: number | null
          size?: string
          category?: string
          collection?: string
          is_new?: boolean
          image_urls?: string[]
          stock_quantity?: number
          created_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          hero_image_url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          hero_image_url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          hero_image_url?: string
          display_order?: number
          created_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: string
          total_amount: number
          shipping_address: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status: string
          total_amount: number
          shipping_address: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          total_amount?: number
          shipping_address?: Json
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          price_at_purchase: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          price_at_purchase: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          price_at_purchase?: number
          created_at?: string
        }
      }
    }
  }
}
