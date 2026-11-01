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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          color_mode: string
          copies: number
          created_at: string
          customer_name: string
          file_paths: Json
          id: string
          mobile: string | null
          order_code: string
          order_status: Database["public"]["Enums"]["order_status"]
          pages: number
          paper_size: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          screenshot_path: string | null
          service: string
          total_amount: number
          total_sides: number
          tracking_token: string
          updated_at: string
          utr: string | null
        }
        Insert: {
          color_mode: string
          copies: number
          created_at?: string
          customer_name: string
          file_paths?: Json
          id?: string
          mobile?: string | null
          order_code?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          pages: number
          paper_size: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          screenshot_path?: string | null
          service: string
          total_amount: number
          total_sides: number
          tracking_token?: string
          updated_at?: string
          utr?: string | null
        }
        Update: {
          color_mode?: string
          copies?: number
          created_at?: string
          customer_name?: string
          file_paths?: Json
          id?: string
          mobile?: string | null
          order_code?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          pages?: number
          paper_size?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          screenshot_path?: string | null
          service?: string
          total_amount?: number
          total_sides?: number
          tracking_token?: string
          updated_at?: string
          utr?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          gpay_number: string
          id: boolean
          payee_name: string
          qr_image: string | null
          qr_path: string | null
          updated_at: string
          upi_id: string
        }
        Insert: {
          gpay_number?: string
          id?: boolean
          payee_name?: string
          qr_image?: string | null
          qr_path?: string | null
          updated_at?: string
          upi_id?: string
        }
        Update: {
          gpay_number?: string
          id?: boolean
          payee_name?: string
          qr_image?: string | null
          qr_path?: string | null
          updated_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          available: boolean
          bulk_rate: number
          bulk_threshold: number
          color_mode: string
          id: string
          paper_size: string
          service: string
          standard_rate: number
        }
        Insert: {
          available?: boolean
          bulk_rate: number
          bulk_threshold?: number
          color_mode?: string
          id?: string
          paper_size?: string
          service: string
          standard_rate: number
        }
        Update: {
          available?: boolean
          bulk_rate?: number
          bulk_threshold?: number
          color_mode?: string
          id?: string
          paper_size?: string
          service?: string
          standard_rate?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      customer_pricing: {
        Args: never
        Returns: {
          available: boolean
          bulk_rate: number
          bulk_threshold: number
          color_mode: string
          id: string
          paper_size: string
          service: string
          standard_rate: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      public_payment_settings: {
        Args: never
        Returns: {
          gpay_number: string
          payee_name: string
          qr_image: string
          updated_at: string
          upi_id: string
        }[]
      }
      quote_print: {
        Args: {
          _color_mode: string
          _copies: number
          _pages: number
          _paper_size: string
          _service: string
        }
        Returns: {
          applicable_rate: number
          total_amount: number
          total_sides: number
        }[]
      }
      track_order: {
        Args: { _token: string }
        Returns: {
          copies: number
          created_at: string
          order_code: string
          order_status: Database["public"]["Enums"]["order_status"]
          pages: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          total_sides: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "received" | "printing" | "ready" | "picked_up"
      payment_status: "pending_verification" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      order_status: ["received", "printing", "ready", "picked_up"],
      payment_status: ["pending_verification", "verified", "rejected"],
    },
  },
} as const
