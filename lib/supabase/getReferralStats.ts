import { supabase } from './client';

export interface ReferralStats {
  total_referrals: number;
  verified_referrals: number;
  pending_referrals: number;
  total_minutes_earned: number;
  referral_tier: string;
}

export async function getReferralStats(): Promise<{
  data: ReferralStats | null;
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

    // Get user's telegram_id first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    const { data, error } = await supabase
      .rpc('get_referral_stats', {
        p_telegram_id: userData.telegram_id
      });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { data: null, error: error as Error };
  }
}