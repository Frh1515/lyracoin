/*
  # Fix users table RLS policies for registration

  1. Changes
    - Drop existing INSERT policies to avoid conflicts
    - Create new INSERT policy that allows initial registration without requiring auth
    - Maintain existing SELECT and UPDATE policies
    - Ensure RLS remains enabled

  2. Security
    - Only allows registration when:
      - telegram_id is provided
      - The telegram_id doesn't already exist
    - Prevents duplicate registrations
    - Maintains data access security post-registration
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
    telegram_id IS NOT NULL AND
    NOT EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = users.telegram_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;