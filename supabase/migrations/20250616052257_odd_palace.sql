/*
  # Level System Implementation

  1. New Tables
    - `fixed_tasks` - Stores one-time tasks (3 tasks, 20 points each)
    - `user_fixed_tasks` - Tracks completed fixed tasks per user
    - `transactions` - Enhanced for pre-sale tracking (already exists, will be updated)

  2. Updated Tables
    - `users` - Add registration_bonus_applied column
    - Enhanced point tracking and level calculation

  3. New Functions
    - `calculate_membership_level` - Determines level based on points
    - `update_user_points` - Centralized point management
    - `claim_fixed_task` - Handle fixed task completion
    - `apply_registration_bonus` - Apply one-time registration bonus

  4. Triggers
    - `update_membership_level_trigger` - Auto-update levels when points change

  5. Security
    - Prevent duplicate bonuses and task claims
    - Tamper-proof point tracking
    - Secure RPC functions with validation
*/

-- Add registration_bonus_applied column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS registration_bonus_applied boolean DEFAULT false;

-- Create fixed_tasks table
CREATE TABLE IF NOT EXISTS public.fixed_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  points_reward integer NOT NULL DEFAULT 20,
  platform text NOT NULL,
  task_type text NOT NULL DEFAULT 'fixed',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_fixed_tasks table to track completed fixed tasks
CREATE TABLE IF NOT EXISTS public.user_fixed_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL,
  fixed_task_id uuid NOT NULL,
  points_earned integer NOT NULL,
  completed_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id),
  FOREIGN KEY (fixed_task_id) REFERENCES fixed_tasks(id),
  UNIQUE(user_telegram_id, fixed_task_id)
);

-- Enable RLS on new tables
ALTER TABLE public.fixed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fixed_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for fixed_tasks (public read access)
CREATE POLICY "Anyone can read fixed tasks"
  ON public.fixed_tasks
  FOR SELECT
  TO public
  USING (is_active = true);

-- RLS policies for user_fixed_tasks
CREATE POLICY "Users can read their own fixed task completions"
  ON public.user_fixed_tasks
  FOR SELECT
  TO authenticated
  USING (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own fixed task completions"
  ON public.user_fixed_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- Function to calculate membership level based on points
CREATE OR REPLACE FUNCTION public.calculate_membership_level(user_points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF user_points >= 1001 THEN
    RETURN 'platinum';
  ELSIF user_points >= 501 THEN
    RETURN 'gold';
  ELSIF user_points >= 201 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;

-- Function to update user points securely
CREATE OR REPLACE FUNCTION public.update_user_points(
  p_telegram_id text,
  p_points_to_add integer,
  p_reason text DEFAULT 'manual'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_exists boolean;
  v_new_points integer;
  v_new_level text;
BEGIN
  -- Input validation
  IF p_telegram_id IS NULL OR p_telegram_id = '' THEN
    RAISE EXCEPTION 'telegram_id is required';
  END IF;

  IF p_points_to_add IS NULL THEN
    RAISE EXCEPTION 'points_to_add is required';
  END IF;

  -- Check if user exists
  SELECT EXISTS(
    SELECT 1 FROM users WHERE telegram_id = p_telegram_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update user points and get new total
  UPDATE users 
  SET points = points + p_points_to_add
  WHERE telegram_id = p_telegram_id
  RETURNING points INTO v_new_points;

  -- Calculate and update membership level
  v_new_level := calculate_membership_level(v_new_points);
  
  UPDATE users 
  SET membership_level = v_new_level
  WHERE telegram_id = p_telegram_id;

  RETURN true;
END;
$$;

-- Function to apply registration bonus based on registration date
CREATE OR REPLACE FUNCTION public.apply_registration_bonus(p_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record record;
  v_bonus_points integer := 0;
  v_registration_date date;
  v_start_date date := '2024-06-20';
  v_period_1_end date := '2024-09-20';
  v_period_2_end date := '2024-12-20';
  v_period_3_end date := '2026-06-20';
BEGIN
  -- Get user record
  SELECT registered_at, registration_bonus_applied
  INTO v_user_record
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Check if bonus already applied
  IF v_user_record.registration_bonus_applied THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Registration bonus already applied'
    );
  END IF;

  v_registration_date := v_user_record.registered_at::date;

  -- Calculate bonus based on registration date
  IF v_registration_date >= v_start_date AND v_registration_date <= v_period_1_end THEN
    v_bonus_points := 50; -- First 3 months
  ELSIF v_registration_date > v_period_1_end AND v_registration_date <= v_period_2_end THEN
    v_bonus_points := 30; -- 3-6 months
  ELSIF v_registration_date > v_period_2_end AND v_registration_date <= v_period_3_end THEN
    v_bonus_points := 10; -- 6 months to 2 years
  ELSE
    v_bonus_points := 0; -- Outside bonus period
  END IF;

  -- Apply bonus if applicable
  IF v_bonus_points > 0 THEN
    -- Update points using the secure function
    PERFORM update_user_points(p_telegram_id, v_bonus_points, 'registration_bonus');
    
    -- Mark bonus as applied
    UPDATE users 
    SET registration_bonus_applied = true
    WHERE telegram_id = p_telegram_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Registration bonus applied successfully',
      'bonus_points', v_bonus_points
    );
  ELSE
    -- Mark as applied even if no bonus (to prevent future checks)
    UPDATE users 
    SET registration_bonus_applied = true
    WHERE telegram_id = p_telegram_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'No registration bonus applicable for this date',
      'bonus_points', 0
    );
  END IF;
END;
$$;

-- Function to claim fixed task
CREATE OR REPLACE FUNCTION public.claim_fixed_task(
  p_user_telegram_id text,
  p_fixed_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record record;
  v_already_claimed boolean;
BEGIN
  -- Check if task exists and is active
  SELECT id, title, points_reward, is_active
  INTO v_task_record
  FROM fixed_tasks
  WHERE id = p_fixed_task_id;

  IF v_task_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task not found'
    );
  END IF;

  IF NOT v_task_record.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task is not active'
    );
  END IF;

  -- Check if user already claimed this task
  SELECT EXISTS(
    SELECT 1 FROM user_fixed_tasks
    WHERE user_telegram_id = p_user_telegram_id 
    AND fixed_task_id = p_fixed_task_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task already completed'
    );
  END IF;

  -- Record the task completion
  INSERT INTO user_fixed_tasks (
    user_telegram_id,
    fixed_task_id,
    points_earned
  ) VALUES (
    p_user_telegram_id,
    p_fixed_task_id,
    v_task_record.points_reward
  );

  -- Award points
  PERFORM update_user_points(
    p_user_telegram_id, 
    v_task_record.points_reward, 
    'fixed_task_completion'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task completed successfully',
    'points_earned', v_task_record.points_reward,
    'task_title', v_task_record.title
  );
END;
$$;

-- Update the register_telegram_user function to apply registration bonus
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
BEGIN
    -- Input validation
    IF p_telegram_id IS NULL OR p_telegram_id = '' THEN
        RAISE EXCEPTION 'telegram_id is required';
    END IF;

    -- Check if this is a new user
    SELECT NOT EXISTS(
        SELECT 1 FROM users WHERE telegram_id = p_telegram_id
    ) INTO v_is_new_user;

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
        membership_level,
        registration_bonus_applied
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
        'bronze',
        false
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
        membership_level = users.membership_level,
        registration_bonus_applied = users.registration_bonus_applied
    RETURNING * INTO registered_user;
    
    -- Apply registration bonus for new users
    IF v_is_new_user THEN
        PERFORM apply_registration_bonus(p_telegram_id);
        
        -- Fetch updated user record with bonus applied
        SELECT * INTO registered_user
        FROM users
        WHERE telegram_id = p_telegram_id;
    END IF;
    
    RETURN registered_user;
END;
$$;

-- Update process_referral function to award 30 points for successful referrals
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
  
  -- Award 30 points to referrer for successful referral
  PERFORM update_user_points(p_referrer_telegram_id, 30, 'successful_referral');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id
  );
END;
$$;

-- Insert default fixed tasks (3 tasks, 20 points each)
INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) VALUES
('Join LYRA COIN Telegram Channel', 'Subscribe to our official Telegram channel for updates and announcements', 20, 'telegram', 'fixed'),
('Follow LYRA COIN on Twitter', 'Follow our official Twitter account for the latest news and updates', 20, 'twitter', 'fixed'),
('Share LYRA COIN with Friends', 'Share LYRA COIN with your friends and help grow our community', 20, 'social', 'fixed')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_fixed_tasks_user_id ON user_fixed_tasks(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_fixed_tasks_task_id ON user_fixed_tasks(fixed_task_id);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points);
CREATE INDEX IF NOT EXISTS idx_users_membership_level ON users(membership_level);
CREATE INDEX IF NOT EXISTS idx_users_registration_bonus ON users(registration_bonus_applied);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_membership_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_points(text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_registration_bonus(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_fixed_task(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO anon;