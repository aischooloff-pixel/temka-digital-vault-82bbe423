export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_telegram_id: number
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_telegram_id: number
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_telegram_id?: number
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          data: Json | null
          state: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          data?: Json | null
          state: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          data?: Json | null
          state?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: string
          telegram_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          telegram_id: number
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          telegram_id?: number
        }
        Relationships: []
      }
      balance_history: {
        Row: {
          admin_telegram_id: number
          amount: number
          balance_after: number
          comment: string
          created_at: string
          id: string
          telegram_id: number
          type: string
        }
        Insert: {
          admin_telegram_id: number
          amount: number
          balance_after?: number
          comment?: string
          created_at?: string
          id?: string
          telegram_id: number
          type?: string
        }
        Update: {
          admin_telegram_id?: number
          amount?: number
          balance_after?: number
          comment?: string
          created_at?: string
          id?: string
          telegram_id?: number
          type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id: string
          is_active?: boolean
          name: string
          slug?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          content: string
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_price: number
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_price: number
          product_title: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_price?: number
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          balance_used: number
          created_at: string
          currency: string
          discount_amount: number
          id: string
          invoice_id: string | null
          notes: string | null
          order_number: string
          pay_url: string | null
          payment_status: string
          promo_code: string | null
          status: string
          telegram_id: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance_used?: number
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_number: string
          pay_url?: string | null
          payment_status?: string
          promo_code?: string | null
          status?: string
          telegram_id: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance_used?: number
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_number?: string
          pay_url?: string | null
          payment_status?: string
          promo_code?: string | null
          status?: string
          telegram_id?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_sessions: {
        Row: {
          data: Json | null
          state: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          data?: Json | null
          state?: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          data?: Json | null
          state?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          created_at: string
          first_name: string
          id: string
          is_premium: boolean
          language_code: string | null
          last_name: string | null
          photo_url: string | null
          subscription_expires_at: string | null
          subscription_status: string
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string
          id?: string
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      processed_invoices: {
        Row: {
          amount: number | null
          invoice_id: string
          order_id: string | null
          processed_at: string
          telegram_id: number | null
          type: string
        }
        Insert: {
          amount?: number | null
          invoice_id: string
          order_id?: string | null
          processed_at?: string
          telegram_id?: number | null
          type?: string
        }
        Update: {
          amount?: number | null
          invoice_id?: string
          order_id?: string | null
          processed_at?: string
          telegram_id?: number | null
          type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          delivery_type: string
          description: string
          features: string[]
          guarantee: string
          id: string
          image: string | null
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          is_popular: boolean
          old_price: number | null
          platform: string
          price: number
          region: string
          slug: string | null
          sort_order: number
          specifications: Json
          stock: number
          subcategory: string
          subtitle: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          delivery_type?: string
          description?: string
          features?: string[]
          guarantee?: string
          id?: string
          image?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_popular?: boolean
          old_price?: number | null
          platform?: string
          price: number
          region?: string
          slug?: string | null
          sort_order?: number
          specifications?: Json
          stock?: number
          subcategory?: string
          subtitle?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          delivery_type?: string
          description?: string
          features?: string[]
          guarantee?: string
          id?: string
          image?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_popular?: boolean
          old_price?: number | null
          platform?: string
          price?: number
          region?: string
          slug?: string | null
          sort_order?: number
          specifications?: Json
          stock?: number
          subcategory?: string
          subtitle?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promocodes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string
          avatar: string
          created_at: string
          id: string
          moderation_status: string
          product_id: string
          rating: number
          telegram_id: number | null
          text: string
          verified: boolean
        }
        Insert: {
          author: string
          avatar?: string
          created_at?: string
          id?: string
          moderation_status?: string
          product_id: string
          rating: number
          telegram_id?: number | null
          text?: string
          verified?: boolean
        }
        Update: {
          author?: string
          avatar?: string
          created_at?: string
          id?: string
          moderation_status?: string
          product_id?: string
          rating?: number
          telegram_id?: number | null
          text?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          shop_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          shop_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_inventory: {
        Row: {
          content: string
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          balance_used: number
          buyer_telegram_id: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          order_number: string
          pay_url: string | null
          payment_status: string
          shop_id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance_used?: number
          buyer_telegram_id: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          order_number: string
          pay_url?: string | null
          payment_status?: string
          shop_id: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance_used?: number
          buyer_telegram_id?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          order_number?: string
          pay_url?: string | null
          payment_status?: string
          shop_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          created_at: string
          description: string
          features: string[]
          id: string
          image: string | null
          is_active: boolean
          name: string
          old_price: number | null
          price: number
          shop_id: string
          sort_order: number
          stock: number
          subtitle: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          features?: string[]
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          old_price?: number | null
          price: number
          shop_id: string
          sort_order?: number
          stock?: number
          subtitle?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          features?: string[]
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          old_price?: number | null
          price?: number
          shop_id?: string
          sort_order?: number
          stock?: number
          subtitle?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_reviews: {
        Row: {
          author: string
          avatar: string
          created_at: string
          id: string
          moderation_status: string
          product_id: string | null
          rating: number
          shop_id: string
          telegram_id: number
          text: string
          verified: boolean
        }
        Insert: {
          author: string
          avatar?: string
          created_at?: string
          id?: string
          moderation_status?: string
          product_id?: string | null
          rating: number
          shop_id: string
          telegram_id: number
          text?: string
          verified?: boolean
        }
        Update: {
          author?: string
          avatar?: string
          created_at?: string
          id?: string
          moderation_status?: string
          product_id?: string | null
          rating?: number
          shop_id?: string
          telegram_id?: number
          text?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shop_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          bot_id: number | null
          bot_token_encrypted: string | null
          bot_username: string | null
          bot_validated_at: string | null
          color: string
          created_at: string
          cryptobot_token_encrypted: string | null
          hero_description: string
          hero_title: string
          id: string
          name: string
          owner_id: string
          slug: string
          status: string
          support_link: string
          updated_at: string
          webhook_status: string
          welcome_message: string
        }
        Insert: {
          bot_id?: number | null
          bot_token_encrypted?: string | null
          bot_username?: string | null
          bot_validated_at?: string | null
          color?: string
          created_at?: string
          cryptobot_token_encrypted?: string | null
          hero_description?: string
          hero_title?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          status?: string
          support_link?: string
          updated_at?: string
          webhook_status?: string
          welcome_message?: string
        }
        Update: {
          bot_id?: number | null
          bot_token_encrypted?: string | null
          bot_username?: string | null
          bot_validated_at?: string | null
          color?: string
          created_at?: string
          cryptobot_token_encrypted?: string | null
          hero_description?: string
          hero_title?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          status?: string
          support_link?: string
          updated_at?: string
          webhook_status?: string
          welcome_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          accepted_terms: boolean
          balance: number
          created_at: string
          first_name: string
          id: string
          internal_note: string | null
          is_blocked: boolean
          is_premium: boolean
          language_code: string | null
          last_name: string | null
          photo_url: string | null
          role: string
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          accepted_terms?: boolean
          balance?: number
          created_at?: string
          first_name?: string
          id?: string
          internal_note?: string | null
          is_blocked?: boolean
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          role?: string
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          accepted_terms?: boolean
          balance?: number
          created_at?: string
          first_name?: string
          id?: string
          internal_note?: string | null
          is_blocked?: boolean
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          role?: string
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_reviews: {
        Row: {
          author: string | null
          avatar: string | null
          created_at: string | null
          id: string | null
          moderation_status: string | null
          product_id: string | null
          rating: number | null
          text: string | null
          verified: boolean | null
        }
        Insert: {
          author?: string | null
          avatar?: string | null
          created_at?: string | null
          id?: string | null
          moderation_status?: string | null
          product_id?: string | null
          rating?: number | null
          text?: string | null
          verified?: boolean | null
        }
        Update: {
          author?: string | null
          avatar?: string | null
          created_at?: string | null
          id?: string | null
          moderation_status?: string | null
          product_id?: string | null
          rating?: number | null
          text?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_shop_reviews: {
        Row: {
          author: string | null
          avatar: string | null
          created_at: string | null
          id: string | null
          moderation_status: string | null
          product_id: string | null
          rating: number | null
          shop_id: string | null
          text: string | null
          verified: boolean | null
        }
        Insert: {
          author?: string | null
          avatar?: string | null
          created_at?: string | null
          id?: string | null
          moderation_status?: string | null
          product_id?: string | null
          rating?: number | null
          shop_id?: string | null
          text?: string | null
          verified?: boolean | null
        }
        Update: {
          author?: string | null
          avatar?: string | null
          created_at?: string | null
          id?: string | null
          moderation_status?: string | null
          product_id?: string | null
          rating?: number | null
          shop_id?: string | null
          text?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      credit_balance: {
        Args: { p_amount: number; p_telegram_id: number }
        Returns: number
      }
      decrypt_token: {
        Args: { p_encrypted: string; p_key: string }
        Returns: string
      }
      deduct_balance: {
        Args: { p_amount: number; p_telegram_id: number }
        Returns: number
      }
      encrypt_token: {
        Args: { p_key: string; p_token: string }
        Returns: string
      }
      increment_promo_usage: { Args: { p_code: string }; Returns: undefined }
      reserve_inventory: {
        Args: { p_order_id: string; p_product_id: string; p_quantity: number }
        Returns: {
          content: string
          id: string
        }[]
      }
      reserve_shop_inventory: {
        Args: { p_order_id: string; p_product_id: string; p_quantity: number }
        Returns: {
          content: string
          id: string
        }[]
      }
      validate_promo_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
