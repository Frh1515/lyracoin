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

    // Call the secure RPC function to register/update user
    const { data, error } = await supabase
      .rpc('register_telegram_user', {
        p_telegram_id: telegramId,
        p_username: username || null,
        p_level: level
      })
      .single();

    if (error) {
      console.error('Supabase registration error:', error);
      throw error;
    }

    console.log('User registered successfully:', data);

    return {
      success: true,
      user: data,
      error: null
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      user: null,
      error: error as Error
    };
  }
}