import { supabase } from './client';
import type { FixedTask, UserFixedTask } from './types';

export async function getFixedTasks(): Promise<{
  data: {
    tasks: FixedTask[];
    completedTasks: UserFixedTask[];
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

    // Get all fixed tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('fixed_tasks')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (tasksError) throw tasksError;

    // Get user's completed fixed tasks
    const { data: completedTasks, error: completedError } = await supabase
      .from('user_fixed_tasks')
      .select('*')
      .eq('user_telegram_id', userData.telegram_id);

    if (completedError) throw completedError;

    return { 
      data: { 
        tasks: tasks || [], 
        completedTasks: completedTasks || [] 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching fixed tasks:', error);
    return { data: null, error: error as Error };
  }
}