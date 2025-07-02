import { supabase } from './client';

export interface MiningStatus {
  status: 'idle' | 'active' | 'completed' | 'claimed';
  session_id?: string;
  start_time?: string;
  end_time?: string;
  minutes_earned?: number;
  can_claim: boolean;
  can_start: boolean;
  session_active: boolean;
  time_remaining_seconds?: number;
  last_claim_date?: string;
}

export async function getMiningStatus(): Promise<{
  data: MiningStatus | null;
  error: Error | null;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        data: null,
        error: new Error('User not authenticated')
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
        data: null,
        error: new Error('User not found')
      };
    }

    // Get mining status using RPC function
    const { data, error } = await supabase.rpc('get_current_mining_status', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error getting mining status:', error);
      throw error;
    }

    return { data: data as MiningStatus, error: null };
  } catch (error) {
    console.error('Error getting mining status:', error);
    return { data: null, error: error as Error };
  }
}

export async function startOrResumeMining(): Promise<{
  success: boolean;
  message: string;
  session_id?: string;
  end_time?: string;
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

    // Start mining using RPC function
    const { data, error } = await supabase.rpc('start_mining_session', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error starting mining:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      session_id: data.session_id,
      end_time: data.end_time
    };
  } catch (error) {
    console.error('Error starting mining:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start mining'
    };
  }
}

export async function claimDailyMiningReward(): Promise<{
  success: boolean;
  message: string;
  minutes_claimed?: number;
  points_awarded?: number;
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

    // Claim reward using RPC function
    const { data, error } = await supabase.rpc('claim_mining_rewards', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error claiming mining reward:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      minutes_claimed: data.minutes_earned,
      points_awarded: data.points_earned
    };
  } catch (error) {
    console.error('Error claiming mining reward:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim reward'
    };
  }
}