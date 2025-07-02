import { supabase } from './client';

export async function recordGameSession(): Promise<{
  success: boolean;
  message: string;
  pointsEarned?: number;
  sessionsRemaining?: number;
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

    // Record game session using new RPC function
    const { data, error } = await supabase.rpc('record_daily_game_session', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('RPC Error recording game session:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      pointsEarned: data.points_earned,
      sessionsRemaining: data.sessions_remaining
    };
  } catch (error) {
    console.error('Error recording game session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record game session'
    };
  }
}