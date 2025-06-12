import { supabase } from './client';
import type { User } from './types';

export async function registerUser(
  telegram_id: string | number,
  username?: string | null,
  level = 1
): Promise<{
  success: boolean;
  user: Partial<User> | null;
  error: Error | null;
}> {
  try {
    console.log('Registering user:', { telegram_id, username, level });

    // Convert telegram_id to string if it's a number
    const telegramId = telegram_id.toString();

    // Validate telegram_id
    if (!telegramId) {
      return {
        success: false,
        user: null,
        error: new Error('telegram_id is required')
      };
    }

    // First, check if user already exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error checking existing user:', selectError);
      return {
        success: false,
        user: null,
        error: selectError
      };
    }

    if (existingUser) {
      // User exists, update their information
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: username || null,
          level: level
        })
        .eq('telegram_id', telegramId);

      if (updateError) {
        console.error('Update error:', updateError);
        return {
          success: false,
          user: null,
          error: updateError
        };
      }

      // Fetch the updated user data
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (fetchError) {
        console.error('Fetch updated user error:', fetchError);
        return {
          success: false,
          user: null,
          error: fetchError
        };
      }

      console.log('User updated successfully:', updatedUser);
      return {
        success: true,
        user: updatedUser,
        error: null
      };
    } else {
      // User doesn't exist, create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: username || null,
          level: level,
          referral_count: 0,
          total_minutes: 0,
          points: 0,
          referral_tier: 'bronze'
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        return {
          success: false,
          user: null,
          error: error
        };
      }

      console.log('User registered successfully:', data);
      return {
        success: true,
        user: data,
        error: null
      };
    }
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      user: null,
      error: error as Error
    };
  }
}