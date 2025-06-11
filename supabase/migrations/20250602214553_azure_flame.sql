/*
  # Update RLS policy for Telegram WebApp registration

  1. Changes
    - Enable RLS on users table
    - Remove all existing INSERT policies
    - Create new policy for anonymous Telegram WebApp registration
    - Maintain existing SELECT and UPDATE policies

  2. Security
    - Allows anonymous inserts with telegram_id
    - No auth token or JWT required
    - Prevents invalid data by requiring telegram_id
*/

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Insert user" ON public.users;
DROP POLICY IF EXISTS "Allow insert with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Users can insert only if telegram_id matches" ON public.users;
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;
DROP POLICY IF EXISTS "Allow insert from Telegram" ON public.users;
DROP POLICY IF EXISTS "Allow insert for all users with telegram_id" ON public.users;

-- Create new INSERT policy for Telegram WebApp
CREATE POLICY "Allow Telegram WebApp inserts"
  ON public.users
  FOR INSERT
  WITH CHECK (
    telegram_id IS NOT NULL
  );