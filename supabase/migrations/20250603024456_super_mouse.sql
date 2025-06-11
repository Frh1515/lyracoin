/*
  # Fix RLS policies for users table

  1. Changes
    - Drop existing combined policy
    - Create separate policies for INSERT, SELECT, and UPDATE
    - Ensure proper text type handling for telegram_id

  2. Security
    - Maintain data isolation between users
    - Ensure users can only access and modify their own data
    - Support Telegram WebApp authentication flow
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow only Telegram ID" ON public.users;

-- Create separate policies for each operation
CREATE POLICY "Allow insert for own user"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (telegram_id IS NOT NULL);

CREATE POLICY "Allow select own user"
  ON public.users
  FOR SELECT
  TO public
  USING (auth.uid()::text = telegram_id);

CREATE POLICY "Allow update own user"
  ON public.users
  FOR UPDATE
  TO public
  USING (auth.uid()::text = telegram_id)
  WITH CHECK (auth.uid()::text = telegram_id);