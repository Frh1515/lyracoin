import { supabase } from './client';

export async function processReferral(
  referrerCode: string,
  referredTelegramId: string
): Promise<{
  success: boolean;
  message: string;
  referralId?: string;
  debug?: any;
}> {
  try {
    console.log('🔄 Starting processReferral function...', {
      referrerCode,
      referredTelegramId
    });
    
    // Validate inputs
    if (!referrerCode || !referredTelegramId) {
      console.error('❌ Invalid referral parameters:', {
        referrerCode,
        referredTelegramId
      });
      return {
        success: false,
        message: 'Invalid referral parameters'
      };
    }

    // Process referral using secure RPC function
    console.log('📞 Calling RPC function process_referral with:', {
      p_referrer_telegram_id: referrerCode,
      p_referred_telegram_id: referredTelegramId
    });
    
    const { data, error } = await supabase.rpc('process_referral', {
      p_referrer_telegram_id: referrerCode,
      p_referred_telegram_id: referredTelegramId
    });

    if (error) {
      console.error('❌ RPC Error processing referral:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ RPC call successful, result:', data);

    // Verify the response structure
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid response from RPC function:', data);
      return {
        success: false,
        message: 'Invalid response from server'
      };
    }

    // Return the result
    return {
      success: data.success,
      message: data.message,
      referralId: data.referral_id,
      debug: data
    };
  } catch (error) {
    console.error('❌ Error processing referral:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process referral'
    };
  }
}