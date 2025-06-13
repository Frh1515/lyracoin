-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.register_telegram_user(TEXT, TEXT, INT);

-- Create enhanced registration function
CREATE OR REPLACE FUNCTION public.register_telegram_user(
    p_telegram_id TEXT,
    p_supabase_auth_id UUID DEFAULT NULL,
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

    -- Upsert user data with proper conflict resolution
    INSERT INTO public.users (
        telegram_id,
        supabase_auth_id,
        username,
        level,
        referral_count,
        total_minutes,
        points,
        referral_tier,
        lyra_balance,
        membership_level
    )
    VALUES (
        p_telegram_id,
        p_supabase_auth_id,
        p_username,
        p_level,
        0,
        0,
        0,
        'bronze',
        0,
        'bronze'
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
        -- CRITICAL FIX: Always update supabase_auth_id to the new session ID
        supabase_auth_id = EXCLUDED.supabase_auth_id,
        username = COALESCE(EXCLUDED.username, users.username),
        level = EXCLUDED.level,
        -- Keep existing values for other fields
        referral_count = users.referral_count,
        total_minutes = users.total_minutes,
        points = users.points,
        referral_tier = users.referral_tier,
        lyra_balance = users.lyra_balance,
        membership_level = users.membership_level
    RETURNING * INTO registered_user;
    
    RETURN registered_user;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO anon;