export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      branches: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_business_enrollments: {
        Row: {
          business_id: string
          customer_id: string
          enrolled_at: string
          id: string
        }
        Insert: {
          business_id: string
          customer_id: string
          enrolled_at?: string
          id?: string
        }
        Update: {
          business_id?: string
          customer_id?: string
          enrolled_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_business_enrollments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_business_enrollments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_membership_state: {
        Row: {
          cashback_balance: number
          current_tier_id: string | null
          customer_program_id: string
          tier_upgraded_at: string | null
          total_spend: number
          total_transaction_count: number
          updated_at: string
        }
        Insert: {
          cashback_balance?: number
          current_tier_id?: string | null
          customer_program_id: string
          tier_upgraded_at?: string | null
          total_spend?: number
          total_transaction_count?: number
          updated_at?: string
        }
        Update: {
          cashback_balance?: number
          current_tier_id?: string | null
          customer_program_id?: string
          tier_upgraded_at?: string | null
          total_spend?: number
          total_transaction_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_membership_state_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_membership_state_customer_program_id_fkey"
            columns: ["customer_program_id"]
            isOneToOne: true
            referencedRelation: "customer_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_programs: {
        Row: {
          branch_id: string | null
          customer_id: string
          enrolled_at: string
          id: string
          is_active: boolean
          program_id: string
        }
        Insert: {
          branch_id?: string | null
          customer_id: string
          enrolled_at?: string
          id?: string
          is_active?: boolean
          program_id: string
        }
        Update: {
          branch_id?: string | null
          customer_id?: string
          enrolled_at?: string
          id?: string
          is_active?: boolean
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_programs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_programs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stamp_progress: {
        Row: {
          current_stamps: number
          customer_program_id: string
          total_redemptions: number
          total_stamps_earned: number
          updated_at: string
        }
        Insert: {
          current_stamps?: number
          customer_program_id: string
          total_redemptions?: number
          total_stamps_earned?: number
          updated_at?: string
        }
        Update: {
          current_stamps?: number
          customer_program_id?: string
          total_redemptions?: number
          total_stamps_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_stamp_progress_customer_program_id_fkey"
            columns: ["customer_program_id"]
            isOneToOne: true
            referencedRelation: "customer_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          display_name: string | null
          role: Database["public"]["Enums"]["member_role"]
          scope_id: string
          scope_type: Database["public"]["Enums"]["member_scope_type"]
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          display_name?: string | null
          role: Database["public"]["Enums"]["member_role"]
          scope_id: string
          scope_type: Database["public"]["Enums"]["member_scope_type"]
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          display_name?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["member_scope_type"]
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          auto_upgrade_rule_type: Database["public"]["Enums"]["tier_upgrade_rule"]
          auto_upgrade_threshold: number | null
          cashback_percentage: number
          color: string | null
          created_at: string
          id: string
          name: string
          program_id: string
          rank: number
          updated_at: string
        }
        Insert: {
          auto_upgrade_rule_type: Database["public"]["Enums"]["tier_upgrade_rule"]
          auto_upgrade_threshold?: number | null
          cashback_percentage: number
          color?: string | null
          created_at?: string
          id?: string
          name: string
          program_id: string
          rank: number
          updated_at?: string
        }
        Update: {
          auto_upgrade_rule_type?: Database["public"]["Enums"]["tier_upgrade_rule"]
          auto_upgrade_threshold?: number | null
          cashback_percentage?: number
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          program_id?: string
          rank?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program_membership_config"
            referencedColumns: ["program_id"]
          },
        ]
      }
      membership_voucher_options: {
        Row: {
          cashback_cost: number
          created_at: string
          description: string | null
          expiry_days: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          program_id: string
          updated_at: string
        }
        Insert: {
          cashback_cost: number
          created_at?: string
          description?: string | null
          expiry_days: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          program_id: string
          updated_at?: string
        }
        Update: {
          cashback_cost?: number
          created_at?: string
          description?: string | null
          expiry_days?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_voucher_options_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program_membership_config"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_membership_config: {
        Row: {
          cashback_redemption_mode: Database["public"]["Enums"]["cashback_redemption_mode"]
          program_id: string
        }
        Insert: {
          cashback_redemption_mode: Database["public"]["Enums"]["cashback_redemption_mode"]
          program_id: string
        }
        Update: {
          cashback_redemption_mode?: Database["public"]["Enums"]["cashback_redemption_mode"]
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_membership_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_stamp_config: {
        Row: {
          amount_per_stamp: number | null
          program_id: string
          reward_description: string | null
          stamp_mode: Database["public"]["Enums"]["stamp_mode"]
          stamp_target: number
          stamps_per_transaction: number
        }
        Insert: {
          amount_per_stamp?: number | null
          program_id: string
          reward_description?: string | null
          stamp_mode: Database["public"]["Enums"]["stamp_mode"]
          stamp_target: number
          stamps_per_transaction?: number
        }
        Update: {
          amount_per_stamp?: number | null
          program_id?: string
          reward_description?: string | null
          stamp_mode?: Database["public"]["Enums"]["stamp_mode"]
          stamp_target?: number
          stamps_per_transaction?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_stamp_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          business_id: string
          color_primary: string
          color_secondary: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["program_scope_type"]
          type: Database["public"]["Enums"]["program_type"]
          updated_at: string
        }
        Insert: {
          business_id: string
          color_primary?: string
          color_secondary?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["program_scope_type"]
          type: Database["public"]["Enums"]["program_type"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          color_primary?: string
          color_secondary?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["program_scope_type"]
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_tokens: {
        Row: {
          customer_program_id: string
          expires_at: string
          id: string
          is_used: boolean
          token: string
        }
        Insert: {
          customer_program_id: string
          expires_at: string
          id?: string
          is_used?: boolean
          token: string
        }
        Update: {
          customer_program_id?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_customer_program_id_fkey"
            columns: ["customer_program_id"]
            isOneToOne: false
            referencedRelation: "customer_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          branch_id: string | null
          business_id: string
          cashback_amount: number | null
          created_at: string
          customer_program_id: string
          id: string
          notes: string | null
          performed_by: string | null
          stamps_count: number | null
          tier_from_id: string | null
          tier_to_id: string | null
          transaction_amount: number | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          cashback_amount?: number | null
          created_at?: string
          customer_program_id: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          stamps_count?: number | null
          tier_from_id?: string | null
          tier_to_id?: string | null
          transaction_amount?: number | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          cashback_amount?: number | null
          created_at?: string
          customer_program_id?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          stamps_count?: number | null
          tier_from_id?: string | null
          tier_to_id?: string | null
          transaction_amount?: number | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_program_id_fkey"
            columns: ["customer_program_id"]
            isOneToOne: false
            referencedRelation: "customer_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tier_from_id_fkey"
            columns: ["tier_from_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tier_to_id_fkey"
            columns: ["tier_to_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          business_id: string
          code: string | null
          created_at: string
          customer_program_id: string
          expires_at: string
          id: string
          redeemed_at: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          transaction_id: string | null
          updated_at: string
          voucher_option_id: string
        }
        Insert: {
          business_id: string
          code?: string | null
          created_at?: string
          customer_program_id: string
          expires_at: string
          id?: string
          redeemed_at?: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          transaction_id?: string | null
          updated_at?: string
          voucher_option_id: string
        }
        Update: {
          business_id?: string
          code?: string | null
          created_at?: string
          customer_program_id?: string
          expires_at?: string
          id?: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          transaction_id?: string | null
          updated_at?: string
          voucher_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_customer_program_id_fkey"
            columns: ["customer_program_id"]
            isOneToOne: false
            referencedRelation: "customer_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_voucher_option_id_fkey"
            columns: ["voucher_option_id"]
            isOneToOne: false
            referencedRelation: "membership_voucher_options"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_passes: {
        Row: {
          customer_program_id: string
          id: string
          last_updated_at: string
          pass_identifier: string | null
          provider: Database["public"]["Enums"]["wallet_provider"]
          push_token: string | null
        }
        Insert: {
          customer_program_id: string
          id?: string
          last_updated_at?: string
          pass_identifier?: string | null
          provider: Database["public"]["Enums"]["wallet_provider"]
          push_token?: string | null
        }
        Update: {
          customer_program_id?: string
          id?: string
          last_updated_at?: string
          pass_identifier?: string | null
          provider?: Database["public"]["Enums"]["wallet_provider"]
          push_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_customer_program_id_fkey"
            columns: ["customer_program_id"]
            isOneToOne: false
            referencedRelation: "customer_programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_member_access: {
        Args: { uid: string }
        Returns: {
          branch_id: string
          business_id: string
          role: Database["public"]["Enums"]["member_role"]
          scope_type: Database["public"]["Enums"]["member_scope_type"]
        }[]
      }
    }
    Enums: {
      cashback_redemption_mode: "transaction_deduction" | "voucher"
      gender_type: "male" | "female" | "other"
      member_role: "owner" | "admin" | "cashier"
      member_scope_type: "business" | "branch"
      program_scope_type: "business" | "branch"
      program_type: "stamp" | "membership"
      stamp_mode: "per_transaction" | "amount_based"
      tier_upgrade_rule: "total_spend" | "transaction_count" | "manual_only"
      transaction_type:
        | "stamp_add"
        | "stamp_redemption"
        | "cashback_earn"
        | "cashback_redeem"
        | "tier_upgrade"
        | "voucher_issued"
      voucher_status: "active" | "redeemed" | "expired"
      wallet_provider: "apple" | "google" | "samsung"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cashback_redemption_mode: ["transaction_deduction", "voucher"],
      gender_type: ["male", "female", "other"],
      member_role: ["owner", "admin", "cashier"],
      member_scope_type: ["business", "branch"],
      program_scope_type: ["business", "branch"],
      program_type: ["stamp", "membership"],
      stamp_mode: ["per_transaction", "amount_based"],
      tier_upgrade_rule: ["total_spend", "transaction_count", "manual_only"],
      transaction_type: [
        "stamp_add",
        "stamp_redemption",
        "cashback_earn",
        "cashback_redeem",
        "tier_upgrade",
        "voucher_issued",
      ],
      voucher_status: ["active", "redeemed", "expired"],
      wallet_provider: ["apple", "google", "samsung"],
    },
  },
} as const

