/*
  # Fix users table RLS policies

  1. Changes
    - Add policy to allow public registration of new users
    - Keep existing policies for read/update operations

  2. Security
    - Users can only register with their own telegram_id
    - Maintains existing RLS for other operations
*/

-- Drop existing insert policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can insert own data'
  ) THEN
    DROP POLICY "Users can insert own data" ON users;
  END IF;
END $$;

-- Create new insert policy that allows registration
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (
    -- Ensure users can only register with their own telegram_id
    auth.uid()::text = telegram_id
    -- Add additional validation if needed
  );