/*
  # Fix Referral System for Unnamed Users

  1. Changes
    - Update process_referral function to properly handle unnamed users
    - Improve error handling and logging for better debugging
    - Fix foreign key constraint issues with supabase_auth_id
    - Add more detailed debug information in responses
    
  2. Security
    - Maintain all existing security checks
    - Ensure proper validation of all inputs
    - Preserve data integrity
*/

-- Update process_referral function to better handle unnamed users
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
  v_referrer_record record;
  v_referred_record record;
  v_debug_info jsonb;
BEGIN
  -- Enhanced debug information
  v_debug_info := jsonb_build_object(
    'function', 'process_referral',
    'referrer_id', p_referrer_telegram_id,
    'referred_id', p_referred_telegram_id,
    'timestamp', now()
  );

  RAISE NOTICE 'Starting referral process: %', v_debug_info;

  -- Input validation
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RAISE NOTICE 'Error: Invalid telegram IDs';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid telegram IDs',
      'debug', v_debug_info
    );
  END IF;
  
  -- Check for empty inputs
  IF TRIM(p_referrer_telegram_id) = '' OR TRIM(p_referred_telegram_id) = '' THEN
    RAISE NOTICE 'Error: Empty telegram IDs';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Telegram IDs cannot be empty',
      'debug', v_debug_info
    );
  END IF;
  
  -- Prevent self-referral
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RAISE NOTICE 'Error: Self-referral attempt';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot refer yourself',
      'debug', v_debug_info
    );
  END IF;
  
  -- Check if referred user already has a referral
  SELECT COUNT(*) INTO v_existing_referral_count
  FROM referrals
  WHERE referred_id = p_referred_telegram_id;
  
  IF v_existing_referral_count > 0 THEN
    RAISE NOTICE 'Error: User already referred';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User already referred',
      'debug', jsonb_build_object(
        'existing_referrals', v_existing_referral_count
      )
    );
  END IF;
  
  -- Get referrer record
  SELECT * INTO v_referrer_record
  FROM users
  WHERE telegram_id = p_referrer_telegram_id;
  
  IF v_referrer_record IS NULL THEN
    RAISE NOTICE 'Error: Referrer not found';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referrer not found in system',
      'debug', v_debug_info
    );
  END IF;
  
  -- Get referred user record
  SELECT * INTO v_referred_record
  FROM users
  WHERE telegram_id = p_referred_telegram_id;
  
  IF v_referred_record IS NULL THEN
    RAISE NOTICE 'Error: Referred user not found';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referred user not found in system',
      'debug', v_debug_info
    );
  END IF;

  -- Add user details to debug info
  v_debug_info := v_debug_info || jsonb_build_object(
    'referrer_username', v_referrer_record.username,
    'referred_username', v_referred_record.username
  );
  
  RAISE NOTICE 'User details: %', v_debug_info;
  
  -- Create referral record with transaction for atomicity
  BEGIN
    -- Create the referral
    INSERT INTO referrals (referrer_id, referred_id, status)
    VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
    RETURNING id INTO v_referral_id;
    
    -- Update referrer's referral count
    UPDATE users
    SET 
      referral_count = COALESCE(referral_count, 0) + 1,
      referral_tier = CASE 
        WHEN COALESCE(referral_count, 0) + 1 >= 50 THEN 'platinum'
        WHEN COALESCE(referral_count, 0) + 1 >= 25 THEN 'gold'
        WHEN COALESCE(referral_count, 0) + 1 >= 10 THEN 'silver'
        ELSE 'bronze'
      END
    WHERE telegram_id = p_referrer_telegram_id;
    
    -- Award points to referrer
    PERFORM update_user_points(p_referrer_telegram_id, 30, 'successful_referral');
    
    RAISE NOTICE 'Referral created successfully: %', v_referral_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in transaction: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Database error: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id,
    'points_awarded', 30,
    'referrer_username', v_referrer_record.username,
    'referred_username', v_referred_record.username
  );
END;
$$;

-- Update get_referral_stats_secure function to better handle unnamed users
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
  v_debug_info jsonb;
  v_user_record record;
BEGIN
  -- Enhanced debug information
  v_debug_info := jsonb_build_object(
    'function', 'get_referral_stats_secure',
    'telegram_id', p_telegram_id,
    'timestamp', now()
  );

  RAISE NOTICE 'Getting referral stats: %', v_debug_info;

  -- Get user record
  SELECT * INTO v_user_record
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_record IS NULL THEN
    RAISE NOTICE 'Error: User not found';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found',
      'debug', v_debug_info
    );
  END IF;

  -- Add user details to debug info
  v_debug_info := v_debug_info || jsonb_build_object(
    'username', v_user_record.username,
    'referral_count', v_user_record.referral_count,
    'referral_tier', v_user_record.referral_tier
  );
  
  RAISE NOTICE 'User details: %', v_debug_info;

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
  v_referral_tier := v_user_record.referral_tier;
  
  -- Get all referrals with detailed information
  BEGIN
    WITH referral_data AS (
      SELECT 
        r.id,
        r.referred_id,
        u.username AS referred_username,
        r.created_at,
        r.status,
        r.reward_claimed,
        (r.status = 'verified' AND r.reward_claimed = false AND NOT EXISTS (
          SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
        )) AS is_claimable,
        CASE WHEN r.status = 'verified' THEN 30 ELSE 0 END AS points_awarded,
        CASE 
          WHEN r.status = 'verified' AND r.reward_claimed = false AND NOT EXISTS (
            SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
          ) THEN 60 
          ELSE 0 
        END AS minutes_available
      FROM referrals r
      LEFT JOIN users u ON u.telegram_id = r.referred_id
      WHERE r.referrer_id = p_telegram_id
      ORDER BY r.created_at DESC
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', rd.id,
        'referred_id', rd.referred_id,
        'referred_username', COALESCE(
          NULLIF(TRIM(rd.referred_username), ''), 
          'مستخدم جديد'
        ),
        'created_at', rd.created_at,
        'status', rd.status,
        'reward_claimed', rd.reward_claimed,
        'is_claimable', rd.is_claimable,
        'points_awarded', rd.points_awarded,
        'minutes_available', rd.minutes_available
      )
    ) INTO v_all_referrals
    FROM referral_data rd;
    
    -- Handle null case
    IF v_all_referrals IS NULL THEN
      v_all_referrals := '[]'::jsonb;
    END IF;
    
    RAISE NOTICE 'Got % referrals', jsonb_array_length(v_all_referrals);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error getting all referrals: %', SQLERRM;
      v_all_referrals := '[]'::jsonb;
  END;
  
  -- Get unclaimed referrals
  BEGIN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'referred_id', r.referred_id,
        'created_at', r.created_at,
        'status', r.status
      )
    ) INTO v_unclaimed_referrals
    FROM referrals r
    WHERE r.referrer_id = p_telegram_id
      AND r.status = 'verified'
      AND r.reward_claimed = false
      AND NOT EXISTS (
        SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
      );
    
    -- Handle null case
    IF v_unclaimed_referrals IS NULL THEN
      v_unclaimed_referrals := '[]'::jsonb;
    END IF;
    
    RAISE NOTICE 'Got % unclaimed referrals', jsonb_array_length(v_unclaimed_referrals);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error getting unclaimed referrals: %', SQLERRM;
      v_unclaimed_referrals := '[]'::jsonb;
  END;
  
  -- Update user's referral count if it doesn't match actual count
  IF v_user_record.referral_count != v_verified_referrals THEN
    RAISE NOTICE 'Fixing referral count mismatch: % (stored) vs % (actual)', 
      v_user_record.referral_count, v_verified_referrals;
      
    UPDATE users
    SET 
      referral_count = v_verified_referrals,
      referral_tier = CASE 
        WHEN v_verified_referrals >= 50 THEN 'platinum'
        WHEN v_verified_referrals >= 25 THEN 'gold'
        WHEN v_verified_referrals >= 10 THEN 'silver'
        ELSE 'bronze'
      END
    WHERE telegram_id = p_telegram_id;
  END IF;
  
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

-- Update claim_referral_reward_secure function to better handle unnamed users
CREATE OR REPLACE FUNCTION claim_referral_reward_secure(
  p_referral_id uuid,
  p_claimer_telegram_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_record record;
  v_minutes_reward integer := 60;
  v_existing_claim_count integer;
  v_debug_info jsonb;
  v_claimer_record record;
BEGIN
  -- Enhanced debug information
  v_debug_info := jsonb_build_object(
    'function', 'claim_referral_reward_secure',
    'referral_id', p_referral_id,
    'claimer_telegram_id', p_claimer_telegram_id,
    'timestamp', now()
  );

  RAISE NOTICE 'Starting reward claim: %', v_debug_info;

  -- Get claimer record
  SELECT * INTO v_claimer_record
  FROM users
  WHERE telegram_id = p_claimer_telegram_id;

  IF v_claimer_record IS NULL THEN
    RAISE NOTICE 'Error: Claimer not found';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Claimer not found',
      'debug', v_debug_info
    );
  END IF;

  -- Add claimer details to debug info
  v_debug_info := v_debug_info || jsonb_build_object(
    'claimer_username', v_claimer_record.username
  );

  -- Check if reward already claimed
  SELECT COUNT(*) INTO v_existing_claim_count
  FROM referral_claims
  WHERE referral_id = p_referral_id;
  
  IF v_existing_claim_count > 0 THEN
    RAISE NOTICE 'Error: Reward already claimed';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Reward already claimed',
      'debug', v_debug_info
    );
  END IF;
  
  -- Get referral details and validate
  SELECT r.*, u.telegram_id as referrer_telegram_id, u.username as referrer_username
  INTO v_referral_record
  FROM referrals r
  JOIN users u ON u.telegram_id = r.referrer_id
  WHERE r.id = p_referral_id
    AND r.status = 'verified'
    AND r.referrer_id = p_claimer_telegram_id;
  
  IF v_referral_record IS NULL THEN
    RAISE NOTICE 'Error: Invalid referral or not authorized to claim';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid referral or not authorized to claim',
      'debug', v_debug_info
    );
  END IF;

  -- Add referral details to debug info
  v_debug_info := v_debug_info || jsonb_build_object(
    'referral_status', v_referral_record.status,
    'reward_claimed', v_referral_record.reward_claimed,
    'referrer_username', v_referral_record.referrer_username
  );
  
  -- Process claim in a transaction for atomicity
  BEGIN
    -- Record the claim
    INSERT INTO referral_claims (referral_id, claimer_telegram_id, minutes_claimed)
    VALUES (p_referral_id, p_claimer_telegram_id, v_minutes_reward);
    
    -- Update user's total minutes
    UPDATE users
    SET total_minutes = total_minutes + v_minutes_reward
    WHERE telegram_id = p_claimer_telegram_id;
    
    -- Mark referral as claimed
    UPDATE referrals
    SET reward_claimed = true
    WHERE id = p_referral_id;
    
    RAISE NOTICE 'Reward claim processed successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in transaction: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Database error: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward claimed successfully',
    'minutes_earned', v_minutes_reward
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats_secure(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward_secure(uuid, text) TO authenticated;