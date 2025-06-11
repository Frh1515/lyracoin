import { supabase } from './client';

export async function connectWallet(
  telegram_id: string,
  wallet_address: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ wallet_address })
      .eq('telegram_id', telegram_id);

    if (error) throw error;

    return {
      success: true,
      message: 'Wallet connected successfully'
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return {
      success: false,
      message: 'Failed to connect wallet'
    };
  }
}