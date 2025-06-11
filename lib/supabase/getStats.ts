import { supabase } from './client';
import type { UserStats } from './types';

export async function getStats(telegram_id: string): Promise<{
  data: UserStats | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_telegram_id: telegram_id })
      .single();

    if (error) throw error;

    return {
      data: {
        total_points: data.total_points,
        level: data.level,
        registration_date: data.registration_date,
        current_balance: data.current_balance,
        referral_count: data.referral_count
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { data: null, error: error as Error };
  }
}