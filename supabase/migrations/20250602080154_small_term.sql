/*
  # Add get_referral_stats function

  1. New Functions
    - `get_referral_stats`: Returns aggregated referral statistics for a user
      - Input: p_telegram_id (text)
      - Returns: Table with referral statistics
        - total_referrals (bigint)
        - verified_referrals (bigint)
        - pending_referrals (bigint)
        - total_minutes_earned (bigint)
        - referral_tier (text)
        - referral_code (text)

  2. Security
    - Function is accessible to authenticated users only
    - Users can only get stats for their own telegram_id
*/

CREATE OR REPLACE FUNCTION public.get_referral_stats(p_telegram_id text)
RETURNS TABLE (
  total_referrals bigint,
  verified_referrals bigint,
  pending_referrals bigint,
  total_minutes_earned bigint,
  referral_tier text,
  referral_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the user is requesting their own stats
  IF NOT ((SELECT auth.uid())::text = p_telegram_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.telegram_id,
      u.referral_tier,
      COUNT(r.id) as total_refs,
      COUNT(r.id) FILTER (WHERE r.status = 'verified') as verified_refs,
      COUNT(r.id) FILTER (WHERE r.status = 'pending') as pending_refs,
      COALESCE(SUM(rr.minutes_rewarded), 0) as total_minutes
    FROM users u
    LEFT JOIN referrals r ON r.referrer_id = u.telegram_id
    LEFT JOIN referral_rewards rr ON rr.referral_id = r.id
    WHERE u.telegram_id = p_telegram_id
    GROUP BY u.telegram_id, u.referral_tier
  )
  SELECT 
    COALESCE(total_refs, 0)::bigint as total_referrals,
    COALESCE(verified_refs, 0)::bigint as verified_referrals,
    COALESCE(pending_refs, 0)::bigint as pending_referrals,
    COALESCE(total_minutes, 0)::bigint as total_minutes_earned,
    COALESCE(referral_tier, 'bronze') as referral_tier,
    telegram_id as referral_code
  FROM user_stats;
END;
$$;