import { supabase } from './client';
import type { MiningStatus } from './types';

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

    // Get mining status using new RPC function
    const { data, error } = await supabase.rpc('get_current_mining_status', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error getting mining status:', error);
      throw error;
    }

    // Transform the response to match the expected MiningStatus interface
    const miningStatus: MiningStatus = {
      status: data.status || 'idle',
      mining_start_time: data.start_time || null,
      current_session_minutes_mined: 0, // Not used in new system
      daily_total_minutes_mined: 0, // Not used in new system
      last_claim_timestamp: data.last_claim_date || null,
      hours_since_last_claim: 0, // Calculated differently now
      can_claim: data.can_claim || false,
      mining_active: data.session_active || false,
      countdown_remaining_minutes: Math.max(0, Math.floor((data.time_remaining_seconds || 0) / 60)),
      total_accumulated_minutes: data.minutes_earned || 0
    };

    return { data: miningStatus, error: null };
  } catch (error) {
    console.error('Error getting mining status:', error);
    return { data: null, error: error as Error };
  }
}

export async function startOrResumeMining(): Promise<{
  success: boolean;
  message: string;
  mining_start_time?: string;
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

    // Start mining using new RPC function
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
      mining_start_time: data.end_time
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
  hours_remaining?: number;
  boost_multiplier?: number;
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

    // Claim reward using new RPC function
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
      points_awarded: data.points_earned,
      hours_remaining: 0, // Not applicable in new system
      boost_multiplier: 1 // Default, can be enhanced later
    };
  } catch (error) {
    console.error('Error claiming mining reward:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim reward'
    };
  }
}