import { supabase } from './client';

export interface TaskClickResult {
  success: boolean;
  message: string;
  clickId?: string;
  lyraConsumed?: number;
  completedClicks?: number;
  totalClicks?: number;
  isCompleted?: boolean;
  pointsEarned?: number;
  minutesEarned?: number;
}

export async function recordTaskClickWithRewards(
  taskId: string
): Promise<TaskClickResult> {
  try {
    console.log('🔄 Recording task click with rewards for task ID:', taskId);
    
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

    console.log('✅ User data found:', {
      telegramId: userData.telegram_id
    });

    // Call RPC function to record click with rewards
    const { data, error } = await supabase.rpc('record_task_click_with_rewards', {
      p_task_id: taskId,
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('❌ RPC Error recording task click:', error);
      throw error;
    }

    console.log('✅ Task click recorded successfully:', data);

    return {
      success: data.success,
      message: data.message,
      clickId: data.click_id,
      lyraConsumed: data.lyra_consumed,
      completedClicks: data.completed_clicks,
      totalClicks: data.total_clicks,
      isCompleted: data.is_completed,
      pointsEarned: data.points_earned,
      minutesEarned: data.minutes_earned
    };
  } catch (error) {
    console.error('Error recording task click:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record task click'
    };
  }
}

export async function hasCompletedPaidTaskToday(
  taskId: string
): Promise<{
  completed: boolean;
  error: Error | null;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        completed: false,
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
        completed: false,
        error: new Error('User not found')
      };
    }

    // Call RPC function to check if task is completed
    const { data, error } = await supabase.rpc('has_completed_paid_task_today', {
      p_task_id: taskId,
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      throw error;
    }

    return {
      completed: data || false,
      error: null
    };
  } catch (error) {
    console.error('Error checking task completion:', error);
    return {
      completed: false,
      error: error as Error
    };
  }
}

export async function getActivePaidTasksForDaily(): Promise<{
  data: {
    tasks: any[];
    completedTasks: string[];
  } | null;
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

    // Call RPC function to get active paid tasks for daily section
    const { data, error } = await supabase.rpc('get_active_paid_tasks_for_daily', {
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      throw error;
    }

    // Format the response
    return {
      data: {
        tasks: data.tasks || [],
        completedTasks: data.completed_tasks || []
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting active paid tasks:', error);
    return {
      data: null,
      error: error as Error
    };
  }
}