/*
  # Update RLS policies with proper type casting

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper type casting
    - Fix comparison between telegram_id and auth.uid()

  2. Security
    - Maintain data isolation between users
    - Allow registration through Telegram WebApp
    - Ensure proper type handling
*/

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow only Telegram ID" ON public.users;
DROP POLICY IF EXISTS "Allow insert for own user" ON public.users;
DROP POLICY IF EXISTS "Allow select own user" ON public.users;
DROP POLICY IF EXISTS "Allow update own user" ON public.users;
DROP POLICY IF EXISTS "Allow Telegram WebApp inserts" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow Telegram registration" ON public.users;
DROP POLICY IF EXISTS "Allow read own data" ON public.users;
DROP POLICY IF EXISTS "Allow update own data" ON public.users;

-- Create new INSERT policy
CREATE POLICY "Allow Telegram registration"
  ON public.users
  FOR INSERT
  WITH CHECK (telegram_id IS NOT NULL);

-- Create new SELECT policy
CREATE POLICY "Allow read own data"
  ON public.users
  FOR SELECT
  USING (telegram_id::text = auth.uid()::text);

-- Create new UPDATE policy
CREATE POLICY "Allow update own data"
  ON public.users
  FOR UPDATE
  USING (telegram_id::text = auth.uid()::text)
  WITH CHECK (telegram_id::text = auth.uid()::text);

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;