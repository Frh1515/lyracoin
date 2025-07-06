/*
  # Fix paid tasks integration functions

  1. New Functions
    - `get_active_paid_tasks()` - Returns all active paid tasks
    - `record_task_click_with_rewards()` - Records a click on a paid task and awards points and minutes
    - `has_completed_paid_task_today()` - Checks if a user has completed a paid task today
    - `get_user_completed_paid_tasks()` - Gets all paid tasks completed by a user today
    - `get_active_paid_tasks_for_daily()` - Gets active paid tasks for the daily tasks section
  
  2. Updated Functions
    - `get_user_paid_tasks()` - Updated to include lyra_per_click
*/

-- Function to get all active paid tasks for display in daily tasks section
CREATE OR REPLACE FUNCTION get_active_paid_tasks() RETURNS JSONB AS $$
DECLARE
  v_tasks JSONB;
BEGIN
  -- Get all active paid tasks
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'description', t.description,
        'link', t.link,
        'platform', t.platform,
        'total_clicks', t.total_clicks,
        'completed_clicks', t.completed_clicks,
        'target_community', t.target_community,
        'price_paid', t.price_paid,
        'lyra_per_click', (t.price_paid / t.total_clicks),
        'status', t.status,
        'created_at', t.created_at,
        'published_at', t.published_at
      )
    ) INTO v_tasks
  FROM paid_tasks t
  WHERE 
    t.status = 'active' AND 
    t.payment_verified = true AND
    t.published_at IS NOT NULL;
  
  -- Return empty array if no tasks found
  IF v_tasks IS NULL THEN
    v_tasks := '[]'::jsonb;
  END IF;
  
  RETURN v_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a click on a paid task and award points and minutes to the user
CREATE OR REPLACE FUNCTION record_task_click_with_rewards(
  p_task_id UUID,
  p_user_telegram_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_lyra_per_click NUMERIC;
  v_result JSONB;
  v_click_id UUID;
  v_points_reward INTEGER := 10; -- Default points reward for clicking a paid task
  v_minutes_reward INTEGER := 10; -- Default minutes reward for clicking a paid task
BEGIN
  -- Get task details
  SELECT 
    id, 
    status, 
    total_clicks, 
    completed_clicks, 
    price_paid,
    user_telegram_id AS task_owner_id
  INTO v_task
  FROM paid_tasks
  WHERE id = p_task_id;
  
  -- Check if task exists
  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task not found'
    );
  END IF;
  
  -- Check if task is active
  IF v_task.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task is not active'
    );
  END IF;
  
  -- Check if task is already completed
  IF v_task.completed_clicks >= v_task.total_clicks THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task is already completed'
    );
  END IF;
  
  -- Check if user is not clicking their own task
  IF v_task.task_owner_id = p_user_telegram_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot click on your own task'
    );
  END IF;
  
  -- Check if user has already clicked this task today
  IF EXISTS (
    SELECT 1 FROM task_clicks 
    WHERE 
      task_id = p_task_id AND 
      user_telegram_id = p_user_telegram_id AND
      clicked_at::date = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You have already completed this task today'
    );
  END IF;
  
  -- Calculate LYRA per click
  v_lyra_per_click := v_task.price_paid / v_task.total_clicks;
  
  -- Record the click
  INSERT INTO task_clicks (
    task_id,
    user_telegram_id,
    lyra_consumed
  ) VALUES (
    p_task_id,
    p_user_telegram_id,
    v_lyra_per_click
  )
  RETURNING id INTO v_click_id;
  
  -- Update task completed_clicks
  UPDATE paid_tasks
  SET 
    completed_clicks = completed_clicks + 1,
    -- If completed, update status
    status = CASE 
      WHEN completed_clicks + 1 >= total_clicks THEN 'completed'::text
      ELSE status
    END
  WHERE id = p_task_id;
  
  -- Award points and minutes to the user who clicked
  UPDATE users
  SET 
    points = points + v_points_reward,
    total_minutes = total_minutes + v_minutes_reward
  WHERE telegram_id = p_user_telegram_id;
  
  -- Return success with rewards
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task completed successfully',
    'click_id', v_click_id,
    'lyra_consumed', v_lyra_per_click,
    'completed_clicks', v_task.completed_clicks + 1,
    'total_clicks', v_task.total_clicks,
    'is_completed', (v_task.completed_clicks + 1) >= v_task.total_clicks,
    'points_earned', v_points_reward,
    'minutes_earned', v_minutes_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has completed a paid task today
CREATE OR REPLACE FUNCTION has_completed_paid_task_today(
  p_task_id UUID,
  p_user_telegram_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM task_clicks 
    WHERE 
      task_id = p_task_id AND 
      user_telegram_id = p_user_telegram_id AND
      clicked_at::date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get completed paid tasks for a user
CREATE OR REPLACE FUNCTION get_user_completed_paid_tasks(
  p_user_telegram_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_completed_tasks JSONB;
BEGIN
  -- Get all task IDs that the user has clicked today
  SELECT 
    jsonb_agg(DISTINCT task_id) INTO v_completed_tasks
  FROM task_clicks
  WHERE 
    user_telegram_id = p_user_telegram_id AND
    clicked_at::date = CURRENT_DATE;
  
  -- Return empty array if no tasks found
  IF v_completed_tasks IS NULL THEN
    v_completed_tasks := '[]'::jsonb;
  END IF;
  
  RETURN v_completed_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing function before redefining it
DROP FUNCTION IF EXISTS get_user_paid_tasks(TEXT);

-- Update the get_user_paid_tasks function to include lyra_per_click
CREATE OR REPLACE FUNCTION get_user_paid_tasks(
  p_user_telegram_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tasks JSONB;
BEGIN
  -- Get all tasks created by the user
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'description', t.description,
        'link', t.link,
        'platform', t.platform,
        'total_clicks', t.total_clicks,
        'completed_clicks', t.completed_clicks,
        'target_community', t.target_community,
        'price_paid', t.price_paid,
        'lyra_per_click', (t.price_paid / t.total_clicks),
        'payment_method', t.payment_method,
        'status', t.status,
        'payment_verified', t.payment_verified,
        'created_at', t.created_at,
        'published_at', t.published_at
      )
    ) INTO v_tasks
  FROM paid_tasks t
  WHERE t.user_telegram_id = p_user_telegram_id;
  
  -- Return empty array if no tasks found
  IF v_tasks IS NULL THEN
    v_tasks := '[]'::jsonb;
  END IF;
  
  RETURN v_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active paid tasks for the daily tasks section
CREATE OR REPLACE FUNCTION get_active_paid_tasks_for_daily(
  p_user_telegram_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tasks JSONB;
  v_completed_tasks JSONB;
  v_result JSONB;
BEGIN
  -- Get all active paid tasks
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'description', t.description,
        'link', t.link,
        'platform', t.platform,
        'total_clicks', t.total_clicks,
        'completed_clicks', t.completed_clicks,
        'target_community', t.target_community,
        'price_paid', t.price_paid,
        'lyra_per_click', (t.price_paid / t.total_clicks),
        'status', t.status,
        'created_at', t.created_at,
        'published_at', t.published_at
      )
    ) INTO v_tasks
  FROM paid_tasks t
  WHERE 
    t.status = 'active' AND 
    t.payment_verified = true AND
    t.published_at IS NOT NULL AND
    t.user_telegram_id != p_user_telegram_id; -- Don't show user's own tasks
  
  -- Get completed tasks for this user
  SELECT get_user_completed_paid_tasks(p_user_telegram_id) INTO v_completed_tasks;
  
  -- Return empty array if no tasks found
  IF v_tasks IS NULL THEN
    v_tasks := '[]'::jsonb;
  END IF;
  
  -- Build result object
  v_result := jsonb_build_object(
    'tasks', v_tasks,
    'completed_tasks', v_completed_tasks
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;