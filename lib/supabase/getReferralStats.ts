import { supabase } from './client';

export interface ReferralStats {
  total_referrals: number;
  verified_referrals: number;
  pending_referrals: number;
  total_minutes_earned: number;
  referral_tier: string;
}

export async function getReferralStats(
  telegram_id: string
): Promise<{
  data: ReferralStats | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .rpc('get_referral_stats', {
        p_telegram_id: telegram_id
      });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { data: null, error: error as Error };
  }
}