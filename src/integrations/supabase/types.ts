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
      challenges: {
        Row: {
          created_at: string
          current_balance: number
          daily_pnl: number
          end_date: string | null
          id: string
          initial_balance: number
          max_daily_loss_percent: number
          max_total_loss_percent: number
          plan: Database["public"]["Enums"]["challenge_plan"]
          profit_target_percent: number
          start_date: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          total_pnl: number
          trading_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance: number
          daily_pnl?: number
          end_date?: string | null
          id?: string
          initial_balance: number
          max_daily_loss_percent?: number
          max_total_loss_percent?: number
          plan?: Database["public"]["Enums"]["challenge_plan"]
          profit_target_percent?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          total_pnl?: number
          trading_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          daily_pnl?: number
          end_date?: string | null
          id?: string
          initial_balance?: number
          max_daily_loss_percent?: number
          max_total_loss_percent?: number
          plan?: Database["public"]["Enums"]["challenge_plan"]
          profit_target_percent?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          total_pnl?: number
          trading_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          challenge_id: string | null
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          payment_status: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          challenge_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          challenge_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          challenge_id: string
          closed_at: string | null
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number
          exit_price: number | null
          id: string
          opened_at: string
          pnl: number | null
          quantity: number
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          closed_at?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          pnl?: number | null
          quantity: number
          status?: string
          symbol: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          closed_at?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          pnl?: number | null
          quantity?: number
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_update_challenge_status: {
        Args: {
          _challenge_id: string
          _new_status: Database["public"]["Enums"]["challenge_status"]
        }
        Returns: boolean
      }
      get_admin_users_data: {
        Args: never
        Returns: {
          challenge_id: string
          created_at: string
          email: string
          full_name: string
          initial_balance: number
          plan: Database["public"]["Enums"]["challenge_plan"]
          status: Database["public"]["Enums"]["challenge_status"]
          total_pnl: number
          user_id: string
        }[]
      }
      get_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          last_activity: string
          plan: Database["public"]["Enums"]["challenge_plan"]
          profit_percent: number
          status: Database["public"]["Enums"]["challenge_status"]
          total_trades: number
          winning_trades: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "superadmin" | "user"
      challenge_plan: "starter" | "pro" | "elite"
      challenge_status: "pending" | "active" | "passed" | "failed" | "funded"
      trade_direction: "buy" | "sell"
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
      app_role: ["admin", "superadmin", "user"],
      challenge_plan: ["starter", "pro", "elite"],
      challenge_status: ["pending", "active", "passed", "failed", "funded"],
      trade_direction: ["buy", "sell"],
    },
  },
} as const
