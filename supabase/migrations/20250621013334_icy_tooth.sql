/*
  # Boost System Implementation

  1. New Tables
    - `boosts` - Stores user boost purchases
    
  2. Updated Functions
    - `start_or_resume_mining` - Now checks for active boosts
    - `claim_daily_mining_reward` - Now applies boost multiplier
    - New function `apply_boost_to_mining` - For manual boost claiming
    
  3. Features
    - Boost multipliers (×2, ×3, ×4, ×6, ×10)
    - 24-hour boost duration
    - TON payment tracking
    - Automatic multiplier application
*/

-- Create boosts table
CREATE TABLE IF NOT EXISTS public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL,
  multiplier integer NOT NULL CHECK (multiplier IN (2, 3, 4, 6, 10)),
  price_paid numeric NOT NULL,
  transaction_hash text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Enable RLS
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

-- RLS policies for boosts
CREATE POLICY "Users can read their own boosts"
  ON public.boosts
  FOR SELECT
  TO authenticated
  USING (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own boosts"
  ON public.boosts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- Function to get active boost for a user
CREATE OR REPLACE FUNCTION public.get_active_boost(
  p_user_telegram_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_boost record;
  v_current_time timestamptz := now();
BEGIN
  -- Get active boost
  SELECT * INTO v_boost
  FROM boosts
  WHERE user_telegram_id = p_user_telegram_id
    AND end_time > v_current_time
  ORDER BY end_time DESC
  LIMIT 1;

  IF v_boost IS NULL THEN
    RETURN jsonb_build_object(
      'has_active_boost', false
    );
  END IF;

  RETURN jsonb_build_object(
    'has_active_boost', true,
    'boost_id', v_boost.id,
    'multiplier', v_boost.multiplier,
    'start_time', v_boost.start_time,
    'end_time', v_boost.end_time,
    'remaining_hours', EXTRACT(EPOCH FROM (v_boost.end_time - v_current_time)) / 3600
  );
END;
$$;

-- Update start_or_resume_mining function to check for active boosts
CREATE OR REPLACE FUNCTION public.start_or_resume_mining(
  p_user_telegram_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mining_record record;
  v_current_time timestamptz := now();
  v_hours_since_last_claim integer := 0;
  v_active_boost jsonb;
  v_boost_multiplier integer := 1;
BEGIN
  -- Get current mining record
  SELECT * INTO v_mining_record
  FROM user_mining_progress
  WHERE user_telegram_id = p_user_telegram_id;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = p_user_telegram_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Calculate hours since last claim
  IF v_mining_record.last_claim_timestamp IS NOT NULL THEN
    v_hours_since_last_claim := EXTRACT(EPOCH FROM (v_current_time - v_mining_record.last_claim_timestamp)) / 3600;
  ELSE
    v_hours_since_last_claim := 24; -- Allow first mining session
  END IF;

  -- Check if user needs to claim first
  IF v_hours_since_last_claim >= 24 AND v_mining_record.daily_total_minutes_mined > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Must claim daily reward first'
    );
  END IF;

  -- Check for active boost
  SELECT get_active_boost(p_user_telegram_id) INTO v_active_boost;
  
  IF (v_active_boost->>'has_active_boost')::boolean THEN
    v_boost_multiplier := (v_active_boost->>'multiplier')::integer;
  END IF;

  -- Start new mining session
  INSERT INTO user_mining_progress (
    user_telegram_id,
    mining_start_time,
    current_session_minutes_mined,
    daily_total_minutes_mined,
    status,
    last_claim_timestamp,
    updated_at
  ) VALUES (
    p_user_telegram_id,
    v_current_time,
    0,
    COALESCE(v_mining_record.daily_total_minutes_mined, 0),
    'mining',
    v_mining_record.last_claim_timestamp,
    v_current_time
  )
  ON CONFLICT (user_telegram_id) DO UPDATE SET
    mining_start_time = v_current_time,
    current_session_minutes_mined = 0,
    status = 'mining',
    updated_at = v_current_time;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mining started successfully',
    'mining_start_time', v_current_time,
    'has_active_boost', (v_active_boost->>'has_active_boost')::boolean,
    'boost_multiplier', v_boost_multiplier
  );
END;
$$;

-- Update claim_daily_mining_reward function to apply boost multiplier
CREATE OR REPLACE FUNCTION public.claim_daily_mining_reward(
  p_user_telegram_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mining_record record;
  v_current_time timestamptz := now();
  v_session_elapsed_minutes integer := 0;
  v_total_minutes_to_claim integer := 0;
  v_points_to_award integer := 0;
  v_hours_since_last_claim integer := 0;
  v_active_boost jsonb;
  v_boost_multiplier integer := 1;
  v_boosted_minutes integer := 0;
BEGIN
  -- Get current mining record
  SELECT * INTO v_mining_record
  FROM user_mining_progress
  WHERE user_telegram_id = p_user_telegram_id;

  IF v_mining_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No mining progress found'
    );
  END IF;

  -- Calculate hours since last claim
  IF v_mining_record.last_claim_timestamp IS NOT NULL THEN
    v_hours_since_last_claim := EXTRACT(EPOCH FROM (v_current_time - v_mining_record.last_claim_timestamp)) / 3600;
  ELSE
    v_hours_since_last_claim := 24; -- Allow first claim
  END IF;

  -- Check if 24 hours have passed
  IF v_hours_since_last_claim < 24 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Must wait 24 hours between claims',
      'hours_remaining', 24 - v_hours_since_last_claim
    );
  END IF;

  -- Calculate current session elapsed minutes
  IF v_mining_record.mining_start_time IS NOT NULL THEN
    v_session_elapsed_minutes := EXTRACT(EPOCH FROM (v_current_time - v_mining_record.mining_start_time)) / 60;
    -- Cap at 6 hours (360 minutes)
    IF v_session_elapsed_minutes > 360 THEN
      v_session_elapsed_minutes := 360;
    END IF;
  END IF;

  -- Calculate total minutes to claim
  v_total_minutes_to_claim := v_mining_record.daily_total_minutes_mined + v_session_elapsed_minutes;

  IF v_total_minutes_to_claim <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No minutes to claim'
    );
  END IF;

  -- Check for active boost
  SELECT get_active_boost(p_user_telegram_id) INTO v_active_boost;
  
  IF (v_active_boost->>'has_active_boost')::boolean THEN
    v_boost_multiplier := (v_active_boost->>'multiplier')::integer;
    v_boosted_minutes := v_total_minutes_to_claim * v_boost_multiplier;
  ELSE
    v_boosted_minutes := v_total_minutes_to_claim;
  END IF;

  -- Calculate points (1 point per 10 minutes mined)
  v_points_to_award := v_boosted_minutes / 10;

  -- Update user's total minutes and points
  UPDATE users
  SET 
    total_minutes = total_minutes + v_boosted_minutes,
    points = points + v_points_to_award
  WHERE telegram_id = p_user_telegram_id;

  -- Update membership level based on new points
  UPDATE users
  SET membership_level = calculate_membership_level(points)
  WHERE telegram_id = p_user_telegram_id;

  -- Reset mining progress
  UPDATE user_mining_progress
  SET 
    mining_start_time = NULL,
    current_session_minutes_mined = 0,
    daily_total_minutes_mined = 0,
    last_claim_timestamp = v_current_time,
    status = 'idle',
    updated_at = v_current_time
  WHERE user_telegram_id = p_user_telegram_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Daily mining reward claimed successfully',
    'minutes_claimed', v_boosted_minutes,
    'original_minutes', v_total_minutes_to_claim,
    'boost_multiplier', v_boost_multiplier,
    'points_awarded', v_points_to_award
  );
END;
$$;

-- Function to manually apply boost to mining
CREATE OR REPLACE FUNCTION public.apply_boost_to_mining(
  p_user_telegram_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mining_record record;
  v_current_time timestamptz := now();
  v_active_boost jsonb;
  v_boost_multiplier integer := 1;
  v_minutes_earned integer := 0;
  v_boosted_minutes integer := 0;
BEGIN
  -- Get current mining record
  SELECT * INTO v_mining_record
  FROM user_mining_progress
  WHERE user_telegram_id = p_user_telegram_id;

  IF v_mining_record IS NULL OR v_mining_record.status != 'mining' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active mining session found'
    );
  END IF;

  -- Check for active boost
  SELECT get_active_boost(p_user_telegram_id) INTO v_active_boost;
  
  IF NOT (v_active_boost->>'has_active_boost')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active boost found'
    );
  END IF;

  v_boost_multiplier := (v_active_boost->>'multiplier')::integer;

  -- Calculate minutes earned (6 hours = 360 minutes)
  v_minutes_earned := 360;
  v_boosted_minutes := v_minutes_earned * v_boost_multiplier;

  -- Update user's total minutes
  UPDATE users
  SET total_minutes = total_minutes + v_boosted_minutes
  WHERE telegram_id = p_user_telegram_id;

  -- Update mining progress
  UPDATE user_mining_progress
  SET 
    mining_start_time = v_current_time,
    daily_total_minutes_mined = daily_total_minutes_mined + v_minutes_earned,
    updated_at = v_current_time
  WHERE user_telegram_id = p_user_telegram_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Boost applied successfully',
    'minutes_earned', v_boosted_minutes,
    'multiplier', v_boost_multiplier
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_boosts_user_telegram_id ON boosts(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_boosts_end_time ON boosts(end_time);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_boost(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_boost_to_mining(text) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Boost system implemented successfully!';
    RAISE NOTICE '   - boosts table created';
    RAISE NOTICE '   - RLS policies configured';
    RAISE NOTICE '   - Mining functions updated to support boosts';
    RAISE NOTICE '   - Indexes and permissions granted';
    RAISE NOTICE '🚀 Users can now purchase boosts to multiply their mining rewards!';
END $$;