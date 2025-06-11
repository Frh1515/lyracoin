import { supabase } from './client';

export async function submitReferralCode(
  referred_id: string,
  referral_code: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if user already has a referral
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', referred_id)
      .single();

    if (existingReferral) {
      return {
        success: false,
        message: 'You have already used a referral code'
      };
    }

    // Find referrer by referral code
    const { data: referrer } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('referral_code', referral_code)
      .single();

    if (!referrer) {
      return {
        success: false,
        message: 'Invalid referral code'
      };
    }

    // Prevent self-referral
    if (referrer.telegram_id === referred_id) {
      return {
        success: false,
        message: 'You cannot refer yourself'
      };
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.telegram_id,
        referred_id: referred_id,
        status: 'pending'
      });

    if (referralError) throw referralError;

    return {
      success: true,
      message: 'Referral code applied successfully. Only the referrer will receive rewards upon verification.'
    };
  } catch (error) {
    console.error('Error submitting referral code:', error);
    return {
      success: false,
      message: 'Failed to process referral code'
    };
  }
}