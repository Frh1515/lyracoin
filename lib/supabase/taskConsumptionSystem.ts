import { supabase } from './client';

export interface TaskClickResult {
  success: boolean;
  message: string;
  clickId?: string;
  lyraConsumed?: number;
  completedClicks?: number;
  totalClicks?: number;
  isCompleted?: boolean;
}

export interface TaskClickBatchResult {
  success: boolean;
  message: string;
  batchId?: string;
  clicksProcessed?: number;
  lyraConsumed?: number;
  completedClicks?: number;
  totalClicks?: number;
  isCompleted?: boolean;
}

export interface TaskStatusResult {
  success: boolean;
  message: string;
  oldStatus?: string;
  newStatus?: string;
  completedClicks?: number;
  totalClicks?: number;
  completionPercentage?: number;
}

export interface AddTaskBalanceResult {
  success: boolean;
  message: string;
  additionalBalance?: number;
  newTotalClicks?: number;
  newTotalBalance?: number;
  newStatus?: string;
}

/**
 * Records a click on a task and consumes LYRA
 */
export async function recordTaskClick(
  taskId: string,
  userTelegramId: string
): Promise<TaskClickResult> {
  try {
    console.log('🔄 Recording task click:', { taskId, userTelegramId });
    
    // Call RPC function to record click
    const { data, error } = await supabase.rpc('record_task_click', {
      p_task_id: taskId,
      p_user_telegram_id: userTelegramId
    });

    if (error) {
      console.error('❌ RPC Error recording task click:', error);
      throw error;
    }

    console.log('✅ Click recorded successfully:', data);

    return {
      success: data.success,
      message: data.message,
      clickId: data.click_id,
      lyraConsumed: data.lyra_consumed,
      completedClicks: data.completed_clicks,
      totalClicks: data.total_clicks,
      isCompleted: data.is_completed
    };
  } catch (error) {
    console.error('Error recording task click:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record task click'
    };
  }
}

/**
 * Processes a batch of clicks for a task
 */
export async function processClickBatch(
  taskId: string,
  clicksCount: number
): Promise<TaskClickBatchResult> {
  try {
    console.log('🔄 Processing click batch:', { taskId, clicksCount });
    
    // Call RPC function to process batch
    const { data, error } = await supabase.rpc('process_click_batch', {
      p_task_id: taskId,
      p_clicks_count: clicksCount
    });

    if (error) {
      console.error('❌ RPC Error processing click batch:', error);
      throw error;
    }

    console.log('✅ Batch processed successfully:', data);

    return {
      success: data.success,
      message: data.message,
      batchId: data.batch_id,
      clicksProcessed: data.clicks_processed,
      lyraConsumed: data.lyra_consumed,
      completedClicks: data.completed_clicks,
      totalClicks: data.total_clicks,
      isCompleted: data.is_completed
    };
  } catch (error) {
    console.error('Error processing click batch:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process click batch'
    };
  }
}

/**
 * Updates task status based on completion
 */
export async function updateTaskCompletionStatus(
  taskId: string
): Promise<TaskStatusResult> {
  try {
    console.log('🔄 Updating task completion status:', { taskId });
    
    // Call RPC function to update status
    const { data, error } = await supabase.rpc('update_task_completion_status', {
      p_task_id: taskId
    });

    if (error) {
      console.error('❌ RPC Error updating task status:', error);
      throw error;
    }

    console.log('✅ Task status updated successfully:', data);

    return {
      success: data.success,
      message: data.message,
      oldStatus: data.old_status,
      newStatus: data.new_status,
      completedClicks: data.completed_clicks,
      totalClicks: data.total_clicks,
      completionPercentage: data.completion_percentage
    };
  } catch (error) {
    console.error('Error updating task status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task status'
    };
  }
}

/**
 * Adds balance to a task
 */
export async function addTaskBalance(
  taskId: string,
  additionalBalance: number
): Promise<AddTaskBalanceResult> {
  try {
    console.log('🔄 Adding balance to task:', { taskId, additionalBalance });
    
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

    // Call RPC function to add balance
    const { data, error } = await supabase.rpc('add_task_balance', {
      p_task_id: taskId,
      p_additional_balance: additionalBalance,
      p_user_telegram_id: userData.telegram_id
    });

    if (error) {
      console.error('❌ RPC Error adding task balance:', error);
      throw error;
    }

    console.log('✅ Task balance added successfully:', data);

    return {
      success: data.success,
      message: data.message,
      additionalBalance: data.additional_balance,
      newTotalClicks: data.new_total_clicks,
      newTotalBalance: data.new_total_balance,
      newStatus: data.new_status
    };
  } catch (error) {
    console.error('Error adding task balance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add task balance'
    };
  }
}

/**
 * Simulates clicks on a task (for testing)
 */
export async function simulateTaskClicks(
  taskId: string,
  clicksCount: number
): Promise<TaskClickBatchResult> {
  try {
    console.log('🔄 Simulating task clicks:', { taskId, clicksCount });
    
    // Call RPC function to simulate clicks
    const { data, error } = await supabase.rpc('simulate_task_clicks', {
      p_task_id: taskId,
      p_clicks_count: clicksCount
    });

    if (error) {
      console.error('❌ RPC Error simulating task clicks:', error);
      throw error;
    }

    console.log('✅ Clicks simulated successfully:', data);

    return {
      success: data.success,
      message: data.message,
      batchId: data.batch_id,
      clicksProcessed: data.clicks_processed,
      lyraConsumed: data.lyra_consumed,
      completedClicks: data.completed_clicks,
      totalClicks: data.total_clicks,
      isCompleted: data.is_completed
    };
  } catch (error) {
    console.error('Error simulating task clicks:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to simulate task clicks'
    };
  }
}