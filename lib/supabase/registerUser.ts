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

    // Create anonymous auth session to get supabase_auth_id
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError || !authData.user) {
      console.error('Anonymous auth error:', authError);
      return {
        success: false,
        user: null,
        error: authError || new Error('Failed to authenticate anonymously')
      };
    }

    const supabaseAuthId = authData.user.id;
    console.log('Authenticated anonymously with Supabase:', supabaseAuthId);

    // Use RPC function to register/update user atomically
    const { data, error } = await supabase.rpc('register_telegram_user', {
      p_telegram_id: telegramId,
      p_supabase_auth_id: supabaseAuthId,
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