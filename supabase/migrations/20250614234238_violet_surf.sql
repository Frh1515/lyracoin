/*
  # Tamper-Proof Referral System

  1. New Tables
    - `referral_codes` - Stores unique referral codes for each user
    - `referral_claims` - Tracks claimed rewards to prevent double claiming
    
  2. Updated Tables
    - Enhanced `referrals` table with better validation
    - Added indexes for performance
    
  3. Security Features
    - Prevent self-referrals
    - One referral per user maximum
    - Secure reward claiming with validation
    - Tamper-proof tracking
    
  4. Functions
    - `generate_referral_code` - Creates unique referral codes
    - `process_referral` - Handles new referrals securely
    - `claim_referral_reward_secure` - Secure reward claiming
    - `get_referral_stats_secure` - Get user referral statistics
*/

-- Create referral_codes table for unique user referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text UNIQUE NOT NULL,
  referral_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Create referral_claims table to track claimed rewards
CREATE TABLE IF NOT EXISTS referral_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid UNIQUE NOT NULL,
  claimer_telegram_id text NOT NULL,
  minutes_claimed integer NOT NULL DEFAULT 60,
  claimed_at timestamptz DEFAULT now(),
  FOREIGN KEY (referral_id) REFERENCES referrals(id),
  FOREIGN KEY (claimer_telegram_id) REFERENCES users(telegram_id)
);

-- Enable RLS on new tables
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Users can read their own referral code"
  ON referral_codes
  FOR SELECT
  TO authenticated
  USING (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own referral code"
  ON referral_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- RLS policies for referral_claims
CREATE POLICY "Users can read their own claims"
  ON referral_claims
  FOR SELECT
  TO authenticated
  USING (
    claimer_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own claims"
  ON referral_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    claimer_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- Function to generate unique referral code for a user
CREATE OR REPLACE FUNCTION generate_referral_code(p_telegram_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code text;
BEGIN
  -- Check if user already has a referral code
  SELECT referral_code INTO v_referral_code
  FROM referral_codes
  WHERE user_telegram_id = p_telegram_id;
  
  IF v_referral_code IS NOT NULL THEN
    RETURN v_referral_code;
  END IF;
  
  -- Generate new referral code using telegram_id
  v_referral_code := p_telegram_id;
  
  -- Insert the referral code
  INSERT INTO referral_codes (user_telegram_id, referral_code)
  VALUES (p_telegram_id, v_referral_code)
  ON CONFLICT (user_telegram_id) DO NOTHING;
  
  RETURN v_referral_code;
END;
$$;

-- Function to process referral securely
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

-- Function to claim referral reward securely
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
BEGIN
  -- Check if reward already claimed
  SELECT COUNT(*) INTO v_existing_claim_count
  FROM referral_claims
  WHERE referral_id = p_referral_id;
  
  IF v_existing_claim_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Reward already claimed'
    );
  END IF;
  
  -- Get referral details and validate
  SELECT r.*, u.telegram_id as referrer_telegram_id
  INTO v_referral_record
  FROM referrals r
  JOIN users u ON u.telegram_id = r.referrer_id
  WHERE r.id = p_referral_id
    AND r.status = 'verified'
    AND r.referrer_id = p_claimer_telegram_id;
  
  IF v_referral_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid referral or not authorized to claim'
    );
  END IF;
  
  -- Record the claim
  INSERT INTO referral_claims (referral_id, claimer_telegram_id, minutes_claimed)
  VALUES (p_referral_id, p_claimer_telegram_id, v_minutes_reward);
  
  -- Update user's total minutes
  UPDATE users
  SET total_minutes = total_minutes + v_minutes_reward
  WHERE telegram_id = p_claimer_telegram_id;
  
  -- Mark referral as reward claimed
  UPDATE referrals
  SET reward_claimed = true
  WHERE id = p_referral_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward claimed successfully',
    'minutes_earned', v_minutes_reward
  );
END;
$$;

-- Function to get referral statistics securely
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
  v_unclaimed_referrals jsonb;
BEGIN
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
  
  -- Get unclaimed referrals
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
  
  RETURN jsonb_build_object(
    'total_referrals', COALESCE(v_total_referrals, 0),
    'verified_referrals', COALESCE(v_verified_referrals, 0),
    'pending_referrals', COALESCE(v_pending_referrals, 0),
    'total_minutes_earned', COALESCE(v_total_minutes_earned, 0),
    'referral_tier', COALESCE(v_referral_tier, 'bronze'),
    'unclaimed_referrals', COALESCE(v_unclaimed_referrals, '[]'::jsonb)
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_telegram_id ON referral_codes(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referral_claims_referral_id ON referral_claims(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_claims_claimer ON referral_claims(claimer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);