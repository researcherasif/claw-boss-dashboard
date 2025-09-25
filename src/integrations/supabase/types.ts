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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      invoices: {
        Row: {
          company_logo_url: string | null
          created_at: string
          created_by: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          pay_to_clowee_id: string
          updated_at: string
        }
        Insert: {
          company_logo_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          pay_to_clowee_id: string
          updated_at?: string
        }
        Update: {
          company_logo_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          pay_to_clowee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_pay_to_clowee_id_fkey"
            columns: ["pay_to_clowee_id"]
            isOneToOne: false
            referencedRelation: "pay_to_clowee"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_reports: {
        Row: {
          coin_count: number
          created_at: string
          created_by: string
          id: string
          machine_id: string
          prize_count: number
          report_date: string
          updated_at: string
        }
        Insert: {
          coin_count?: number
          created_at?: string
          created_by: string
          id?: string
          machine_id: string
          prize_count?: number
          report_date: string
          updated_at?: string
        }
        Update: {
          coin_count?: number
          created_at?: string
          created_by?: string
          id?: string
          machine_id?: string
          prize_count?: number
          report_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_reports_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          coin_price: number
          created_at: string
          doll_price: number
          duration: string
          electricity_cost: number
          id: string
          installation_date: string
          is_active: boolean
          location: string
          maintenance_percentage: number
          name: string
          profit_share_percentage: number
          owner_profit_share_percentage: number
          clowee_profit_share_percentage: number
          updated_at: string
          vat_percentage: number
        }
        Insert: {
          coin_price: number
          created_at?: string
          doll_price: number
          duration: string
          electricity_cost: number
          id?: string
          installation_date: string
          is_active?: boolean
          location: string
          maintenance_percentage: number
          name: string
          profit_share_percentage?: number
          owner_profit_share_percentage?: number
          clowee_profit_share_percentage?: number
          updated_at?: string
          vat_percentage: number
        }
        Update: {
          coin_price?: number
          created_at?: string
          doll_price?: number
          duration?: string
          electricity_cost?: number
          id?: string
          installation_date?: string
          is_active?: boolean
          location?: string
          maintenance_percentage?: number
          name?: string
          profit_share_percentage?: number
          owner_profit_share_percentage?: number
          clowee_profit_share_percentage?: number
          updated_at?: string
          vat_percentage?: number
        }
        Relationships: []
      }
      machine_change_logs: {
        Row: {
          id: string
          machine_id: string
          field: string
          old_value: string | null
          new_value: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          machine_id: string
          field: string
          old_value?: string | null
          new_value?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          machine_id?: string
          field?: string
          old_value?: string | null
          new_value?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_change_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_to_clowee: {
        Row: {
          created_at: string
          created_by: string
          electricity_cost: number
          end_date: string
          id: string
          machine_id: string
          maintenance_cost: number
          net_payable: number
          prize_cost: number
          profit_share_amount: number
          owner_profit_share_amount: number
          clowee_profit_share_amount: number
          start_date: string
          total_coins: number
          total_income: number
          total_prizes: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          created_at?: string
          created_by: string
          electricity_cost?: number
          end_date: string
          id?: string
          machine_id: string
          maintenance_cost?: number
          net_payable?: number
          prize_cost?: number
          profit_share_amount?: number
          owner_profit_share_amount?: number
          clowee_profit_share_amount?: number
          start_date: string
          total_coins?: number
          total_income?: number
          total_prizes?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          electricity_cost?: number
          end_date?: string
          id?: string
          machine_id?: string
          maintenance_cost?: number
          net_payable?: number
          prize_cost?: number
          profit_share_amount?: number
          owner_profit_share_amount?: number
          clowee_profit_share_amount?: number
          start_date?: string
          total_coins?: number
          total_income?: number
          total_prizes?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_to_clowee_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
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
      user_role: "super_admin" | "admin" | "accountant"
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
    Enums: {
      user_role: ["super_admin", "admin", "accountant"],
    },
  },
} as const
