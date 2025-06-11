import { supabase } from './client';

export async function claimReferralReward(
  referral_id: string,
  telegram_id: string
): Promise<{
  success: boolean;
  message: string;
  minutes_earned?: number;
}> {
  try {
    // Start a Supabase transaction
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referral_id)
      .eq('referrer_id', telegram_id)
      .eq('status', 'verified')
      .eq('reward_claimed', false)
      .single();

    if (referralError || !referral) {
      return {
        success: false,
        message: 'Invalid or already claimed referral'
      };
    }

    const minutes_reward = 60; // Standard reward amount

    // Record reward claim
    const { error: rewardError } = await supabase
      .from('referral_rewards')
      .insert({
        referral_id,
        minutes_rewarded: minutes_reward
      });

    if (rewardError) throw rewardError;

    // Mark referral as claimed and update user's minutes
    const { error: updateError } = await supabase.rpc('claim_referral_reward', {
      p_referral_id: referral_id,
      p_minutes_reward: minutes_reward
    });

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Reward claimed successfully',
      minutes_earned: minutes_reward
    };
  } catch (error) {
    console.error('Error claiming referral reward:', error);
    return {
      success: false,
      message: 'Failed to claim reward'
    };
  }
}