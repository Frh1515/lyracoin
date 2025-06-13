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

    // First, authenticate with Supabase using anonymous auth
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    
    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return {
        success: false,
        user: null,
        error: authError || new Error('Failed to authenticate')
      };
    }

    const supabaseAuthId = authData.user.id;
    console.log('Authenticated with Supabase:', supabaseAuthId);

    // Check if user already exists with this telegram_id
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
      // User exists, update their supabase_auth_id and other info
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          supabase_auth_id: supabaseAuthId,
          username: username || existingUser.username,
          level: level
        })
        .eq('telegram_id', telegramId)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return {
          success: false,
          user: null,
          error: updateError
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
          supabase_auth_id: supabaseAuthId,
          username: username || null,
          level: level,
          referral_count: 0,
          total_minutes: 0,
          points: 0,
          referral_tier: 'bronze',
          lyra_balance: 0,
          membership_level: 'bronze'
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