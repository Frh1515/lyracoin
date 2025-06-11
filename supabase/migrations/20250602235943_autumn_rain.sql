/*
  # Update RLS policies for users and referrals tables

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create comprehensive set of policies for users table
    - Create policies for referrals table
    - Ensure proper text type handling for telegram_id

  2. Security
    - Allow public registration through Telegram WebApp
    - Restrict data access to own records only
    - Prevent self-referrals
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Read own user row" ON public.users;
DROP POLICY IF EXISTS "Update own user row" ON public.users;
DROP POLICY IF EXISTS "Allow Telegram WebApp inserts" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can read their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals only for themselves" ON public.referrals;

-- Create policies for users table
CREATE POLICY "Allow Telegram WebApp inserts"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    telegram_id IS NOT NULL
  );

CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO public
  USING (
    auth.uid()::text = telegram_id
  );

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO public
  USING (
    auth.uid()::text = telegram_id
  )
  WITH CHECK (
    auth.uid()::text = telegram_id
  );

-- Create policies for referrals table
CREATE POLICY "Users can read their own referrals"
  ON public.referrals
  FOR SELECT
  TO public
  USING (
    auth.uid()::text = referrer_id OR 
    auth.uid()::text = referred_id
  );

CREATE POLICY "Users can insert referrals only for themselves"
  ON public.referrals
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid()::text = referred_id AND
    referrer_id != referred_id
  );