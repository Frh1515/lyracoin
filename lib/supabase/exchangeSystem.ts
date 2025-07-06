import { supabase } from './client';

// Interface for exchange rates
export interface ExchangeRates {
  minutesToLyra: number;
  lyraToTon: number;
  tonToLyra: number;
}

// Interface for exchange transaction
export interface ExchangeTransaction {
  id: string;
  transactionType: 'buy_with_ton' | 'sell_for_ton' | 'convert_minutes';
  amountIn: number;
  currencyIn: 'TON' | 'MINUTES' | 'LYRA';
  amountOut: number;
  currencyOut: 'TON' | 'MINUTES' | 'LYRA';
  status: 'pending' | 'completed' | 'failed' | 'expired';
  createdAt: string;
  completedAt?: string;
  transactionHash?: string;
}

// Get current exchange rates
export async function getExchangeRates(): Promise<{
  success: boolean;
  rates: ExchangeRates;
}> {
  // These rates are fixed as per requirements
  return {
    success: true,
    rates: {
      minutesToLyra: 1000, // 1000 minutes = 1 LYRA
      lyraToTon: 0.01,     // 1 LYRA = 0.01 TON
      tonToLyra: 100       // 1 TON = 100 LYRA
    }
  };
}

// Buy LYRA with TON
export async function buyLyraWithTon(
  tonAmount: number,
  walletAddress: string
): Promise<{
  success: boolean;
  message: string;
  transactionId?: string;
  lyraAmount?: number;
  expiresAt?: string;
}> {
  try {
    console.log('🔄 Initiating LYRA purchase with TON:', { tonAmount, walletAddress });
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ User lookup error:', userError);
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Validate input
    if (tonAmount < 0.1) {
      return {
        success: false,
        message: 'Minimum purchase is 0.1 TON'
      };
    }

    if (!walletAddress || walletAddress.length < 10) {
      return {
        success: false,
        message: 'Invalid wallet address'
      };
    }

    // Call RPC function to initiate purchase
    const { data, error } = await supabase.rpc('buy_lyra_with_ton', {
      p_user_telegram_id: userData.telegram_id,
      p_ton_amount: tonAmount,
      p_wallet_address: walletAddress
    });

    if (error) {
      console.error('❌ RPC Error buying LYRA with TON:', error);
      throw error;
    }

    console.log('✅ Purchase initiated:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        transactionId: result.transaction_id,
        lyraAmount: result.lyra_amount,
        expiresAt: result.expires_at
      };
    }

    return {
      success: false,
      message: 'Failed to initiate purchase'
    };
  } catch (error) {
    console.error('Error buying LYRA with TON:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to buy LYRA with TON'
    };
  }
}

// Verify TON payment for LYRA purchase
export async function verifyTonPaymentForLyra(
  transactionId: string,
  transactionHash: string
): Promise<{
  success: boolean;
  message: string;
  lyraAmount?: number;
}> {
  try {
    console.log('🔄 Verifying TON payment:', { transactionId, transactionHash });
    
    // Call RPC function to verify payment
    const { data, error } = await supabase.rpc('verify_ton_payment_for_lyra', {
      p_transaction_id: transactionId,
      p_transaction_hash: transactionHash
    });

    if (error) {
      console.error('❌ RPC Error verifying TON payment:', error);
      throw error;
    }

    console.log('✅ Verification result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        lyraAmount: result.lyra_amount
      };
    }

    return {
      success: false,
      message: 'Failed to verify payment'
    };
  } catch (error) {
    console.error('Error verifying TON payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify payment'
    };
  }
}

// Convert minutes to LYRA
export async function convertMinutesToLyra(
  minutesAmount: number
): Promise<{
  success: boolean;
  message: string;
  lyraAmount?: number;
}> {
  try {
    console.log('🔄 Converting minutes to LYRA:', { minutesAmount });
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Validate input
    if (minutesAmount < 1000) {
      return {
        success: false,
        message: 'Minimum conversion is 1000 minutes'
      };
    }

    if (minutesAmount % 1000 !== 0) {
      return {
        success: false,
        message: 'Minutes must be in multiples of 1000'
      };
    }

    // Call RPC function to convert minutes
    const { data, error } = await supabase.rpc('convert_minutes_to_lyra', {
      p_user_telegram_id: userData.telegram_id,
      p_minutes_amount: minutesAmount
    });

    if (error) {
      console.error('❌ RPC Error converting minutes to LYRA:', error);
      throw error;
    }

    console.log('✅ Conversion result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        lyraAmount: result.lyra_amount
      };
    }

    return {
      success: false,
      message: 'Failed to convert minutes'
    };
  } catch (error) {
    console.error('Error converting minutes to LYRA:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to convert minutes'
    };
  }
}

// Sell LYRA for TON
export async function sellLyraForTon(
  lyraAmount: number,
  walletAddress: string
): Promise<{
  success: boolean;
  message: string;
  transactionId?: string;
  tonAmount?: number;
}> {
  try {
    console.log('🔄 Selling LYRA for TON:', { lyraAmount, walletAddress });
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Validate input
    if (lyraAmount < 10) {
      return {
        success: false,
        message: 'Minimum sale is 10 LYRA'
      };
    }

    if (!walletAddress || walletAddress.length < 10) {
      return {
        success: false,
        message: 'Invalid wallet address'
      };
    }

    // Call RPC function to initiate sale
    const { data, error } = await supabase.rpc('sell_lyra_for_ton', {
      p_user_telegram_id: userData.telegram_id,
      p_lyra_amount: lyraAmount,
      p_wallet_address: walletAddress
    });

    if (error) {
      console.error('❌ RPC Error selling LYRA for TON:', error);
      throw error;
    }

    console.log('✅ Sale initiated:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        transactionId: result.transaction_id,
        tonAmount: result.ton_amount
      };
    }

    return {
      success: false,
      message: 'Failed to initiate sale'
    };
  } catch (error) {
    console.error('Error selling LYRA for TON:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to sell LYRA for TON'
    };
  }
}

// Complete LYRA sale (admin function)
export async function completeLyraSale(
  transactionId: string,
  transactionHash: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('🔄 Completing LYRA sale:', { transactionId, transactionHash });
    
    // Call RPC function to complete sale
    const { data, error } = await supabase.rpc('complete_lyra_sale', {
      p_transaction_id: transactionId,
      p_transaction_hash: transactionHash
    });

    if (error) {
      console.error('❌ RPC Error completing LYRA sale:', error);
      throw error;
    }

    console.log('✅ Sale completion result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message
      };
    }

    return {
      success: false,
      message: 'Failed to complete sale'
    };
  } catch (error) {
    console.error('Error completing LYRA sale:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete sale'
    };
  }
}

// Get user's exchange transactions
export async function getUserExchangeTransactions(): Promise<{
  success: boolean;
  transactions: ExchangeTransaction[];
}> {
  try {
    console.log('🔄 Fetching user exchange transactions');
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        transactions: []
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        transactions: []
      };
    }

    // Call RPC function to get transactions
    const { data, error } = await supabase.rpc('get_user_exchange_transactions', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('❌ RPC Error getting exchange transactions:', error);
      throw error;
    }

    console.log('✅ Got transactions:', data?.length || 0);

    // Format transactions
    const transactions: ExchangeTransaction[] = (data || []).map((item: any) => ({
      id: item.id,
      transactionType: item.transaction_type,
      amountIn: item.amount_in,
      currencyIn: item.currency_in,
      amountOut: item.amount_out,
      currencyOut: item.currency_out,
      status: item.status,
      createdAt: item.created_at,
      completedAt: item.completed_at,
      transactionHash: item.transaction_hash
    }));

    return {
      success: true,
      transactions
    };
  } catch (error) {
    console.error('Error getting exchange transactions:', error);
    return {
      success: false,
      transactions: []
    };
  }
}

// Simulate TON transaction verification (for testing)
export async function simulateTonVerification(
  transactionHash: string
): Promise<{
  success: boolean;
  verified: boolean;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // For testing: consider transaction valid if hash contains "valid"
  const isValid = transactionHash.includes('valid');
  
  return {
    success: true,
    verified: isValid
  };
}