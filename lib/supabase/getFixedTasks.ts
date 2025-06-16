import { supabase } from './client';

export interface FixedTask {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  platform: string;
  task_type: string;
  is_active: boolean;
  created_at: string;
}

export interface UserFixedTask {
  id: string;
  user_telegram_id: string;
  fixed_task_id: string;
  points_earned: number;
  completed_at: string;
}

export async function getFixedTasks(): Promise<{
  data: {
    availableTasks: FixedTask[];
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
      return {
        data: null,
        error: new Error('User not found')
      };
    }

    // Get all fixed tasks
    const { data: allTasks, error: tasksError } = await supabase
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

    // Filter available tasks (not completed)
    const completedTaskIds = new Set(completedTasks?.map(t => t.fixed_task_id) || []);
    const availableTasks = allTasks?.filter(task => !completedTaskIds.has(task.id)) || [];

    return {
      data: {
        availableTasks,
        completedTasks: completedTasks || []
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching fixed tasks:', error);
    return {
      data: null,
      error: error as Error
    };
  }
}