import { supabase } from './client';
import type { DailyTask, UserDailyTask } from './types';

export async function getDailyTasks(): Promise<{
  data: {
    tasks: DailyTask[];
    completedTasks: UserDailyTask[];
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
      throw new Error('User not found');
    }

    // Get all daily tasks - only select needed fields
    const { data: tasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select('id, title, description, points_reward, platform, task_type, is_active')
      .eq('is_active', true)
      .order('created_at');

    if (tasksError) throw tasksError;

    // Get user's completed daily tasks for today - only select needed fields
    const today = new Date().toISOString().split('T')[0];
    const { data: completedTasks, error: completedError } = await supabase
      .from('user_daily_tasks')
      .select('id, user_telegram_id, daily_task_id, points_earned, completion_date')
      .eq('user_telegram_id', userData.telegram_id)
      .eq('completion_date', today);

    if (completedError) throw completedError;

    return { 
      data: { 
        tasks: tasks || [], 
        completedTasks: completedTasks || [] 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    return { data: null, error: error as Error };
  }
}