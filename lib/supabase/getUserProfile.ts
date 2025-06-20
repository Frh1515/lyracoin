import { supabase } from './client';

export interface UserProfile {
  username: string | null;
  level: number;
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

export async function getUserProfile(): Promise<{
  data: UserProfile | null;
  error: Error | null;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        data: null,
        error: new Error('User not authenticated')
      };
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        username, 
        level, 
        referral_count, 
        preferred_exchange, 
        total_minutes, 
        points, 
        referral_tier,
        lyra_balance,
        membership_level,
        profile_image,
        registration_bonus_applied,
        daily_game_sessions,
        last_game_session_date
      `)
      .eq('supabase_auth_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { data: null, error: error as Error };
  }
}