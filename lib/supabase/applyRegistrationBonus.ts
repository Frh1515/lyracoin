import { supabase } from './client';

export async function applyRegistrationBonus(): Promise<{
  success: boolean;
  message: string;
  bonusPoints?: number;
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

    // Apply registration bonus using RPC function
    const { data, error } = await supabase.rpc('apply_registration_bonus', {
      p_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error applying registration bonus:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      bonusPoints: data.bonus_points
    };
  } catch (error) {
    console.error('Error applying registration bonus:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to apply registration bonus'
    };
  }
}