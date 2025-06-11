/*
  # Update telegram_id to text type and fix policies
  
  1. Changes
    - Drop all policies on both tables
    - Change telegram_id and related columns to text type
    - Recreate foreign key constraints
    - Restore policies with updated column types
    
  2. Security
    - Temporarily disable RLS during migration
    - Restore all security policies after changes
*/

-- Step 1: Drop all policies from both tables
DROP POLICY IF EXISTS "Insert user" ON public.users;
DROP POLICY IF EXISTS "Allow insert with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Users can insert only if telegram_id matches" ON public.users;
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;
DROP POLICY IF EXISTS "Allow insert from Telegram" ON public.users;
DROP POLICY IF EXISTS "Allow insert for all users with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Allow Telegram WebApp inserts" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous Telegram registration" ON public.users;

DROP POLICY IF EXISTS "Users can read their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals only for themselves" ON public.referrals;

-- Step 2: Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop foreign key constraints
ALTER TABLE public.referrals 
  DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey,
  DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;

-- Step 4: Change telegram_id column type to text
ALTER TABLE public.users 
  ALTER COLUMN telegram_id TYPE text 
  USING telegram_id::text;

-- Step 5: Update referrals table columns
ALTER TABLE public.referrals
  ALTER COLUMN referrer_id TYPE text USING referrer_id::text,
  ALTER COLUMN referred_id TYPE text USING referred_id::text;

-- Step 6: Recreate foreign key constraints
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_referrer_id_fkey 
    FOREIGN KEY (referrer_id) REFERENCES users(telegram_id),
  ADD CONSTRAINT referrals_referred_id_fkey 
    FOREIGN KEY (referred_id) REFERENCES users(telegram_id);

-- Step 7: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Step 8: Recreate all policies
CREATE POLICY "Allow Telegram WebApp inserts"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    telegram_id IS NOT NULL
  );

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