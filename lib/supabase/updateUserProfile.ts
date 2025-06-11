import { supabase } from './client';

export async function updateUserProfile(
  telegram_id: string,
  data: {
    username?: string;
    profile_image?: string;
  }
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('telegram_id', telegram_id);

    if (error) throw error;

    return {
      success: true,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      message: 'Failed to update profile'
    };
  }
}