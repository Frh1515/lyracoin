/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy that allows initial registration
    - Maintain existing SELECT and UPDATE policies

  2. Security
    - Allow registration when:
      - telegram_id is provided
      - telegram_id doesn't already exist
    - Maintain row-level security for data access
*/

-- Drop existing INSERT policies to start fresh
DROP POLICY IF EXISTS "Allow initial user registration" ON public.users;
DROP POLICY IF EXISTS "Allow user registration" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Create new INSERT policy that allows initial registration
CREATE POLICY "Allow initial user registration"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    -- Ensure telegram_id is provided
    telegram_id IS NOT NULL
    -- Prevent duplicate registrations
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE users.telegram_id = telegram_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;