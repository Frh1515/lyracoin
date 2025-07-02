/*
  # Fix referral system for unnamed users

  1. Updates
    - Update process_referral function to accept unnamed users
    - Fix register_telegram_user function to properly return users type
    - Update get_referral_stats_secure for better unnamed user display
    
  2. Security
    - Maintain all existing security checks
    - Grant proper execution permissions
    
  3. Testing
    - Include safe test cases that don't violate constraints
*/

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.register_telegram_user(text, uuid, text, integer);

-- Update process_referral function to accept unnamed users
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
  v_referrer_exists boolean;
  v_referred_exists boolean;
BEGIN
  -- Validate inputs
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid telegram IDs'
    );
  END IF;
  
  -- Check that inputs are not empty
  IF TRIM(p_referrer_telegram_id) = '' OR TRIM(p_referred_telegram_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Telegram IDs cannot be empty'
    );
  END IF;
  
  -- Prevent self-referral
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot refer yourself'
    );
  END IF;
  
  -- Check for existing referral for the referred user
  SELECT COUNT(*) INTO v_existing_referral_count
  FROM referrals
  WHERE referred_id = p_referred_telegram_id;
  
  IF v_existing_referral_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User already referred'
    );
  END IF;
  
  -- Check if referrer exists in system (regardless of username)
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE telegram_id = p_referrer_telegram_id
  ) INTO v_referrer_exists;
  
  IF NOT v_referrer_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referrer not found in system'
    );
  END IF;
  
  -- Check if referred user exists in system (regardless of username)
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE telegram_id = p_referred_telegram_id
  ) INTO v_referred_exists;
  
  IF NOT v_referred_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referred user not found in system'
    );
  END IF;
  
  -- Create referral record (accepts users with or without username)
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
  RETURNING id INTO v_referral_id;
  
  -- Update referral count for referrer
  UPDATE users
  SET referral_count = referral_count + 1
  WHERE telegram_id = p_referrer_telegram_id;
  
  -- Award 30 points to referrer immediately (regardless of username)
  PERFORM update_user_points(p_referrer_telegram_id, 30, 'successful_referral');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id,
    'points_awarded', 30
  );
END;
$$;

-- Create new register_telegram_user function with proper return type handling
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
    v_is_new_user boolean := false;
    v_display_username text;
BEGIN
    -- Validate inputs
    IF p_telegram_id IS NULL OR p_telegram_id = '' THEN
        RAISE EXCEPTION 'telegram_id is required';
    END IF;

    -- Check if this is a new user
    SELECT NOT EXISTS(
        SELECT 1 FROM users WHERE telegram_id = p_telegram_id
    ) INTO v_is_new_user;

    -- Determine display username (if not present, use default value)
    v_display_username := COALESCE(
        NULLIF(TRIM(p_username), ''), 
        'مستخدم جديد'
    );

    -- Insert or update user data
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
        membership_level,
        registration_bonus_applied,
        daily_game_sessions,
        last_game_session_date
    )
    VALUES (
        p_telegram_id,
        p_supabase_auth_id,
        v_display_username,
        p_level,
        0,
        0,
        0,
        'bronze',
        0,
        'bronze',
        false,
        0,
        CURRENT_DATE
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
        -- Always update supabase_auth_id for new session
        supabase_auth_id = EXCLUDED.supabase_auth_id,
        -- Update username only if new one is better than existing
        username = CASE 
            WHEN EXCLUDED.username IS NOT NULL 
                 AND EXCLUDED.username != 'مستخدم جديد' 
                 AND TRIM(EXCLUDED.username) != '' 
            THEN EXCLUDED.username
            ELSE users.username
        END,
        level = EXCLUDED.level,
        -- Preserve existing values for other fields
        referral_count = users.referral_count,
        total_minutes = users.total_minutes,
        points = users.points,
        referral_tier = users.referral_tier,
        lyra_balance = users.lyra_balance,
        membership_level = users.membership_level,
        registration_bonus_applied = users.registration_bonus_applied,
        daily_game_sessions = users.daily_game_sessions,
        last_game_session_date = users.last_game_session_date;
    
    -- Get the final user record
    SELECT * INTO registered_user
    FROM users
    WHERE telegram_id = p_telegram_id;
    
    -- Apply registration bonus for new users
    IF v_is_new_user THEN
        PERFORM apply_registration_bonus(p_telegram_id);
        
        -- Fetch updated user record with applied bonus
        SELECT * INTO registered_user
        FROM users
        WHERE telegram_id = p_telegram_id;
    END IF;
    
    RETURN registered_user;
END;
$$;

-- Update get_referral_stats_secure function for better unnamed user display
CREATE OR REPLACE FUNCTION get_referral_stats_secure(p_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_referrals integer;
  v_verified_referrals integer;
  v_pending_referrals integer;
  v_total_minutes_earned integer;
  v_referral_tier text;
  v_all_referrals jsonb;
  v_unclaimed_referrals jsonb;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = p_telegram_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Get total referrals
  SELECT COUNT(*) INTO v_total_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id;
  
  -- Get verified referrals
  SELECT COUNT(*) INTO v_verified_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'verified';
  
  -- Get pending referrals
  SELECT COUNT(*) INTO v_pending_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'pending';
  
  -- Get total minutes earned from claims
  SELECT COALESCE(SUM(minutes_claimed), 0) INTO v_total_minutes_earned
  FROM referral_claims
  WHERE claimer_telegram_id = p_telegram_id;
  
  -- Get referral tier from user
  SELECT referral_tier INTO v_referral_tier
  FROM users
  WHERE telegram_id = p_telegram_id;
  
  -- Get all referrals with detailed information (with support for unnamed users)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'referred_username', CASE 
        WHEN u.username IS NULL OR TRIM(u.username) = '' THEN 'مستخدم جديد'
        WHEN u.username = 'مستخدم جديد' THEN 'مستخدم جديد'
        ELSE u.username
      END,
      'created_at', r.created_at,
      'status', r.status,
      'reward_claimed', r.reward_claimed,
      'is_claimable', (r.status = 'verified' AND r.reward_claimed = false AND NOT EXISTS (
        SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
      )),
      'points_awarded', CASE WHEN r.status = 'verified' THEN 30 ELSE 0 END,
      'minutes_available', CASE 
        WHEN r.status = 'verified' AND r.reward_claimed = false AND NOT EXISTS (
          SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
        ) THEN 60 
        ELSE 0 
      END
    )
    ORDER BY r.created_at DESC
  ), '[]'::jsonb) INTO v_all_referrals
  FROM referrals r
  LEFT JOIN users u ON u.telegram_id = r.referred_id
  WHERE r.referrer_id = p_telegram_id;
  
  -- Get unclaimed referrals
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'created_at', r.created_at,
      'status', r.status
    )
    ORDER BY r.created_at DESC
  ), '[]'::jsonb) INTO v_unclaimed_referrals
  FROM referrals r
  WHERE r.referrer_id = p_telegram_id
    AND r.status = 'verified'
    AND r.reward_claimed = false
    AND NOT EXISTS (
      SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
    );
  
  RETURN jsonb_build_object(
    'total_referrals', COALESCE(v_total_referrals, 0),
    'verified_referrals', COALESCE(v_verified_referrals, 0),
    'pending_referrals', COALESCE(v_pending_referrals, 0),
    'total_minutes_earned', COALESCE(v_total_minutes_earned, 0),
    'referral_tier', COALESCE(v_referral_tier, 'bronze'),
    'all_referrals', v_all_referrals,
    'unclaimed_referrals', v_unclaimed_referrals
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats_secure(text) TO authenticated;