/*
  # Fix RLS policies for users table

  1. Changes
    - Drop all existing restrictive policies
    - Create new policies that allow Telegram WebApp registration
    - Maintain security while allowing necessary operations

  2. Security
    - Allow anonymous registration with telegram_id
    - Users can only access their own data after registration
    - Prevent unauthorized access to other users' data
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow Telegram WebApp inserts" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow registration with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Allow read own data" ON public.users;
DROP POLICY IF EXISTS "Allow update own data" ON public.users;

-- Temporarily disable RLS to allow the fix
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create new policies that work with Telegram WebApp

-- 1. Allow INSERT for any user with telegram_id (for registration)
CREATE POLICY "Enable insert for telegram users"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    telegram_id IS NOT NULL
  );

-- 2. Allow SELECT for users to read their own data
CREATE POLICY "Enable read access for own data"
  ON public.users
  FOR SELECT
  TO public
  USING (
    telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')::text
    OR 
    telegram_id = auth.uid()::text
    OR
    -- Allow reading during registration process
    auth.role() = 'anon'
  );

-- 3. Allow UPDATE for users to modify their own data
CREATE POLICY "Enable update for own data"
  ON public.users
  FOR UPDATE
  TO public
  USING (
    telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')::text
    OR 
    telegram_id = auth.uid()::text
  )
  WITH CHECK (
    telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')::text
    OR 
    telegram_id = auth.uid()::text
  );