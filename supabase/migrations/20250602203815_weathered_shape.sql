/*
  # Update users table RLS policies for Telegram registration

  1. Changes
    - Drop existing restrictive INSERT policies
    - Create new INSERT policy that allows registration with telegram_id
    - Maintain existing SELECT and UPDATE policies

  2. Security
    - Ensures telegram_id is always provided
    - Allows registration without requiring authentication
    - Maintains data integrity with unique telegram_id constraint
*/

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Allow insert with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Users can insert only if telegram_id matches" ON public.users;
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;
DROP POLICY IF EXISTS "Allow insert from Telegram" ON public.users;

-- Create new INSERT policy
CREATE POLICY "Allow insert from Telegram"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    telegram_id IS NOT NULL
  );