import { supabase } from './client';

export async function processReferral(
  referrerCode: string,
  referredTelegramId: string
): Promise<{
  success: boolean;
  message: string;
  referralId?: string;
}> {
  try {
    // Validate inputs
    if (!referrerCode || !referredTelegramId) {
      return {
        success: false,
        message: 'Invalid referral parameters'
      };
    }

    // Process referral using secure RPC function
    const { data, error } = await supabase.rpc('process_referral', {
      p_referrer_telegram_id: referrerCode,
      p_referred_telegram_id: referredTelegramId
    });

    if (error) {
      console.error('RPC Error processing referral:', error);
      throw error;
    }

    return {
      success: data.success,
      message: data.message,
      referralId: data.referral_id
    };
  } catch (error) {
    console.error('Error processing referral:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process referral'
    };
  }
}