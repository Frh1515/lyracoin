import { supabase } from './client';

export async function generateReferralCode(): Promise<{
  success: boolean;
  referralCode: string | null;
  referralLink: string | null;
  error: string | null;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        referralCode: null,
        referralLink: null,
        error: 'User not authenticated'
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
        referralCode: null,
        referralLink: null,
        error: 'User not found'
      };
    }

    // Generate referral code using RPC function
    const { data: referralCode, error: rpcError } = await supabase
      .rpc('generate_referral_code', {
        p_telegram_id: userData.telegram_id
      });

    if (rpcError) {
      console.error('RPC Error generating referral code:', rpcError);
      throw rpcError;
    }

    const referralLink = `https://t.me/LyraCoinBot?start=${referralCode}`;

    return {
      success: true,
      referralCode,
      referralLink,
      error: null
    };
  } catch (error) {
    console.error('Error generating referral code:', error);
    return {
      success: false,
      referralCode: null,
      referralLink: null,
      error: error instanceof Error ? error.message : 'Failed to generate referral code'
    };
  }
}