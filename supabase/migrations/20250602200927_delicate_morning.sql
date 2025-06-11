/*
  # Update users table RLS policy for Telegram WebApp registration

  1. Changes
    - Enable RLS on users table
    - Drop existing INSERT policies
    - Create new INSERT policy that allows registration with telegram_id
    - Preserve existing SELECT and UPDATE policies

  2. Security
    - Ensures telegram_id is always provided
    - Allows unauthenticated registration for Telegram WebApp
    - Maintains data access security post-registration
*/

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive insert policies
DROP POLICY IF EXISTS "Allow insert with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Users can insert only if telegram_id matches" ON public.users;
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;
DROP POLICY IF EXISTS "Allow user registration" ON public.users;

-- Create new insert policy
CREATE POLICY "Allow insert with valid telegram_id"
  ON public.users
  FOR INSERT
  WITH CHECK (
    telegram_id IS NOT NULL
  );