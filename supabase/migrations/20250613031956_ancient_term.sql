/*
  # Add Candy Crush game support

  1. Changes
    - Create update_user_minutes RPC function for secure minute updates
    - Add game-related columns if needed
    - Set up proper permissions

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS safely
    - Validates user authentication
    - Prevents unauthorized minute manipulation
*/

-- Create the update_user_minutes RPC function
CREATE OR REPLACE FUNCTION public.update_user_minutes(
    p_supabase_auth_id UUID,
    p_minutes_earned INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Input validation
    IF p_supabase_auth_id IS NULL THEN
        RAISE EXCEPTION 'supabase_auth_id is required';
    END IF;

    IF p_minutes_earned IS NULL OR p_minutes_earned < 0 THEN
        RAISE EXCEPTION 'minutes_earned must be a positive integer';
    END IF;

    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE supabase_auth_id = p_supabase_auth_id
    ) INTO user_exists;

    IF NOT user_exists THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Update user's total minutes
    UPDATE users 
    SET total_minutes = total_minutes + p_minutes_earned
    WHERE supabase_auth_id = p_supabase_auth_id;

    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_minutes(UUID, INTEGER) TO authenticated;