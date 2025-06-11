/*
  # Update RLS policies with Arabic support

  1. Changes
    - Add policies for reading and updating user data
    - Support Arabic text in policies
    - Maintain existing security model
    
  2. Security
    - Users can only access their own data
    - Maintains data isolation
    - Preserves existing permissions
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Read own user row" ON public.users;
DROP POLICY IF EXISTS "Update own user row" ON public.users;

-- Create policy for reading own user data
CREATE POLICY "Read own user row"
  ON public.users
  FOR SELECT
  TO public
  USING (
    auth.uid()::text = telegram_id
  );

-- Create policy for updating own user data
CREATE POLICY "Update own user row"
  ON public.users
  FOR UPDATE
  TO public
  USING (
    auth.uid()::text = telegram_id
  )
  WITH CHECK (
    auth.uid()::text = telegram_id
  );