import { supabase } from './client';

export interface UserProfile {
  username: string | null;
  level: number;
  referral_count: number;
  preferred_exchange: string | null;
  total_minutes: number;
  points: number;
  referral_tier: string;
}

export async function getUserProfile(
  telegram_id: string
): Promise<{
  data: UserProfile | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username, level, referral_count, preferred_exchange, total_minutes, points, referral_tier')
      .eq('telegram_id', telegram_id)
      .single();

    if (error) {
      // If no rows found, return null data without error
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { data: null, error: error as Error };
  }
}