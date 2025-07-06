/*
  # Fix task_clicks policies

  1. Changes
    - Use DO blocks with existence checks for each policy to prevent "policy already exists" errors
    - Maintains all the same functionality as previous migrations
    - Ensures policies are only created if they don't already exist
*/

-- Add RLS policies for task_clicks with proper existence checks
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
END $$;

DO $$
BEGIN
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

-- Add RLS policy for task_click_batches with proper existence check
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