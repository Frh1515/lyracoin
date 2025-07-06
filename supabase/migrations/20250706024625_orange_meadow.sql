/*
  # Fix task consumption system

  1. New Tables
    - `task_clicks` - Records individual clicks on tasks
    - `task_click_batches` - Records batches of clicks for processing
  
  2. Functions
    - `record_task_click` - Records a single click on a task
    - `process_click_batch` - Processes a batch of clicks
    - `update_task_completion_status` - Updates task status based on completion
    - `trigger_update_task_status` - Trigger function for updating task status
    - `simulate_task_clicks` - Simulates clicks for testing
    - `add_task_balance` - Adds balance to a task
  
  3. Security
    - Enable RLS on new tables
    - Add policies for task clicks and batches
*/

-- Create task_clicks table
CREATE TABLE IF NOT EXISTS task_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES paid_tasks(id) ON DELETE CASCADE,
  user_telegram_id TEXT NOT NULL REFERENCES users(telegram_id),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lyra_consumed NUMERIC NOT NULL,
  
  CONSTRAINT task_clicks_user_task_unique UNIQUE (task_id, user_telegram_id, clicked_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_clicks_task_id ON task_clicks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_clicks_user ON task_clicks(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_task_clicks_timestamp ON task_clicks(clicked_at);

-- Create task_click_batches table for batch processing
CREATE TABLE IF NOT EXISTS task_click_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES paid_tasks(id) ON DELETE CASCADE,
  clicks_count INTEGER NOT NULL,
  total_lyra_consumed NUMERIC NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_click_batches_task_id ON task_click_batches(task_id);

-- Function to record a click on a task
CREATE OR REPLACE FUNCTION record_task_click(
  p_task_id UUID,
  p_user_telegram_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_lyra_per_click NUMERIC;
  v_result JSONB;
  v_click_id UUID;
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
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Click recorded successfully',
    'click_id', v_click_id,
    'lyra_consumed', v_lyra_per_click,
    'completed_clicks', v_task.completed_clicks + 1,
    'total_clicks', v_task.total_clicks,
    'is_completed', (v_task.completed_clicks + 1) >= v_task.total_clicks
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process a batch of clicks
CREATE OR REPLACE FUNCTION process_click_batch(
  p_task_id UUID,
  p_clicks_count INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_lyra_per_click NUMERIC;
  v_total_lyra_consumed NUMERIC;
  v_batch_id UUID;
  v_new_completed_clicks INTEGER;
  v_is_completed BOOLEAN;
BEGIN
  -- Get task details
  SELECT 
    id, 
    status, 
    total_clicks, 
    completed_clicks, 
    price_paid
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
  
  -- Calculate how many clicks can actually be processed
  p_clicks_count := LEAST(p_clicks_count, v_task.total_clicks - v_task.completed_clicks);
  
  -- If no clicks can be processed, return
  IF p_clicks_count <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No clicks can be processed'
    );
  END IF;
  
  -- Calculate LYRA per click and total consumption
  v_lyra_per_click := v_task.price_paid / v_task.total_clicks;
  v_total_lyra_consumed := v_lyra_per_click * p_clicks_count;
  
  -- Record the batch
  INSERT INTO task_click_batches (
    task_id,
    clicks_count,
    total_lyra_consumed
  ) VALUES (
    p_task_id,
    p_clicks_count,
    v_total_lyra_consumed
  )
  RETURNING id INTO v_batch_id;
  
  -- Update task completed_clicks
  v_new_completed_clicks := v_task.completed_clicks + p_clicks_count;
  v_is_completed := v_new_completed_clicks >= v_task.total_clicks;
  
  UPDATE paid_tasks
  SET 
    completed_clicks = v_new_completed_clicks,
    -- If completed, update status
    status = CASE 
      WHEN v_is_completed THEN 'completed'::text
      ELSE status
    END
  WHERE id = p_task_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Batch processed successfully',
    'batch_id', v_batch_id,
    'clicks_processed', p_clicks_count,
    'lyra_consumed', v_total_lyra_consumed,
    'completed_clicks', v_new_completed_clicks,
    'total_clicks', v_task.total_clicks,
    'is_completed', v_is_completed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update task status based on completion
CREATE OR REPLACE FUNCTION update_task_completion_status(
  p_task_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Get task details
  SELECT 
    id, 
    status, 
    total_clicks, 
    completed_clicks
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
  
  v_old_status := v_task.status;
  
  -- Determine new status
  IF v_task.completed_clicks >= v_task.total_clicks THEN
    v_new_status := 'completed';
  ELSIF v_task.status = 'paused' THEN
    v_new_status := 'paused';
  ELSE
    v_new_status := 'active';
  END IF;
  
  -- Update status if changed
  IF v_old_status != v_new_status THEN
    UPDATE paid_tasks
    SET status = v_new_status
    WHERE id = p_task_id;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task status updated',
    'old_status', v_old_status,
    'new_status', v_new_status,
    'completed_clicks', v_task.completed_clicks,
    'total_clicks', v_task.total_clicks,
    'completion_percentage', (v_task.completed_clicks::NUMERIC / v_task.total_clicks::NUMERIC) * 100
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update task status when clicks reach target
CREATE OR REPLACE FUNCTION trigger_update_task_status() RETURNS TRIGGER AS $$
BEGIN
  -- Check if task is completed
  IF NEW.completed_clicks >= NEW.total_clicks AND NEW.status != 'completed' THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on paid_tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_task_status_on_click'
  ) THEN
    CREATE TRIGGER update_task_status_on_click
    BEFORE UPDATE OF completed_clicks ON paid_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_task_status();
  END IF;
END $$;

-- Add RLS policies for task_clicks
ALTER TABLE task_clicks ENABLE ROW LEVEL SECURITY;

-- Check if policies exist before creating them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_clicks' AND policyname = 'Users can read their own task clicks'
  ) THEN
    CREATE POLICY "Users can read their own task clicks"
    ON task_clicks
    FOR SELECT
    TO authenticated
    USING (
      user_telegram_id IN (
        SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_clicks' AND policyname = 'Task owners can read clicks on their tasks'
  ) THEN
    CREATE POLICY "Task owners can read clicks on their tasks"
    ON task_clicks
    FOR SELECT
    TO authenticated
    USING (
      task_id IN (
        SELECT id FROM paid_tasks 
        WHERE user_telegram_id IN (
          SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Add RLS policies for task_click_batches
ALTER TABLE task_click_batches ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_click_batches' AND policyname = 'Task owners can read click batches for their tasks'
  ) THEN
    CREATE POLICY "Task owners can read click batches for their tasks"
    ON task_click_batches
    FOR SELECT
    TO authenticated
    USING (
      task_id IN (
        SELECT id FROM paid_tasks 
        WHERE user_telegram_id IN (
          SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Function to simulate clicks for testing
CREATE OR REPLACE FUNCTION simulate_task_clicks(
  p_task_id UUID,
  p_clicks_count INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Process clicks as a batch
  SELECT process_click_batch(p_task_id, p_clicks_count) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add balance to a task
CREATE OR REPLACE FUNCTION add_task_balance(
  p_task_id UUID,
  p_additional_balance NUMERIC,
  p_user_telegram_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_user RECORD;
  v_new_total_clicks INTEGER;
  v_lyra_per_click NUMERIC;
BEGIN
  -- Get task details
  SELECT 
    id, 
    user_telegram_id AS task_owner_id,
    total_clicks,
    completed_clicks,
    price_paid,
    status
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
  
  -- Check if user owns the task
  IF v_task.task_owner_id != p_user_telegram_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You do not own this task'
    );
  END IF;
  
  -- Get user's LYRA balance
  SELECT lyra_balance INTO v_user
  FROM users
  WHERE telegram_id = p_user_telegram_id;
  
  -- Check if user has enough balance
  IF v_user.lyra_balance < p_additional_balance THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient LYRA balance'
    );
  END IF;
  
  -- Calculate new total clicks based on the same price per click
  v_lyra_per_click := v_task.price_paid / v_task.total_clicks;
  v_new_total_clicks := v_task.total_clicks + (p_additional_balance / v_lyra_per_click)::INTEGER;
  
  -- Update task
  UPDATE paid_tasks
  SET 
    total_clicks = v_new_total_clicks,
    price_paid = price_paid + p_additional_balance,
    -- If task was completed but now has more clicks, reactivate it
    status = CASE 
      WHEN status = 'completed' AND v_task.completed_clicks < v_new_total_clicks THEN 'active'
      ELSE status
    END
  WHERE id = p_task_id;
  
  -- Deduct LYRA from user's balance
  UPDATE users
  SET lyra_balance = lyra_balance - p_additional_balance
  WHERE telegram_id = p_user_telegram_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task balance updated successfully',
    'additional_balance', p_additional_balance,
    'new_total_clicks', v_new_total_clicks,
    'new_total_balance', v_task.price_paid + p_additional_balance,
    'new_status', CASE 
      WHEN v_task.status = 'completed' AND v_task.completed_clicks < v_new_total_clicks THEN 'active'
      ELSE v_task.status
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;