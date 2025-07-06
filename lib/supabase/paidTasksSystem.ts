import { supabase } from './client';

export interface PaidTaskData {
  title: string;
  description: string;
  link: string;
  platform: string;
  totalClicks: number;
  targetCommunity: string;
  price: number;
  paymentMethod: 'lyra' | 'ton';
}

export interface PaidTask {
  id: string;
  title: string;
  description: string;
  link: string;
  platform: string;
  totalClicks: number;
  completedClicks: number;
  targetCommunity: string;
  pricePaid: number;
  paymentMethod: string;
  status: string;
  paymentVerified: boolean;
  createdAt: string;
  publishedAt?: string;
  paymentStatus?: string;
  transactionHash?: string;
}

export interface PaymentVerification {
  id: string;
  paymentId: string;
  transactionHash: string;
  verificationStatus: string;
  verifiedAmount?: number;
  verifiedAt?: string;
}

// إنشاء مهمة مدفوعة جديدة
export async function createPaidTask(
  taskData: PaidTaskData
): Promise<{
  success: boolean;
  message: string;
  taskId?: string;
  paymentId?: string;
}> {
  try {
    console.log('🔄 Creating paid task with payment verification:', taskData);
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Get user's telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id, lyra_balance')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ User lookup error:', userError);
      return {
        success: false,
        message: 'User not found'
      };
    }

    console.log('✅ User data found:', {
      telegramId: userData.telegram_id,
      currentBalance: userData.lyra_balance,
      paymentMethod: taskData.paymentMethod
    });

    // إنشاء المهمة باستخدام RPC function
    const { data, error } = await supabase.rpc('create_paid_task', {
      p_user_telegram_id: userData.telegram_id,
      p_title: taskData.title,
      p_description: taskData.description,
      p_link: taskData.link,
      p_platform: taskData.platform,
      p_total_clicks: taskData.totalClicks,
      p_target_community: taskData.targetCommunity,
      p_price: taskData.price,
      p_payment_method: taskData.paymentMethod
    });

    if (error) {
      console.error('❌ RPC Error creating task:', error);
      throw error;
    }

    console.log('✅ Task creation result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        taskId: result.task_id,
        paymentId: result.payment_id
      };
    }

    return {
      success: false,
      message: 'Failed to create task'
    };
  } catch (error) {
    console.error('Error creating paid task:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create paid task'
    };
  }
}

// معالجة الدفع بـ LYRA
export async function processLyraPayment(
  paymentId: string
): Promise<{
  success: boolean;
  message: string;
  taskId?: string;
}> {
  try {
    console.log('🔄 Processing LYRA payment:', paymentId);
    
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

    // معالجة الدفع باستخدام RPC function
    const { data, error } = await supabase.rpc('process_lyra_payment', {
      p_payment_id: paymentId,
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('❌ RPC Error processing payment:', error);
      throw error;
    }

    console.log('✅ Payment processing result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        taskId: result.task_id
      };
    }

    return {
      success: false,
      message: 'Failed to process payment'
    };
  } catch (error) {
    console.error('Error processing LYRA payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process payment'
    };
  }
}

// بدء التحقق من معاملة TON
export async function initiateTonVerification(
  paymentId: string,
  transactionHash: string
): Promise<{
  success: boolean;
  message: string;
  verificationId?: string;
}> {
  try {
    console.log('🔄 Initiating TON verification:', { paymentId, transactionHash });
    
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

    // بدء التحقق باستخدام RPC function
    const { data, error } = await supabase.rpc('initiate_ton_verification', {
      p_payment_id: paymentId,
      p_transaction_hash: transactionHash,
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('❌ RPC Error initiating verification:', error);
      throw error;
    }

    console.log('✅ Verification initiation result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        verificationId: result.verification_id
      };
    }

    return {
      success: false,
      message: 'Failed to initiate verification'
    };
  } catch (error) {
    console.error('Error initiating TON verification:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initiate verification'
    };
  }
}

// التحقق من معاملة TON
export async function verifyTonTransaction(
  verificationId: string,
  expectedAmount: number
): Promise<{
  success: boolean;
  message: string;
  verified: boolean;
  amountVerified?: number;
}> {
  try {
    console.log('🔄 Verifying TON transaction:', { verificationId, expectedAmount });
    
    // التحقق باستخدام RPC function
    const { data, error } = await supabase.rpc('verify_ton_transaction', {
      p_verification_id: verificationId,
      p_expected_amount: expectedAmount
    });

    if (error) {
      console.error('❌ RPC Error verifying transaction:', error);
      throw error;
    }

    console.log('✅ Transaction verification result:', data);

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        verified: result.verified,
        amountVerified: result.amount_verified
      };
    }

    return {
      success: false,
      message: 'Failed to verify transaction',
      verified: false
    };
  } catch (error) {
    console.error('Error verifying TON transaction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify transaction',
      verified: false
    };
  }
}

// الحصول على المهام المدفوعة للمستخدم
export async function getUserPaidTasks(): Promise<{
  data: PaidTask[] | null;
  error: Error | null;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        data: null,
        error: new Error('User not authenticated')
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
        data: null,
        error: new Error('User not found')
      };
    }

    // الحصول على المهام باستخدام RPC function
    const { data, error } = await supabase.rpc('get_user_paid_tasks', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('Error fetching paid tasks:', error);
      throw error;
    }

    // تحويل البيانات إلى التنسيق المطلوب
    const tasks: PaidTask[] = (data || []).map((task: any) => ({
      id: task.task_id,
      title: task.title,
      description: task.description,
      link: task.link,
      platform: task.platform,
      totalClicks: task.total_clicks,
      completedClicks: task.completed_clicks,
      targetCommunity: task.target_community,
      pricePaid: task.price_paid,
      paymentMethod: task.payment_method,
      status: task.status,
      paymentVerified: task.payment_verified,
      createdAt: task.created_at,
      publishedAt: task.published_at,
      paymentStatus: task.payment_status,
      transactionHash: task.transaction_hash
    }));

    return {
      data: tasks,
      error: null
    };
  } catch (error) {
    console.error('Error fetching paid tasks:', error);
    return {
      data: null,
      error: error as Error
    };
  }
}

// الحصول على حالة الدفع
export async function getPaymentStatus(
  paymentId: string
): Promise<{
  data: any | null;
  error: Error | null;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        data: null,
        error: new Error('User not authenticated')
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
        data: null,
        error: new Error('User not found')
      };
    }

    // الحصول على حالة الدفع
    const { data, error } = await supabase
      .from('task_payments')
      .select(`
        *,
        paid_tasks!inner(
          id,
          title,
          status,
          payment_verified
        ),
        payment_verifications(
          id,
          verification_status,
          verified_amount,
          verified_at
        )
      `)
      .eq('id', paymentId)
      .eq('user_telegram_id', userData.telegram_id)
      .single();

    if (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }

    return {
      data,
      error: null
    };
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return {
      data: null,
      error: error as Error
    };
  }
}

// محاكاة التحقق من معاملة TON (للاختبار)
export async function simulateTonVerification(
  transactionHash: string,
  expectedAmount: number
): Promise<{
  success: boolean;
  verified: boolean;
  amount: number;
}> {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // للمحاكاة: نعتبر المعاملة صحيحة إذا كان hash يحتوي على "verified"
  const isVerified = transactionHash.includes('verified');
  
  return {
    success: true,
    verified: isVerified,
    amount: isVerified ? expectedAmount : 0
  };
}

// انتهاء صلاحية المدفوعات المعلقة
export async function expirePendingPayments(): Promise<{
  success: boolean;
  expiredCount: number;
}> {
  try {
    const { data, error } = await supabase.rpc('expire_pending_payments');

    if (error) {
      console.error('Error expiring payments:', error);
      throw error;
    }

    return {
      success: true,
      expiredCount: data || 0
    };
  } catch (error) {
    console.error('Error expiring pending payments:', error);
    return {
      success: false,
      expiredCount: 0
    };
  }
}