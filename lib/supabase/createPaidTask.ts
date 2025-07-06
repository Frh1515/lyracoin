import { supabase } from './client';

export interface PaidTaskData {
  link: string;
  clicks: number;
  community: string;
  price: number;
}

export async function createPaidTask(
  taskData: PaidTaskData
): Promise<{
  success: boolean;
  message: string;
  taskId?: string;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Get user's telegram_id and current LYRA balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id, lyra_balance')
      .eq('supabase_auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check if user has enough LYRA balance
    if (userData.lyra_balance < taskData.price) {
      return {
        success: false,
        message: 'Insufficient LYRA balance'
      };
    }

    // Validate task data
    if (!taskData.link.startsWith('https://')) {
      return {
        success: false,
        message: 'Invalid link format'
      };
    }

    if (![500, 1000, 2000, 5000, 10000].includes(taskData.clicks)) {
      return {
        success: false,
        message: 'Invalid clicks amount'
      };
    }

    const validCommunities = ['AR', 'EN', 'RU', 'FR', 'FA', 'ID', 'ES', 'UZ'];
    if (!validCommunities.includes(taskData.community)) {
      return {
        success: false,
        message: 'Invalid community selection'
      };
    }

    // Create the paid task (this would be a new table in real implementation)
    // For now, we'll just deduct the LYRA balance
    const { error: updateError } = await supabase
      .from('users')
      .update({
        lyra_balance: userData.lyra_balance - taskData.price
      })
      .eq('supabase_auth_id', user.id);

    if (updateError) {
      throw updateError;
    }

    // In a real implementation, you would also:
    // 1. Insert the task into a 'paid_tasks' table
    // 2. Set status to 'pending_verification'
    // 3. Create a payment verification record
    // 4. Send notification to admins for verification

    return {
      success: true,
      message: `Task created successfully! ${taskData.price} LYRA deducted from your balance`,
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } catch (error) {
    console.error('Error creating paid task:', error);
    return {
      success: false,
      message: 'Failed to create paid task'
    };
  }
}

export async function getUserPaidTasks(): Promise<{
  data: any[] | null;
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

    // In a real implementation, this would fetch from a 'paid_tasks' table
    // For now, return empty array
    return {
      data: [],
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