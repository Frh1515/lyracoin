/*
  # Revert Level System Changes

  1. Changes
    - Drop fixed_tasks table
    - Drop user_fixed_tasks table
    - Remove registration_bonus_applied column from users table
    - Drop level system functions
    - Revert register_telegram_user function to previous version
    - Revert process_referral function to previous version
    - Remove level system indexes

  2. Security
    - Maintains existing RLS policies
    - Preserves user data integrity
    - Reverts to previous stable state
*/

-- Drop tables created for level system
DROP TABLE IF EXISTS public.user_fixed_tasks CASCADE;
DROP TABLE IF EXISTS public.fixed_tasks CASCADE;

-- Remove registration_bonus_applied column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS registration_bonus_applied;

-- Drop level system functions
DROP FUNCTION IF EXISTS public.calculate_membership_level(integer);
DROP FUNCTION IF EXISTS public.update_user_points(text, integer, text);
DROP FUNCTION IF EXISTS public.apply_registration_bonus(text);
DROP FUNCTION IF EXISTS public.claim_fixed_task(text, uuid);

-- Drop level system indexes
DROP INDEX IF EXISTS idx_user_fixed_tasks_user_id;
DROP INDEX IF EXISTS idx_user_fixed_tasks_task_id;
DROP INDEX IF EXISTS idx_users_points;
DROP INDEX IF EXISTS idx_users_membership_level;
DROP INDEX IF EXISTS idx_users_registration_bonus;

-- Revert register_telegram_user function to previous version
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
        -- Always update supabase_auth_id to the new session ID
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

-- Revert process_referral function to previous version
CREATE OR REPLACE FUNCTION process_referral(
  p_referrer_telegram_id text,
  p_referred_telegram_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_existing_referral_count integer;
  v_referral_id uuid;
BEGIN
  -- Validate inputs
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid telegram IDs'
    );
  END IF;
  
  -- Prevent self-referral
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot refer yourself'
    );
  END IF;
  
  -- Check if referred user already has a referral
  SELECT COUNT(*) INTO v_existing_referral_count
  FROM referrals
  WHERE referred_id = p_referred_telegram_id;
  
  IF v_existing_referral_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User already referred'
    );
  END IF;
  
  -- Check if both users exist
  IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = p_referrer_telegram_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referrer not found'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = p_referred_telegram_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referred user not found'
    );
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
  RETURNING id INTO v_referral_id;
  
  -- Update referrer's referral count
  UPDATE users
  SET referral_count = referral_count + 1
  WHERE telegram_id = p_referrer_telegram_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO anon;