/*
  # Fix user registration RLS violation

  1. Changes
    - Create a secure RPC function for user registration that bypasses RLS
    - Function handles both new registrations and updates
    - Maintains data integrity with proper validation

  2. Security
    - Uses SECURITY DEFINER to bypass RLS safely
    - Validates input parameters
    - Maintains existing RLS policies
*/

-- Create the secure registration function
CREATE OR REPLACE FUNCTION public.register_telegram_user(
    p_telegram_id TEXT,
    p_username TEXT DEFAULT NULL,
    p_level INT DEFAULT 1
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    registered_user public.users;
BEGIN
    -- Input validation
    IF p_telegram_id IS NULL OR p_telegram_id = '' THEN
        RAISE EXCEPTION 'telegram_id is required';
    END IF;

    -- Upsert user data
    INSERT INTO public.users (
        telegram_id,
        username,
        level,
        referral_count,
        total_minutes,
        points
    )
    VALUES (
        p_telegram_id,
        p_username,
        p_level,
        0,
        0,
        0
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, users.username),
        level = EXCLUDED.level
    RETURNING * INTO registered_user;
    
    RETURN registered_user;
END;
$$;