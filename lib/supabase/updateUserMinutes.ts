import { supabase } from './client';

export async function updateUserMinutes(
  minutesEarned: number
): Promise<{
  success: boolean;
  message: string;
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

    // Validate input
    if (minutesEarned < 0) {
      return {
        success: false,
        message: 'Minutes earned must be positive'
      };
    }

    // Call the RPC function to update minutes
    const { data, error } = await supabase.rpc('update_user_minutes', {
      p_supabase_auth_id: user.id,
      p_minutes_earned: minutesEarned
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `Successfully added ${minutesEarned} minutes`
    };
  } catch (error) {
    console.error('Error updating user minutes:', error);
    return {
      success: false,
      message: 'Failed to update minutes'
    };
  }
}