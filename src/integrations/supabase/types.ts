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
      user_profiles: {
        Row: {
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
