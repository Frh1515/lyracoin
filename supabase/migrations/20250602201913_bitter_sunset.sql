/*
  # Reset and configure RLS policy for users table

  1. Changes
    - Enable RLS on users table
    - Remove all existing INSERT policies
    - Create new INSERT policy that allows registration with telegram_id

  2. Security
    - Allows any row insertion where telegram_id is present
    - Works with .upsert() from Telegram WebApp
    - Bypasses Supabase session requirement
    - Compatible with anonymous requests from Telegram
*/

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Remove all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Allow insert with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Users can insert only if telegram_id matches" ON public.users;
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;

-- Step 3: Create a clean insert policy
CREATE POLICY "Allow insert from Telegram"
  ON public.users
  FOR INSERT
  WITH CHECK (
    telegram_id IS NOT NULL
  );