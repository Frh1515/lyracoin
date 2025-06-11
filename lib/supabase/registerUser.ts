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

    // Use upsert to handle both new registrations and updates
    const { data, error } = await supabase
      .from('users')
      .upsert({
        telegram_id: telegramId,
        username: username || null,
        level: level,
        referral_count: 0,
        total_minutes: 0,
        points: 0
      }, {
        onConflict: 'telegram_id',
        ignoreDuplicates: false
      })
      .select()
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