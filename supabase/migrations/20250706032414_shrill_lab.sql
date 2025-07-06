/*
# Fix Referral System

1. New Functions
  - `process_pending_referrals`: Processes all pending referrals and updates their status
  - `verify_referral`: Verifies a single referral and updates its status
  - `award_referral_points`: Awards points to the referrer

2. Triggers
  - Add trigger to automatically process referrals when inserted

3. Fixes
  - Add missing RLS policies for referrals table
  - Add function to manually verify all pending referrals
*/

-- Function to verify a single referral
CREATE OR REPLACE FUNCTION verify_referral(
  p_referral_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_referrer RECORD;
  v_referred RECORD;
  v_points_awarded INTEGER := 30; -- Default points for referral
BEGIN
  -- Get referral details
  SELECT * INTO v_referral
  FROM referrals
  WHERE id = p_referral_id;
  
  -- Check if referral exists
  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referral not found'
    );
  END IF;
  
  -- Check if already verified
  IF v_referral.status = 'verified' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referral already verified'
    );
  END IF;
  
  -- Get referrer and referred users
  SELECT * INTO v_referrer
  FROM users
  WHERE telegram_id = v_referral.referrer_id;
  
  SELECT * INTO v_referred
  FROM users
  WHERE telegram_id = v_referral.referred_id;
  
  -- Check if both users exist
  IF v_referrer.id IS NULL OR v_referred.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referrer or referred user not found'
    );
  END IF;
  
  -- Update referral status to verified
  UPDATE referrals
  SET status = 'verified'
  WHERE id = p_referral_id;
  
  -- Award points to referrer
  UPDATE users
  SET 
    points = points + v_points_awarded,
    referral_count = referral_count + 1
  WHERE telegram_id = v_referral.referrer_id;
  
  -- Update referral tier based on new count
  UPDATE users
  SET referral_tier = 
    CASE 
      WHEN referral_count + 1 >= 50 THEN 'platinum'
      WHEN referral_count + 1 >= 25 THEN 'gold'
      WHEN referral_count + 1 >= 10 THEN 'silver'
      ELSE 'bronze'
    END
  WHERE telegram_id = v_referral.referrer_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral verified successfully',
    'referral_id', p_referral_id,
    'points_awarded', v_points_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process all pending referrals
CREATE OR REPLACE FUNCTION process_pending_referrals() RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_processed INTEGER := 0;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Process each pending referral
  FOR v_referral IN 
    SELECT id FROM referrals WHERE status = 'pending'
  LOOP
    v_processed := v_processed + 1;
    
    SELECT verify_referral(v_referral.id) INTO v_result;
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_success := v_success + 1;
    ELSE
      v_failed := v_failed + 1;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Processed pending referrals',
    'processed', v_processed,
    'successful', v_success,
    'failed', v_failed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points for a referral
CREATE OR REPLACE FUNCTION award_referral_points(
  p_referral_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_points INTEGER := 30; -- Default points for referral
BEGIN
  -- Get referral details
  SELECT * INTO v_referral
  FROM referrals
  WHERE id = p_referral_id;
  
  -- Check if referral exists
  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referral not found'
    );
  END IF;
  
  -- Check if referral is verified
  IF v_referral.status != 'verified' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referral is not verified'
    );
  END IF;
  
  -- Award points to referrer
  UPDATE users
  SET points = points + v_points
  WHERE telegram_id = v_referral.referrer_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Points awarded successfully',
    'referral_id', p_referral_id,
    'points_awarded', v_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically verify referrals when inserted
CREATE OR REPLACE FUNCTION trigger_verify_referral() RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only process if status is pending
  IF NEW.status = 'pending' THEN
    SELECT verify_referral(NEW.id) INTO v_result;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on referrals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_verify_referral'
  ) THEN
    CREATE TRIGGER auto_verify_referral
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_verify_referral();
  END IF;
END $$;

-- Add missing RLS policies for referrals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referrals' AND policyname = 'Allow insert for authenticated users'
  ) THEN
    CREATE POLICY "Allow insert for authenticated users"
    ON referrals
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Function to manually fix all existing referrals
CREATE OR REPLACE FUNCTION fix_all_referrals() RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Process all pending referrals
  SELECT process_pending_referrals() INTO v_result;
  
  -- Return result
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;