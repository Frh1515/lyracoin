import { supabase } from './client';
import type { Task } from './types';

export async function getAvailableTasks(telegram_id: string): Promise<{
  data: Record<string, Task[]> | null;
  error: Error | null;
}> {
  try {
    // Get all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('platform');

    if (tasksError) throw tasksError;

    // Get user's claimed tasks for today
    const today = new Date().toISOString().split('T')[0];
    const { data: claimedTasks, error: claimedError } = await supabase
      .from('user_tasks')
      .select('task_id')
      .eq('user_id', telegram_id)
      .gte('completed_at', today);

    if (claimedError) throw claimedError;

    const claimedTaskIds = new Set(claimedTasks?.map(t => t.task_id));

    // Group available tasks by platform
    const groupedTasks = tasks?.reduce((acc, task) => {
      if (!claimedTaskIds.has(task.id)) {
        if (!acc[task.platform]) {
          acc[task.platform] = [];
        }
        acc[task.platform].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);

    return { data: groupedTasks, error: null };
  } catch (error) {
    console.error('Error fetching available tasks:', error);
    return { data: null, error: error as Error };
  }
}