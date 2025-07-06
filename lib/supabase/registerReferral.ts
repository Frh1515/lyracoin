import { supabase } from './client';

export async function registerReferral(
  referrerId: string,
  referredId: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Attempting to register referral:', { referrerId, referredId });

    const { error } = await supabase.from('referrals').insert({
      referrer_id: referrerId,
      referred_id: referredId,
      status: 'pending', // Default status for new referrals
      // created_at will be set automatically by the database
    });

    if (error) {
      console.error('❌ Failed to insert referral record:', error);
      return { success: false, message: error.message };
    }

    console.log('✅ Referral recorded successfully for:', { referrerId, referredId });
    return { success: true, message: 'Referral recorded successfully' };
  } catch (error) {
    console.error('❌ Unexpected error in registerReferral:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred during referral registration',
    };
  }
}