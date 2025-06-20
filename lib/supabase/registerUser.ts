import { supabase } from './client';
import type { User } from './types';

export async function registerUser(
  telegram_id: string | number,
  supabase_auth_id: string,
  username?: string | null,
  level = 1
): Promise<{
  success: boolean;
  user: Partial<User> | null;
  error: Error | null;
}> {
  try {
    console.log('Registering user:', { telegram_id, supabase_auth_id, username, level });

    // Convert telegram_id to string if it's a number
    const telegramId = telegram_id.toString();

    // Validate required parameters
    if (!telegramId) {
      return {
        success: false,
        user: null,
        error: new Error('telegram_id is required')
      };
    }

    if (!supabase_auth_id) {
      return {
        success: false,
        user: null,
        error: new Error('supabase_auth_id is required')
      };
    }

    console.log('Using existing Supabase auth ID:', supabase_auth_id);

    // Use RPC function to register/update user atomically
    const { data, error } = await supabase.rpc('register_telegram_user', {
      p_telegram_id: telegramId,
      p_supabase_auth_id: supabase_auth_id,
      p_username: username || null,
      p_level: level
    });

    if (error) {
      console.error('RPC registration error:', error);
      return {
        success: false,
        user: null,
        error: error
      };
    }

    console.log('User registered successfully via RPC:', data);
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