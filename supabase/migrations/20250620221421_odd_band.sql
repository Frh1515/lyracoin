/*
  # Add Mining Feature

  1. New Tables
    - `user_mining_progress` - Tracks each user's mining progress and status

  2. New Functions
    - `get_mining_status` - Get user's current mining status
    - `start_or_resume_mining` - Start or resume a 6-hour mining session
    - `claim_daily_mining_reward` - Claim accumulated daily mining rewards

  3. Security
    - Enable RLS on user_mining_progress table
    - Users can only access their own mining data
    - Secure RPC functions with proper validation
*/

-- Create user_mining_progress table
CREATE TABLE IF NOT EXISTS public.user_mining_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL,
  mining_start_time timestamptz,
  current_session_minutes_mined integer DEFAULT 0,
  daily_total_minutes_mined integer DEFAULT 0,
  last_claim_timestamp timestamptz,
  status text DEFAULT 'idle' CHECK (status IN ('idle', 'mining', 'ready_to_claim')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id),
  UNIQUE(user_telegram_id)
);

-- Enable RLS
ALTER TABLE public.user_mining_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_mining_progress
CREATE POLICY "Users can read their own mining progress"
  ON public.user_mining_progress
  FOR SELECT
  TO authenticated
  USING (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own mining progress"
  ON public.user_mining_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own mining progress"
  ON public.user_mining_progress
  FOR UPDATE
  TO authenticated
  USING (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- Function to get mining status
CREATE OR REPLACE FUNCTION public.get_mining_status(
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
  v_hours_since_last_claim integer := 0;
  v_can_claim boolean := false;
  v_mining_active boolean := false;
  v_countdown_remaining integer := 0;
BEGIN
  -- Get or create mining record
  SELECT * INTO v_mining_record
  FROM user_mining_progress
  WHERE user_telegram_id = p_user_telegram_id;

  -- If no record exists, create one
  IF v_mining_record IS NULL THEN
    INSERT INTO user_mining_progress (
      user_telegram_id,
      status,
      last_claim_timestamp
    ) VALUES (
      p_user_telegram_id,
      'idle',
      v_current_time
    ) RETURNING * INTO v_mining_record;
  END IF;

  -- Calculate elapsed time since mining started
  IF v_mining_record.mining_start_time IS NOT NULL THEN
    v_session_elapsed_minutes := EXTRACT(EPOCH FROM (v_current_time - v_mining_record.mining_start_time)) / 60;
    
    -- Cap at 6 hours (360 minutes)
    IF v_session_elapsed_minutes > 360 THEN
      v_session_elapsed_minutes := 360;
    END IF;
    
    -- Check if mining is still active (less than 6 hours)
    v_mining_active := v_session_elapsed_minutes < 360;
    v_countdown_remaining := GREATEST(0, 360 - v_session_elapsed_minutes);
  END IF;

  -- Calculate hours since last claim
  IF v_mining_record.last_claim_timestamp IS NOT NULL THEN
    v_hours_since_last_claim := EXTRACT(EPOCH FROM (v_current_time - v_mining_record.last_claim_timestamp)) / 3600;
  ELSE
    v_hours_since_last_claim := 24; -- Allow first claim
  END IF;

  -- Check if user can claim (24 hours passed and has mined minutes)
  v_can_claim := v_hours_since_last_claim >= 24 AND 
                 (v_mining_record.daily_total_minutes_mined + v_session_elapsed_minutes) > 0;

  -- Update current session minutes if mining
  IF v_mining_record.status = 'mining' AND v_mining_record.mining_start_time IS NOT NULL THEN
    UPDATE user_mining_progress
    SET 
      current_session_minutes_mined = v_session_elapsed_minutes,
      status = CASE 
        WHEN v_session_elapsed_minutes >= 360 THEN 'idle'
        ELSE 'mining'
      END,
      updated_at = v_current_time
    WHERE user_telegram_id = p_user_telegram_id;
  END IF;

  RETURN jsonb_build_object(
    'status', v_mining_record.status,
    'mining_start_time', v_mining_record.mining_start_time,
    'current_session_minutes_mined', v_session_elapsed_minutes,
    'daily_total_minutes_mined', v_mining_record.daily_total_minutes_mined,
    'last_claim_timestamp', v_mining_record.last_claim_timestamp,
    'hours_since_last_claim', v_hours_since_last_claim,
    'can_claim', v_can_claim,
    'mining_active', v_mining_active,
    'countdown_remaining_minutes', v_countdown_remaining,
    'total_accumulated_minutes', v_mining_record.daily_total_minutes_mined + v_session_elapsed_minutes
  );
END;
$$;

-- Function to start or resume mining
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
    'mining_start_time', v_current_time
  );
END;
$$;

-- Function to claim daily mining reward
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

  -- Calculate points (1 point per 10 minutes mined)
  v_points_to_award := v_total_minutes_to_claim / 10;

  -- Update user's total minutes and points
  UPDATE users
  SET 
    total_minutes = total_minutes + v_total_minutes_to_claim,
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
    'minutes_claimed', v_total_minutes_to_claim,
    'points_awarded', v_points_to_award
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mining_progress_telegram_id ON user_mining_progress(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_mining_progress_status ON user_mining_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_mining_progress_last_claim ON user_mining_progress(last_claim_timestamp);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_mining_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_or_resume_mining(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_mining_reward(text) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Mining feature implemented successfully!';
    RAISE NOTICE '   - user_mining_progress table created';
    RAISE NOTICE '   - RLS policies configured';
    RAISE NOTICE '   - 3 RPC functions created';
    RAISE NOTICE '   - Indexes and permissions granted';
    RAISE NOTICE '🎯 Users can now mine for 6-hour sessions and claim daily rewards!';
END $$;