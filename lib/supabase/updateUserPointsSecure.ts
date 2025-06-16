import { supabase } from './client';

export async function updateUserPointsSecure(
  pointsToAdd: number,
  reason: string = 'manual'
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

    // Validate input
    if (pointsToAdd < 0) {
      return {
        success: false,
        message: 'Points to add must be positive'
      };
    }

    // Call the RPC function to update points
    const { data, error } = await supabase.rpc('update_user_points', {
      p_telegram_id: userData.telegram_id,
      p_points_to_add: pointsToAdd,
      p_reason: reason
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `Successfully added ${pointsToAdd} points`
    };
  } catch (error) {
    console.error('Error updating user points:', error);
    return {
      success: false,
      message: 'Failed to update points'
    };
  }
}