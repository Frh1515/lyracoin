import { supabase } from './client';
import type { Task } from './types';

export async function claimTask(
  telegram_id: string,
  task_id: string
): Promise<{
  success: boolean;
  minutes_earned: number;
  message: string;
}> {
  try {
    // Check if task was already claimed today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingClaim } = await supabase
      .from('user_tasks')
      .select('id')
      .eq('user_id', telegram_id)
      .eq('task_id', task_id)
      .gte('completed_at', today)
      .single();

    if (existingClaim) {
      return {
        success: false,
        minutes_earned: 0,
        message: 'Task already claimed today'
      };
    }

    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('minutes_reward')
      .eq('id', task_id)
      .single();

    if (!task) {
      throw new Error('Task not found');
    }

    // Record the claim
    const { error } = await supabase.from('user_tasks').insert({
      user_id: telegram_id,
      task_id,
      minutes_earned: task.minutes_reward
    });

    if (error) throw error;

    // Update user's total minutes
    await supabase.rpc('update_user_rewards', {
      p_user_id: telegram_id,
      p_minutes: task.minutes_reward
    });

    return {
      success: true,
      minutes_earned: task.minutes_reward,
      message: 'Task claimed successfully'
    };
  } catch (error) {
    console.error('Error claiming task:', error);
    return {
      success: false,
      minutes_earned: 0,
      message: 'Failed to claim task'
    };
  }
}