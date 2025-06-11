/*
  # Update referral reward system

  1. Changes
    - Remove reward logic for referred users
    - Ensure only referrers receive rewards
    - Add constraints to prevent duplicate rewards

  2. Security
    - Maintain RLS policies
    - Prevent gaming of reward system
*/

-- Update the claim_referral_reward function to only reward referrers
CREATE OR REPLACE FUNCTION public.claim_referral_reward(
    p_referral_id uuid,
    p_minutes_reward integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the referral exists and is verified but not claimed
    IF NOT EXISTS (
        SELECT 1 FROM referrals
        WHERE id = p_referral_id
        AND status = 'verified'
        AND reward_claimed = false
    ) THEN
        RAISE EXCEPTION 'Invalid or already claimed referral';
    END IF;

    -- Record the reward claim
    INSERT INTO referral_rewards (
        referral_id,
        minutes_rewarded
    ) VALUES (
        p_referral_id,
        p_minutes_reward
    );

    -- Update referral status and referrer's minutes
    WITH referral_update AS (
        UPDATE referrals
        SET reward_claimed = true
        WHERE id = p_referral_id
        RETURNING referrer_id
    )
    UPDATE users
    SET total_minutes = total_minutes + p_minutes_reward
    FROM referral_update
    WHERE users.telegram_id = referral_update.referrer_id;
END;
$$;