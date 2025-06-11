import { supabase } from './client';

export async function updatePreferredExchange(
  telegram_id: string,
  exchange_id: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ preferred_exchange: exchange_id })
      .eq('telegram_id', telegram_id);

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