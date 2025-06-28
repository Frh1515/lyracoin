import { supabase } from './client';

export async function claimReferralRewardSecure(
  referralId: string
): Promise<{
  success: boolean;
  message: string;
  minutesEarned?: number;
  debug?: any;
}> {
  try {
    console.log('🔄 Starting claimReferralRewardSecure for referral ID:', referralId);
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError || 'No user found');
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    console.log('✅ User authenticated:', user.id);

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id, username')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ User lookup error:', userError || 'No user data found');
      return {
        success: false,
        message: 'User not found'
      };
    }

    console.log('✅ User data found:', {
      telegramId: userData.telegram_id,
      username: userData.username || 'مستخدم جديد'
    });

    // Claim reward using secure RPC function
    const { data, error } = await supabase.rpc('claim_referral_reward_secure', {
      p_referral_id: referralId,
      p_claimer_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('❌ RPC Error claiming referral reward:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ RPC call successful, result:', data);

    return {
      success: data.success,
      message: data.message,
      minutesEarned: data.minutes_earned,
      debug: data
    };
  } catch (error) {
    console.error('❌ Error claiming referral reward:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim reward'
    };
  }
}