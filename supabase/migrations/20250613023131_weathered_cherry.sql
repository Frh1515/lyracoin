/*
  # Update RLS policies for the new authentication flow

  1. Changes
    - Update RLS policies to work with the new RPC-based registration
    - Ensure proper access control for authenticated users
    - Allow RPC function to bypass RLS for registration

  2. Security
    - Maintains data isolation between users
    - Allows RPC function to perform necessary operations
    - Preserves existing security model
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for own data" ON public.users;
DROP POLICY IF EXISTS "Enable update for own data" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous registration" ON public.users;

-- Create new policies that work with the RPC approach
CREATE POLICY "Enable read access for own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = supabase_auth_id
  );

CREATE POLICY "Enable update for own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = supabase_auth_id
  )
  WITH CHECK (
    auth.uid() = supabase_auth_id
  );

-- Note: INSERT operations will be handled by the RPC function which uses SECURITY DEFINER
-- This allows the function to bypass RLS for the initial registration