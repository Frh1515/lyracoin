/*
  # Fix RLS policies for user registration

  1. Changes
    - Remove existing INSERT policies that are too restrictive
    - Add new INSERT policy that allows registration with telegram_id
    - Keep existing SELECT and UPDATE policies for data protection
  
  2. Security
    - Maintains RLS enabled on users table
    - Allows initial user registration with telegram_id
    - Preserves data access restrictions for existing users
*/

-- Drop existing INSERT policies that are conflicting
DROP POLICY IF EXISTS "Allow Telegram insert only if uid = telegram_id" ON public.users;
DROP POLICY IF EXISTS "Allow Telegram registration" ON public.users;
DROP POLICY IF EXISTS "Allow WebApp Telegram insert with telegram_id" ON public.users;

-- Create new INSERT policy that allows registration with telegram_id
CREATE POLICY "Allow registration with telegram_id"
ON public.users
FOR INSERT
TO public
WITH CHECK (
  telegram_id IS NOT NULL AND
  NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.telegram_id = telegram_id
  )
);