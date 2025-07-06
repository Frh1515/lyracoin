import { supabase } from './client';

export async function updateUserLyraBalance(
  lyraAmount: number
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
    if (lyraAmount === 0) {
      return {
        success: false,
        message: 'LYRA amount cannot be zero'
      };
    }

    // Update user's LYRA balance
    const { error } = await supabase
      .from('users')
      .update({ 
        lyra_balance: supabase.raw(`lyra_balance + ${lyraAmount}`)
      })
      .eq('supabase_auth_id', user.id);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: lyraAmount > 0 
        ? `Successfully added ${lyraAmount} LYRA` 
        : `Successfully deducted ${Math.abs(lyraAmount)} LYRA`
    };
  } catch (error) {
    console.error('Error updating LYRA balance:', error);
    return {
      success: false,
      message: 'Failed to update LYRA balance'
    };
  }
}