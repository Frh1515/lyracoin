import { supabase } from './client';

export async function submitInviteCode(
  user_id: string,
  invite_code: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if user is already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('invitee_id', user_id)
      .single();

    if (existingReferral) {
      return {
        success: false,
        message: 'User is already referred'
      };
    }

    // Find inviter by invite code
    const { data: inviter } = await supabase
      .from('users')
      .select('id')
      .eq('invite_code', invite_code)
      .single();

    if (!inviter) {
      return {
        success: false,
        message: 'Invalid invite code'
      };
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        inviter_id: inviter.id,
        invitee_id: user_id,
        invite_code
      });

    if (referralError) throw referralError;

    // Increment inviter's referral count
    const { error: updateError } = await supabase.rpc('increment_referral_count', {
      user_id: inviter.id
    });

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Invite code applied successfully'
    };
  } catch (error) {
    console.error('Error submitting invite code:', error);
    return {
      success: false,
      message: 'Failed to process invite code'
    };
  }
}