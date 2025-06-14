import { supabase } from './client';

export async function claimReferralRewardSecure(
  referralId: string
): Promise<{
  success: boolean;
  message: string;
  minutesEarned?: number;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Claim reward using secure RPC function
    const { data, error } = await supabase.rpc('claim_referral_reward_secure', {
      p_referral_id: referralId,
      p_claimer_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error claiming referral reward:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      minutesEarned: data.minutes_earned
    };
  } catch (error) {
    console.error('Error claiming referral reward:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim reward'
    };
  }
}