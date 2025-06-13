import { supabase } from './client';

export async function updatePreferredExchange(
  exchange_id: string
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

    const { error } = await supabase
      .from('users')
      .update({ preferred_exchange: exchange_id })
      .eq('supabase_auth_id', user.id);

    if (error) throw error;

    return {
      success: true,
      message: 'Preferred exchange updated successfully'
    };
  } catch (error) {
    console.error('Error updating preferred exchange:', error);
    return {
      success: false,
      message: 'Failed to update preferred exchange'
    };
  }
}