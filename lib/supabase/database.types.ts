export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      boosts: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          multiplier: number
          price_paid: number
          start_time: string
          transaction_hash: string
          user_telegram_id: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          multiplier: number
          price_paid: number
          start_time?: string
          transaction_hash: string
          user_telegram_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          multiplier?: number
          price_paid?: number
          start_time?: string
          transaction_hash?: string
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          platform: string
          points_reward: number
          task_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          platform: string
          points_reward?: number
          task_type?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          points_reward?: number
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      fixed_tasks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          platform: string
          points_reward: number
          task_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          platform: string
          points_reward?: number
          task_type?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          points_reward?: number
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          created_at: string | null
          id: string
          points_earned: number
          session_date: string | null
          user_telegram_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_earned?: number
          session_date?: string | null
          user_telegram_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_earned?: number
          session_date?: string | null
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      mining_sessions: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          end_time: string
          id: string
          minutes_earned: number | null
          start_time: string
          status: string
          user_telegram_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          minutes_earned?: number | null
          start_time?: string
          status?: string
          user_telegram_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          minutes_earned?: number | null
          start_time?: string
          status?: string
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_sessions_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      presale_purchases: {
        Row: {
          id: string
          lyra_units: number
          points_earned: number
          purchase_date: string | null
          transaction_hash: string
          user_telegram_id: string
        }
        Insert: {
          id?: string
          lyra_units: number
          points_earned: number
          purchase_date?: string | null
          transaction_hash: string
          user_telegram_id: string
        }
        Update: {
          id?: string
          lyra_units?: number
          points_earned?: number
          purchase_date?: string | null
          transaction_hash?: string
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presale_purchases_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      referral_claims: {
        Row: {
          claimed_at: string | null
          claimer_telegram_id: string
          id: string
          minutes_claimed: number
          referral_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimer_telegram_id: string
          id?: string
          minutes_claimed?: number
          referral_id: string
        }
        Update: {
          claimed_at?: string | null
          claimer_telegram_id?: string
          id?: string
          minutes_claimed?: number
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_claims_claimer_telegram_id_fkey"
            columns: ["claimer_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "referral_claims_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          user_telegram_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          user_telegram_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          claimed_at: string | null
          id: string
          minutes_rewarded: number
          referral_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          minutes_rewarded: number
          referral_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          id?: string
          minutes_rewarded?: number
          referral_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          lyra_amount: number
          status: string | null
          timestamp: string | null
          ton_amount: number
          transaction_hash: string
          wallet_address: string
        }
        Insert: {
          id?: string
          lyra_amount: number
          status?: string | null
          timestamp?: string | null
          ton_amount: number
          transaction_hash: string
          wallet_address: string
        }
        Update: {
          id?: string
          lyra_amount?: number
          status?: string | null
          timestamp?: string | null
          ton_amount?: number
          transaction_hash?: string
          wallet_address?: string
        }
        Relationships: []
      }
      user_daily_tasks: {
        Row: {
          completed_at: string | null
          completion_date: string | null
          daily_task_id: string
          id: string
          points_earned: number
          user_telegram_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_date?: string | null
          daily_task_id: string
          id?: string
          points_earned: number
          user_telegram_id: string
        }
        Update: {
          completed_at?: string | null
          completion_date?: string | null
          daily_task_id?: string
          id?: string
          points_earned?: number
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_tasks_daily_task_id_fkey"
            columns: ["daily_task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_tasks_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      user_fixed_tasks: {
        Row: {
          completed_at: string | null
          fixed_task_id: string
          id: string
          points_earned: number
          user_telegram_id: string
        }
        Insert: {
          completed_at?: string | null
          fixed_task_id: string
          id?: string
          points_earned: number
          user_telegram_id: string
        }
        Update: {
          completed_at?: string | null
          fixed_task_id?: string
          id?: string
          points_earned?: number
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fixed_tasks_fixed_task_id_fkey"
            columns: ["fixed_task_id"]
            isOneToOne: false
            referencedRelation: "fixed_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_fixed_tasks_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      user_mining_progress: {
        Row: {
          created_at: string | null
          current_session_minutes_mined: number | null
          daily_total_minutes_mined: number | null
          id: string
          last_claim_timestamp: string | null
          mining_start_time: string | null
          status: string | null
          updated_at: string | null
          user_telegram_id: string
        }
        Insert: {
          created_at?: string | null
          current_session_minutes_mined?: number | null
          daily_total_minutes_mined?: number | null
          id?: string
          last_claim_timestamp?: string | null
          mining_start_time?: string | null
          status?: string | null
          updated_at?: string | null
          user_telegram_id: string
        }
        Update: {
          created_at?: string | null
          current_session_minutes_mined?: number | null
          daily_total_minutes_mined?: number | null
          id?: string
          last_claim_timestamp?: string | null
          mining_start_time?: string | null
          status?: string | null
          updated_at?: string | null
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mining_progress_user_telegram_id_fkey"
            columns: ["user_telegram_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      users: {
        Row: {
          current_mining_session_id: string | null
          daily_game_sessions: number | null
          id: string
          last_game_session_date: string | null
          last_mining_claim_date: string | null
          level: number | null
          lyra_balance: number | null
          membership_level: string | null
          mining_sessions_today: number | null
          points: number | null
          preferred_exchange: string | null
          profile_image: string | null
          referral_count: number | null
          referral_tier: string | null
          registered_at: string | null
          registration_bonus_applied: boolean | null
          supabase_auth_id: string | null
          telegram_id: string
          total_minutes: number | null
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          current_mining_session_id?: string | null
          daily_game_sessions?: number | null
          id?: string
          last_game_session_date?: string | null
          last_mining_claim_date?: string | null
          level?: number | null
          lyra_balance?: number | null
          membership_level?: string | null
          mining_sessions_today?: number | null
          points?: number | null
          preferred_exchange?: string | null
          profile_image?: string | null
          referral_count?: number | null
          referral_tier?: string | null
          registered_at?: string | null
          registration_bonus_applied?: boolean | null
          supabase_auth_id?: string | null
          telegram_id: string
          total_minutes?: number | null
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          current_mining_session_id?: string | null
          daily_game_sessions?: number | null
          id?: string
          last_game_session_date?: string | null
          last_mining_claim_date?: string | null
          level?: number | null
          lyra_balance?: number | null
          membership_level?: string | null
          mining_sessions_today?: number | null
          points?: number | null
          preferred_exchange?: string | null
          profile_image?: string | null
          referral_count?: number | null
          referral_tier?: string | null
          registered_at?: string | null
          registration_bonus_applied?: boolean | null
          supabase_auth_id?: string | null
          telegram_id?: string
          total_minutes?: number | null
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_supabase_auth_id_fkey"
            columns: ["supabase_auth_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_boost_to_mining: {
        Args: {
          p_user_telegram_id: string
        }
        Returns: {
          success: boolean
          message: string
          minutes_earned: number
          multiplier: number
        }
      }
      claim_daily_task: {
        Args: {
          p_user_telegram_id: string
          p_daily_task_id: string
        }
        Returns: {
          success: boolean
          message: string
          points_earned: number
        }
      }
      claim_fixed_task: {
        Args: {
          p_user_telegram_id: string
          p_fixed_task_id: string
        }
        Returns: {
          success: boolean
          message: string
          points_earned: number
        }
      }
      claim_mining_rewards: {
        Args: {
          p_user_telegram_id: string
        }
        Returns: {
          success: boolean
          message: string
          minutes_earned: number
          points_earned: number
        }
      }
      claim_referral_reward_secure: {
        Args: {
          p_referral_id: string
          p_claimer_telegram_id: string
        }
        Returns: {
          success: boolean
          message: string
          minutes_earned: number
        }
      }
      generate_referral_code: {
        Args: {
          p_telegram_id: string
        }
        Returns: string
      }
      get_current_mining_status: {
        Args: {
          p_user_telegram_id: string
        }
        Returns: {
          status: string
          start_time: string
          end_time: string
          minutes_earned: number
          can_claim: boolean
          session_active: boolean
          time_remaining_seconds: number
          last_claim_date: string
        }
      }
      get_referral_stats_secure: {
        Args: {
          p_telegram_id: string
        }
        Returns: {
          total_referrals: number
          verified_referrals: number
          pending_referrals: number
          total_minutes_earned: number
          referral_tier: string
          all_referrals: Json
          unclaimed_referrals: Json
        }
      }
      process_referral: {
        Args: {
          p_referrer_telegram_id: string
          p_referred_telegram_id: string
        }
        Returns: {
          success: boolean
          message: string
          referral_id: string
        }
      }
      record_daily_game_session: {
        Args: {
          p_user_telegram_id: string
        }
        Returns: {
          success: boolean
          message: string
          points_earned: number
          sessions_remaining: number
        }
      }
      register_telegram_user: {
        Args: {
          p_telegram_id: string
          p_supabase_auth_id: string
          p_username?: string
          p_level?: number
        }
        Returns: {
          id: string
          telegram_id: string
          username: string
          level: number
          points: number
          total_minutes: number
          referral_count: number
          referral_tier: string
          lyra_balance: number
          membership_level: string
          registration_bonus_applied: boolean
        }
      }
      safe_recalculate_referral_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          success: boolean
          message: string
          users_processed: number
          total_points_awarded: number
        }
      }
      start_mining_session: {
        Args: {
          p_user_telegram_id: string
        }
        Returns: {
          success: boolean
          message: string
          end_time: string
        }
      }
      update_user_minutes: {
        Args: {
          p_supabase_auth_id: string
          p_minutes_earned: number
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicTableNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicTableNameOrOptions]
    : never