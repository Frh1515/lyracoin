/*
  # Update RLS policies for users table

  1. Changes
    - Enable RLS on users table
    - Drop existing INSERT policies
    - Create new flexible INSERT policy
    - Maintain existing SELECT and UPDATE policies

  2. Security
    - Allows registration when telegram_id is provided
    - Maintains data access security
    - Compatible with Telegram WebApp registration
*/

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Allow insert with telegram_id" ON public.users;
DROP POLICY IF EXISTS "Users can insert only if telegram_id matches" ON public.users;
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;
DROP POLICY IF EXISTS "Allow insert from Telegram" ON public.users;

-- Create new INSERT policy
CREATE POLICY "Allow insert for all users with telegram_id"
  ON public.users
  FOR INSERT
  WITH CHECK (
    telegram_id IS NOT NULL
  );