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
      users: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          country: string
          preferred_language: string
          email_verified: boolean
          email_verified_at: string | null
          role: string
          role_assigned_at: string | null
          role_assigned_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          country?: string
          preferred_language?: string
          email_verified?: boolean
          email_verified_at?: string | null
          role?: string
          role_assigned_at?: string | null
          role_assigned_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          country?: string
          preferred_language?: string
          email_verified?: boolean
          email_verified_at?: string | null
          role?: string
          role_assigned_at?: string | null
          role_assigned_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shipping_addresses: {
        Row: {
          id: string
          user_id: string
          full_name: string
          address_line1: string
          address_line2: string | null
          city: string
          state_province: string
          postal_code: string
          country: string
          phone: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          address_line1: string
          address_line2?: string | null
          city: string
          state_province: string
          postal_code: string
          country: string
          phone: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state_province?: string
          postal_code?: string
          country?: string
          phone?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used?: boolean
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          price_usd: number
          price_idr: number
          sale_price: number | null
          size: string
          category: string
          collection: string
          is_new: boolean
          image_urls: string[]
          stock_quantity: number
          fragrance_family: string | null
          editorial_priority: number
          is_archived: boolean
          is_visible: boolean
          archived_at: string | null
          archived_by: string | null
          last_modified_by: string | null
          pilih_lokal: boolean
          rating: number
          products_sold: number
          is_popular: boolean
          is_best_selling: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          price_usd: number
          price_idr: number
          sale_price?: number | null
          size: string
          category: string
          collection: string
          is_new?: boolean
          image_urls: string[]
          stock_quantity?: number
          fragrance_family?: string | null
          editorial_priority?: number
          is_archived?: boolean
          is_visible?: boolean
          archived_at?: string | null
          archived_by?: string | null
          last_modified_by?: string | null
          pilih_lokal?: boolean
          rating?: number
          products_sold?: number
          is_popular?: boolean
          is_best_selling?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          price_usd?: number
          price_idr?: number
          sale_price?: number | null
          size?: string
          category?: string
          collection?: string
          is_new?: boolean
          image_urls?: string[]
          stock_quantity?: number
          fragrance_family?: string | null
          editorial_priority?: number
          is_archived?: boolean
          is_visible?: boolean
          archived_at?: string | null
          archived_by?: string | null
          last_modified_by?: string | null
          pilih_lokal?: boolean
          rating?: number
          products_sold?: number
          is_popular?: boolean
          is_best_selling?: boolean
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
          user_id: string | null
          product_id: string
          quantity: number
          session_id: string | null
          price_at_add: number | null
          variant_name: string | null
          variant_sku: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          product_id: string
          quantity?: number
          session_id?: string | null
          price_at_add?: number | null
          variant_name?: string | null
          variant_sku?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          product_id?: string
          quantity?: number
          session_id?: string | null
          price_at_add?: number | null
          variant_name?: string | null
          variant_sku?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string | null
          status: string
          shipping_address: Json
          shipping_address_id: string | null
          shipping_method_id: string | null
          payment_method: string | null
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
          tracking_number: string | null
          carrier_code: string | null
          shipped_at: string | null
          delivered_at: string | null
          estimated_delivery_date: string | null
          internal_notes: string | null
          packed_at: string | null
          packed_by: string | null
          assigned_to: string | null
          priority: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number?: string | null
          status?: string
          shipping_address: Json
          shipping_address_id?: string | null
          shipping_method_id?: string | null
          payment_method?: string | null
          payment_status?: string
          payment_intent_id?: string | null
          subtotal?: number
          discount_amount?: number
          promo_code_id?: string | null
          shipping_cost?: number
          tax_amount?: number
          total_amount?: number
          currency_code?: string
          notes?: string | null
          is_locked?: boolean
          tracking_number?: string | null
          carrier_code?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          internal_notes?: string | null
          packed_at?: string | null
          packed_by?: string | null
          assigned_to?: string | null
          priority?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string | null
          status?: string
          shipping_address?: Json
          shipping_address_id?: string | null
          shipping_method_id?: string | null
          payment_method?: string | null
          payment_status?: string
          payment_intent_id?: string | null
          subtotal?: number
          discount_amount?: number
          promo_code_id?: string | null
          shipping_cost?: number
          tax_amount?: number
          total_amount?: number
          currency_code?: string
          notes?: string | null
          is_locked?: boolean
          tracking_number?: string | null
          carrier_code?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          internal_notes?: string | null
          packed_at?: string | null
          packed_by?: string | null
          assigned_to?: string | null
          priority?: string
          completed_at?: string | null
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
      regions: {
        Row: {
          id: string
          code: string
          name: string
          currency_code: string
          currency_symbol: string
          tax_rate: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          currency_code: string
          currency_symbol: string
          tax_rate?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          currency_code?: string
          currency_symbol?: string
          tax_rate?: number
          is_active?: boolean
          created_at?: string
        }
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: string
          discount_value: number
          min_purchase_amount: number | null
          max_discount_amount: number | null
          usage_limit_global: number | null
          usage_limit_per_user: number | null
          usage_count: number
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          created_by: string | null
          last_modified_by: string | null
          disabled_at: string | null
          disabled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          discount_type: string
          discount_value: number
          min_purchase_amount?: number | null
          max_discount_amount?: number | null
          usage_limit_global?: number | null
          usage_limit_per_user?: number | null
          usage_count?: number
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_by?: string | null
          last_modified_by?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          min_purchase_amount?: number | null
          max_discount_amount?: number | null
          usage_limit_global?: number | null
          usage_limit_per_user?: number | null
          usage_count?: number
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_by?: string | null
          last_modified_by?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          permissions: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          permissions: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          permissions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      carrier_tracking_urls: {
        Row: {
          id: string
          carrier_code: string
          carrier_name: string
          tracking_url_template: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          carrier_code: string
          carrier_name: string
          tracking_url_template: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          carrier_code?: string
          carrier_name?: string
          tracking_url_template?: string
          is_active?: boolean
          created_at?: string
        }
      }
      product_regional_pricing: {
        Row: {
          id: string
          product_id: string
          region_id: string
          price: number
          sale_price: number | null
          pricing_type: string
          sale_start_date: string | null
          sale_end_date: string | null
          last_modified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          region_id: string
          price: number
          sale_price?: number | null
          pricing_type?: string
          sale_start_date?: string | null
          sale_end_date?: string | null
          last_modified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          region_id?: string
          price?: number
          sale_price?: number | null
          pricing_type?: string
          sale_start_date?: string | null
          sale_end_date?: string | null
          last_modified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      country_regions: {
        Row: {
          id: string
          country_code: string
          region_id: string
          is_shipping_available: boolean
          estimated_delivery_days_min: number | null
          estimated_delivery_days_max: number | null
          created_at: string
        }
        Insert: {
          id?: string
          country_code: string
          region_id: string
          is_shipping_available?: boolean
          estimated_delivery_days_min?: number | null
          estimated_delivery_days_max?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          country_code?: string
          region_id?: string
          is_shipping_available?: boolean
          estimated_delivery_days_min?: number | null
          estimated_delivery_days_max?: number | null
          created_at?: string
        }
      }
      shipping_zones: {
        Row: {
          id: string
          region_id: string
          name: string
          base_rate: number
          free_shipping_threshold: number | null
          created_at: string
        }
        Insert: {
          id?: string
          region_id: string
          name: string
          base_rate: number
          free_shipping_threshold?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          region_id?: string
          name?: string
          base_rate?: number
          free_shipping_threshold?: number | null
          created_at?: string
        }
      }
      homepage_banners: {
        Row: {
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
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          description?: string | null
          image_url: string
          cta_text?: string | null
          cta_link?: string | null
          display_order?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          description?: string | null
          image_url?: string
          cta_text?: string | null
          cta_link?: string | null
          display_order?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      featured_collections: {
        Row: {
          id: string
          collection_id: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      featured_products: {
        Row: {
          id: string
          product_id: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      fragrance_families: {
        Row: {
          id: string
          name: string
          description: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          display_order?: number
          created_at?: string
        }
      }
      promo_code_regions: {
        Row: {
          id: string
          promo_code_id: string
          region_id: string
          created_at: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          region_id: string
          created_at?: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          region_id?: string
          created_at?: string
        }
      }
      promo_code_usage: {
        Row: {
          id: string
          promo_code_id: string
          user_id: string
          order_id: string | null
          discount_amount: number
          used_at: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          user_id: string
          order_id?: string | null
          discount_amount: number
          used_at?: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          user_id?: string
          order_id?: string | null
          discount_amount?: number
          used_at?: string
        }
      }
      shipping_methods: {
        Row: {
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
        Insert: {
          id?: string
          region_id: string
          carrier_name: string
          service_name: string
          description?: string | null
          base_cost: number
          estimated_days_min: number
          estimated_days_max: number
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          region_id?: string
          carrier_name?: string
          service_name?: string
          description?: string | null
          base_cost?: number
          estimated_days_min?: number
          estimated_days_max?: number
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          region_id: string
          method_type: string
          provider: string
          display_name: string
          is_active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          region_id: string
          method_type: string
          provider: string
          display_name: string
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          region_id?: string
          method_type?: string
          provider?: string
          display_name?: string
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
      }
      checkout_sessions: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          current_step: number
          customer_email: string | null
          customer_phone: string | null
          shipping_address_id: string | null
          shipping_method_id: string | null
          payment_method_type: string | null
          promo_code_id: string | null
          cart_snapshot: Json | null
          pricing_snapshot: Json | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          current_step?: number
          customer_email?: string | null
          customer_phone?: string | null
          shipping_address_id?: string | null
          shipping_method_id?: string | null
          payment_method_type?: string | null
          promo_code_id?: string | null
          cart_snapshot?: Json | null
          pricing_snapshot?: Json | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          current_step?: number
          customer_email?: string | null
          customer_phone?: string | null
          shipping_address_id?: string | null
          shipping_method_id?: string | null
          payment_method_type?: string | null
          promo_code_id?: string | null
          cart_snapshot?: Json | null
          pricing_snapshot?: Json | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: string
          notes: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: string
          notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: string
          notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
      }
      shipment_tracking_events: {
        Row: {
          id: string
          order_id: string
          event_type: string
          event_status: string
          event_description: string | null
          location: string | null
          event_timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          event_type: string
          event_status: string
          event_description?: string | null
          location?: string | null
          event_timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          event_type?: string
          event_status?: string
          event_description?: string | null
          location?: string | null
          event_timestamp?: string
          created_at?: string
        }
      }
      chat_conversations: {
        Row: {
          id: string
          user_id: string | null
          guest_email: string | null
          guest_name: string | null
          order_id: string | null
          order_number: string | null
          status: string
          assigned_to: string | null
          subject: string | null
          created_at: string
          updated_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          order_id?: string | null
          order_number?: string | null
          status?: string
          assigned_to?: string | null
          subject?: string | null
          created_at?: string
          updated_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          order_id?: string | null
          order_number?: string | null
          status?: string
          assigned_to?: string | null
          subject?: string | null
          created_at?: string
          updated_at?: string
          closed_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_type: string
          sender_id: string | null
          sender_name: string | null
          message_text: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_type: string
          sender_id?: string | null
          sender_name?: string | null
          message_text: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_type?: string
          sender_id?: string | null
          sender_name?: string | null
          message_text?: string
          is_read?: boolean
          created_at?: string
        }
      }
      chat_attachments: {
        Row: {
          id: string
          message_id: string
          file_name: string
          file_url: string
          file_type: string | null
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_name: string
          file_url: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_name?: string
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }
      }
      role_change_log: {
        Row: {
          id: string
          user_id: string
          changed_by: string
          old_role: string | null
          new_role: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          changed_by: string
          old_role?: string | null
          new_role: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          changed_by?: string
          old_role?: string | null
          new_role?: string
          reason?: string | null
          created_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          alt_text: string | null
          display_order: number
          is_primary: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      product_collections: {
        Row: {
          id: string
          product_id: string
          collection_id: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          collection_id: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          collection_id?: string
          display_order?: number
          created_at?: string
        }
      }
      inventory_changes: {
        Row: {
          id: string
          product_id: string
          changed_by: string
          old_quantity: number
          new_quantity: number
          change_amount: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          changed_by: string
          old_quantity: number
          new_quantity: number
          change_amount: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          changed_by?: string
          old_quantity?: number
          new_quantity?: number
          change_amount?: number
          reason?: string | null
          created_at?: string
        }
      }
      order_notes: {
        Row: {
          id: string
          order_id: string
          note: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          note: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          note?: string
          created_by?: string
          created_at?: string
        }
      }
      customer_tags: {
        Row: {
          id: string
          name: string
          color: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          description?: string | null
          created_at?: string
        }
      }
      customer_tag_assignments: {
        Row: {
          id: string
          user_id: string
          tag_id: string
          assigned_by: string
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tag_id: string
          assigned_by: string
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tag_id?: string
          assigned_by?: string
          assigned_at?: string
        }
      }
      customer_notes: {
        Row: {
          id: string
          user_id: string
          note: string
          is_important: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note: string
          is_important?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          note?: string
          is_important?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}