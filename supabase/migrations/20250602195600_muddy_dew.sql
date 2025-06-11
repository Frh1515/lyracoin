/*
  # Fix users table RLS policies

  1. Changes
    - Remove existing restrictive INSERT policy
    - Add new INSERT policy that allows registration without auth
    - Keep existing SELECT and UPDATE policies unchanged
  
  2. Security
    - Allows initial user registration
    - Maintains data isolation for read/update operations
    - Prevents duplicate registrations through unique constraints
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create new INSERT policy that allows registration
CREATE POLICY "Allow initial user registration" 
ON users 
FOR INSERT 
TO public 
WITH CHECK (
  -- Ensure telegram_id is provided
  telegram_id IS NOT NULL AND
  -- Prevent duplicate registrations (though this is also enforced by unique constraint)
  NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.telegram_id = telegram_id
  )
);

-- Note: Existing SELECT and UPDATE policies remain unchanged as they work correctly:
-- Users can only read and update their own data where telegram_id matches their auth ID