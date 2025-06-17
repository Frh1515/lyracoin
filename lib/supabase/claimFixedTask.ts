import { supabase } from './client';

export async function claimFixedTask(
  taskId: string
): Promise<{
  success: boolean;
  message: string;
  pointsEarned?: number;
}> {
  try {
    console.log('🔄 Starting fixed task claim process...', { taskId });
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    console.log('✅ User authenticated:', user.id);

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

    console.log('✅ User data found:', userData.telegram_id);

    // Check if task exists first
    const { data: taskData, error: taskError } = await supabase
      .from('fixed_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('is_active', true)
      .single();

    if (taskError || !taskData) {
      console.error('❌ Task not found or inactive:', taskError);
      return {
        success: false,
        message: 'Task not found or inactive'
      };
    }

    console.log('✅ Task found:', taskData.title);

    // Check if already claimed
    const { data: existingClaim, error: claimCheckError } = await supabase
      .from('user_fixed_tasks')
      .select('id')
      .eq('user_telegram_id', userData.telegram_id)
      .eq('fixed_task_id', taskId)
      .single();

    if (claimCheckError && claimCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking existing claim:', claimCheckError);
      return {
        success: false,
        message: 'Error checking task status'
      };
    }

    if (existingClaim) {
      console.log('⚠️ Task already claimed');
      return {
        success: false,
        message: 'Task already completed'
      };
    }

    console.log('✅ Task not claimed yet, proceeding with claim...');

    // Claim fixed task using RPC function
    const { data, error } = await supabase.rpc('claim_fixed_task', {
      p_user_telegram_id: userData.telegram_id,
      p_fixed_task_id: taskId
    });

    if (error) {
      console.error('❌ RPC Error claiming fixed task:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Return more specific error message
      if (error.message.includes('already completed')) {
        return {
          success: false,
          message: 'Task already completed'
        };
      } else if (error.message.includes('not found')) {
        return {
          success: false,
          message: 'Task not found'
        };
      } else {
        return {
          success: false,
          message: `Database error: ${error.message}`
        };
      }
    }

    console.log('✅ RPC call successful:', data);

    return {
      success: data.success,
      message: data.message,
      pointsEarned: data.points_earned
    };
  } catch (error) {
    console.error('❌ Unexpected error claiming fixed task:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim task'
    };
  }
}