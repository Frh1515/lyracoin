import { supabase } from './client';

export interface BoostPackage {
  multiplier: number;
  price: number;
  transaction_hash: string;
}

export interface ActiveBoost {
  id: string;
  multiplier: number;
  start_time: string;
  end_time: string;
  remainingHours: number;
}

export async function purchaseBoost(boostPackage: BoostPackage): Promise<{
  success: boolean;
  message: string;
  boost_id?: string;
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

    // Check if user already has an active boost
    const { data: activeBoost, error: boostError } = await supabase
      .from('boosts')
      .select('*')
      .eq('user_telegram_id', userData.telegram_id)
      .gt('end_time', new Date().toISOString())
      .maybeSingle();

    if (boostError) {
      console.error('Error checking active boost:', boostError);
      return {
        success: false,
        message: 'Error checking active boost'
      };
    }

    if (activeBoost) {
      return {
        success: false,
        message: 'You already have an active boost'
      };
    }

    // Create new boost record
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const { data: newBoost, error: insertError } = await supabase
      .from('boosts')
      .insert({
        user_telegram_id: userData.telegram_id,
        multiplier: boostPackage.multiplier,
        price_paid: boostPackage.price,
        transaction_hash: boostPackage.transaction_hash,
        start_time: now.toISOString(),
        end_time: endTime.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating boost:', insertError);
      return {
        success: false,
        message: 'Failed to create boost'
      };
    }

    return {
      success: true,
      message: `Boost ×${boostPackage.multiplier} activated successfully`,
      boost_id: newBoost.id
    };
  } catch (error) {
    console.error('Error purchasing boost:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to purchase boost'
    };
  }
}

export async function getActiveBoost(): Promise<{
  data: ActiveBoost | null;
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

    // Get active boost
    const { data: activeBoost, error: boostError } = await supabase
      .from('boosts')
      .select('*')
      .eq('user_telegram_id', userData.telegram_id)
      .gt('end_time', new Date().toISOString())
      .order('end_time', { ascending: false })
      .maybeSingle();

    if (boostError) {
      console.error('Error getting active boost:', boostError);
      return {
        data: null,
        error: new Error('Error getting active boost')
      };
    }

    if (!activeBoost) {
      return {
        data: null,
        error: null
      };
    }

    // Calculate remaining hours
    const now = new Date();
    const endTime = new Date(activeBoost.end_time);
    const diffMs = endTime.getTime() - now.getTime();
    const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));

    return {
      data: {
        id: activeBoost.id,
        multiplier: activeBoost.multiplier,
        start_time: activeBoost.start_time,
        end_time: activeBoost.end_time,
        remainingHours: parseFloat(diffHrs.toFixed(1))
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting active boost:', error);
    return {
      data: null,
      error: error as Error
    };
  }
}

export async function applyBoostToMining(): Promise<{
  success: boolean;
  message: string;
  minutes_earned?: number;
  multiplier?: number;
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

    // Call RPC function to apply boost
    const { data, error } = await supabase.rpc('apply_boost_to_mining', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error applying boost:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      minutes_earned: data.minutes_earned,
      multiplier: data.multiplier
    };
  } catch (error) {
    console.error('Error applying boost:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to apply boost'
    };
  }
}