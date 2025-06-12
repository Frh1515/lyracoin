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

    // First, try to insert the user
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
      // If user already exists, try to update
      if (error.code === '23505') { // Unique violation
        try {
          // First, perform the update operation
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

          // Then, separately fetch the updated user data
          const { data: selectData, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

          if (selectError) {
            console.error('Select error:', selectError);
            return {
              success: false,
              user: null,
              error: selectError
            };
          }

          console.log('User updated successfully:', selectData);
          return {
            success: true,
            user: selectData,
            error: null
          };
        } catch (updateCatchError) {
          console.error('Error during update process:', updateCatchError);
          return {
            success: false,
            user: null,
            error: updateCatchError as Error
          };
        }
      } else {
        console.error('Insert error:', error);
        return {
          success: false,
          user: null,
          error: error
        };
      }
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