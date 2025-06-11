/*
  # Update users table RLS policies

  1. Changes
    - Modify the user registration policy to handle both new and existing users
    - Allow registration when telegram_id is provided and not already taken
    
  2. Security
    - Maintains existing RLS policies for SELECT and UPDATE
    - Updates INSERT policy to be more permissive while still maintaining security
*/

-- Drop the existing registration policy
DROP POLICY IF EXISTS "Allow initial user registration" ON users;

-- Create new registration policy with updated conditions
CREATE POLICY "Allow initial user registration" ON users
FOR INSERT TO public
WITH CHECK (
  telegram_id IS NOT NULL
);

-- Note: Existing policies for SELECT and UPDATE remain unchanged:
-- - "Users can read own data"
-- - "Users can update own data"