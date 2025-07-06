import { supabase } from './client';

export async function convertMinutesToLyra(
  minutesToConvert: number
): Promise<{
  success: boolean;
  message: string;
  lyraEarned?: number;
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
    if (minutesToConvert < 1000) {
      return {
        success: false,
        message: 'Minimum conversion is 1000 minutes'
      };
    }

    if (minutesToConvert % 1000 !== 0) {
      return {
        success: false,
        message: 'Minutes must be in multiples of 1000'
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id, total_minutes')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check if user has enough minutes
    if (userData.total_minutes < minutesToConvert) {
      return {
        success: false,
        message: 'Not enough minutes available'
      };
    }

    // Calculate LYRA to earn (1000 minutes = 1 LYRA)
    const lyraEarned = Math.floor(minutesToConvert / 1000);

    // Update user's minutes and LYRA balance in a single transaction
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_minutes: userData.total_minutes - minutesToConvert,
        lyra_balance: supabase.raw(`lyra_balance + ${lyraEarned}`)
      })
      .eq('supabase_auth_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      message: `Successfully converted ${minutesToConvert} minutes to ${lyraEarned} LYRA`,
      lyraEarned
    };
  } catch (error) {
    console.error('Error converting minutes to LYRA:', error);
    return {
      success: false,
      message: 'Failed to convert minutes to LYRA'
    };
  }
}