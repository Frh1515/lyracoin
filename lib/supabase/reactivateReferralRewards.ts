import { supabase } from './client';

export async function reactivateReferralRewards(): Promise<{
  success: boolean;
  message: string;
  users_processed?: number;
  total_points_awarded?: number;
}> {
  try {
    console.log('🔄 إعادة تفعيل نظام مكافآت الإحالة...');
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Call the safe recalculation function
    const { data, error } = await supabase.rpc('safe_recalculate_referral_rewards');

    if (error) {
      console.error('❌ RPC Error reactivating referral rewards:', error);
      throw error;
    }

    console.log('✅ تم تفعيل نظام مكافآت الإحالة بنجاح:', data);

    return {
      success: data.success,
      message: data.message,
      users_processed: data.users_processed,
      total_points_awarded: data.total_points_awarded
    };
  } catch (error) {
    console.error('❌ خطأ في إعادة تفعيل نظام مكافآت الإحالة:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reactivate referral rewards'
    };
  }
}

export async function checkReferralRewardsStatus(): Promise<{
  success: boolean;
  data?: {
    total_referrals: number;
    verified_referrals: number;
    unclaimed_rewards: number;
    total_points_from_referrals: number;
  };
  error?: string;
}> {
  try {
    console.log('🔍 فحص حالة مكافآت الإحالة...');
    
    // Get referral statistics
    const { data: referralStats, error: statsError } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        reward_claimed,
        referrer_id,
        users!referrals_referrer_id_fkey(points, referral_count)
      `);

    if (statsError) {
      throw statsError;
    }

    const totalReferrals = referralStats?.length || 0;
    const verifiedReferrals = referralStats?.filter(r => r.status === 'verified').length || 0;
    const unclaimedRewards = referralStats?.filter(r => r.status === 'verified' && !r.reward_claimed).length || 0;
    
    // Calculate expected points from referrals
    const totalPointsFromReferrals = verifiedReferrals * 30;

    console.log('📊 إحصائيات مكافآت الإحالة:', {
      totalReferrals,
      verifiedReferrals,
      unclaimedRewards,
      totalPointsFromReferrals
    });

    return {
      success: true,
      data: {
        total_referrals: totalReferrals,
        verified_referrals: verifiedReferrals,
        unclaimed_rewards: unclaimedRewards,
        total_points_from_referrals: totalPointsFromReferrals
      }
    };
  } catch (error) {
    console.error('❌ خطأ في فحص حالة مكافآت الإحالة:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check referral rewards status'
    };
  }
}