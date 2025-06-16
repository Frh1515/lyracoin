import { supabase } from './client';

export async function claimDailyTask(
  taskId: string
): Promise<{
  success: boolean;
  message: string;
  pointsEarned?: number;
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

    // Claim daily task using RPC function
    const { data, error } = await supabase.rpc('claim_daily_task', {
      p_user_telegram_id: userData.telegram_id,
      p_daily_task_id: taskId
    });

    if (error) {
      console.error('RPC Error claiming daily task:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      pointsEarned: data.points_earned
    };
  } catch (error) {
    console.error('Error claiming daily task:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim task'
    };
  }
}