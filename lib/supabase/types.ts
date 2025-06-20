export interface User {
  id: string;
  telegram_id: string;
  supabase_auth_id: string;
  username: string | null;
  level: number;
  wallet_address: string | null;
  registered_at: string;
  referral_count: number;
  preferred_exchange: string | null;
  total_minutes: number;
  points: number;
  referral_tier: string;
  lyra_balance: number;
  membership_level: string;
  profile_image: string | null;
  registration_bonus_applied: boolean;
  daily_game_sessions: number;
  last_game_session_date: string;
}

export interface Task {
  id: string;
  platform: string;
  title: string;
  description: string;
  minutes_reward: number;
  points_reward: number;
  type: string;
  is_daily: boolean;
  created_at: string;
}

export interface FixedTask {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  platform: string;
  task_type: string;
  is_active: boolean;
  created_at: string;
  link?: string; // Optional link property for task URLs
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  platform: string;
  task_type: string;
  is_active: boolean;
  created_at: string;
}

export interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  completed_at: string;
  minutes_earned: number;
  points_earned: number;
}

export interface UserFixedTask {
  id: string;
  user_telegram_id: string;
  fixed_task_id: string;
  points_earned: number;
  completed_at: string;
}

export interface UserDailyTask {
  id: string;
  user_telegram_id: string;
  daily_task_id: string;
  points_earned: number;
  completed_at: string;
  completion_date: string;
}

export interface GameSession {
  id: string;
  user_telegram_id: string;
  points_earned: number;
  session_date: string;
  created_at: string;
}

export interface PresalePurchase {
  id: string;
  user_telegram_id: string;
  lyra_units: number;
  points_earned: number;
  transaction_hash: string;
  purchase_date: string;
}

export interface UserMiningProgress {
  id: string;
  user_telegram_id: string;
  mining_start_time: string | null;
  current_session_minutes_mined: number;
  daily_total_minutes_mined: number;
  last_claim_timestamp: string | null;
  status: 'idle' | 'mining' | 'ready_to_claim';
  created_at: string;
  updated_at: string;
}

export interface MiningStatus {
  status: 'idle' | 'mining' | 'ready_to_claim';
  mining_start_time: string | null;
  current_session_minutes_mined: number;
  daily_total_minutes_mined: number;
  last_claim_timestamp: string | null;
  hours_since_last_claim: number;
  can_claim: boolean;
  mining_active: boolean;
  countdown_remaining_minutes: number;
  total_accumulated_minutes: number;
}

export interface Referral {
  id: string;
  inviter_id: string;
  invitee_id: string;
  invite_code: string;
  created_at: string;
}

export type UserStats = {
  total_points: number;
  level: number;
  registration_date: string;
  current_balance: number;
  referral_count: number;
}