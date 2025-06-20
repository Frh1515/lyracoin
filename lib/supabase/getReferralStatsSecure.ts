import { supabase } from './client';

export interface ReferralStatsSecure {
  total_referrals: number;
  verified_referrals: number;
  pending_referrals: number;
  total_minutes_earned: number;
  referral_tier: string;
  all_referrals: Array<{
    id: string;
    referred_id: string;
    referred_username: string;
    created_at: string;
    status: string;
    reward_claimed: boolean;
    is_claimable: boolean;
    points_awarded: number;
    minutes_available: number;
  }>;
  unclaimed_referrals: Array<{
    id: string;
    referred_id: string;
    created_at: string;
    status: string;
  }>;
}

export async function getReferralStatsSecure(): Promise<{
  data: ReferralStatsSecure | null;
  error: Error | null;
}> {
  try {
    console.log('🔍 Starting getReferralStatsSecure...');
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', {
        error: authError,
        message: authError.message,
        details: authError.details,
        hint: authError.hint
      });
      return {
        data: null,
        error: new Error(`Authentication failed: ${authError.message}`)
      };
    }

    if (!user) {
      console.error('❌ No authenticated user found');
      return {
        data: null,
        error: new Error('User not authenticated')
      };
    }

    console.log('✅ User authenticated:', { userId: user.id });

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('❌ User lookup error:', {
        error: userError,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code
      });
      return {
        data: null,
        error: new Error(`User lookup failed: ${userError.message}`)
      };
    }

    if (!userData) {
      console.error('❌ User data not found for supabase_auth_id:', user.id);
      return {
        data: null,
        error: new Error('User profile not found')
      };
    }

    console.log('✅ User data found:', { telegramId: userData.telegram_id });

    // Get referral stats using secure RPC function
    const { data: statsData, error: rpcError } = await supabase
      .rpc('get_referral_stats_secure', {
        p_telegram_id: userData.telegram_id
      });

    if (rpcError) {
      console.error('❌ RPC Error getting referral stats:', {
        error: rpcError,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
      throw rpcError;
    }

    console.log('✅ RPC call successful, stats data:', statsData);

    // Ensure we have valid data structure
    if (!statsData || typeof statsData !== 'object') {
      console.warn('⚠️ Invalid stats data received:', statsData);
      return {
        data: {
          total_referrals: 0,
          verified_referrals: 0,
          pending_referrals: 0,
          total_minutes_earned: 0,
          referral_tier: 'bronze',
          all_referrals: [],
          unclaimed_referrals: []
        },
        error: null
      };
    }

    // Ensure all_referrals and unclaimed_referrals are arrays
    if (!Array.isArray(statsData.all_referrals)) {
      statsData.all_referrals = [];
    }

    if (!Array.isArray(statsData.unclaimed_referrals)) {
      statsData.unclaimed_referrals = [];
    }

    // Process all_referrals to ensure referred_username is never null or empty
    if (statsData.all_referrals) {
      statsData.all_referrals = statsData.all_referrals.map(referral => ({
        ...referral,
        referred_username: referral.referred_username && referral.referred_username.trim() !== '' 
          ? referral.referred_username 
          : 'مستخدم جديد'
      }));
    }

    return { 
      data: statsData as ReferralStatsSecure, 
      error: null 
    };
  } catch (error) {
    console.error('❌ Unexpected error in getReferralStatsSecure:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { 
      data: null, 
      error: error as Error 
    };
  }
}