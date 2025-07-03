/*
  # Fix Supabase Synchronization Issues

  1. Schema Validation
    - Ensure all tables exist with correct structure
    - Fix any missing columns or constraints
    - Update RLS policies

  2. Data Integrity
    - Clean up orphaned records
    - Fix referential integrity issues
    - Update user data consistency

  3. Function Updates
    - Ensure all RPC functions are properly defined
    - Fix any function signature mismatches
*/

-- Ensure all required tables exist with proper structure
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  username text,
  level integer DEFAULT 1,
  wallet_address text,
  registered_at timestamptz DEFAULT now(),
  referral_count integer DEFAULT 0,
  preferred_exchange text,
  total_minutes integer DEFAULT 0,
  points integer DEFAULT 0,
  referral_tier text DEFAULT 'bronze',
  lyra_balance integer DEFAULT 0,
  membership_level text DEFAULT 'bronze',
  supabase_auth_id uuid,
  profile_image text,
  registration_bonus_applied boolean DEFAULT false,
  daily_game_sessions integer DEFAULT 0,
  last_game_session_date date DEFAULT CURRENT_DATE,
  current_mining_session_id uuid,
  last_mining_claim_date date,
  mining_sessions_today integer DEFAULT 0
);

-- Add missing constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_membership_level_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_membership_level_check 
    CHECK (membership_level = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_referral_tier_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_referral_tier_check 
    CHECK (referral_tier = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text]));
  END IF;
END $$;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for users
DROP POLICY IF EXISTS "Enable read access for own data" ON users;
CREATE POLICY "Enable read access for own data" ON users
  FOR SELECT TO authenticated
  USING (uid() = supabase_auth_id);

DROP POLICY IF EXISTS "Enable update for own data" ON users;
CREATE POLICY "Enable update for own data" ON users
  FOR UPDATE TO authenticated
  USING (uid() = supabase_auth_id)
  WITH CHECK (uid() = supabase_auth_id);

-- Fix any users with null usernames
UPDATE users 
SET username = 'مستخدم جديد' 
WHERE username IS NULL OR username = '';

-- Ensure referrals table exists
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL,
  referred_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  reward_claimed boolean DEFAULT false
);

-- Add referrals constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_status_check'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT referrals_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text]));
  END IF;
END $$;

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Update referrals RLS policy
DROP POLICY IF EXISTS "Users can read their own referrals" ON referrals;
CREATE POLICY "Users can read their own referrals" ON referrals
  FOR SELECT TO public
  USING (((uid())::text = referrer_id) OR ((uid())::text = referred_id));

-- Ensure all other required tables exist
CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  points_reward integer DEFAULT 10,
  platform text NOT NULL,
  task_type text DEFAULT 'daily',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixed_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  points_reward integer DEFAULT 20,
  platform text NOT NULL,
  task_type text DEFAULT 'fixed',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mining_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz NOT NULL,
  status text DEFAULT 'active',
  minutes_earned integer DEFAULT 0,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies
CREATE POLICY IF NOT EXISTS "Anyone can read daily tasks" ON daily_tasks
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Anyone can read fixed tasks" ON fixed_tasks
  FOR SELECT TO public
  USING (is_active = true);

-- Update register_telegram_user function to handle unnamed users properly
CREATE OR REPLACE FUNCTION register_telegram_user(
  p_telegram_id text,
  p_supabase_auth_id uuid,
  p_username text DEFAULT NULL,
  p_level integer DEFAULT 1
)
RETURNS json AS $$
DECLARE
  user_record users%ROWTYPE;
  display_username text;
BEGIN
  -- Set default username for unnamed users
  display_username := COALESCE(NULLIF(trim(p_username), ''), 'مستخدم جديد');
  
  -- Insert or update user
  INSERT INTO users (
    telegram_id,
    supabase_auth_id,
    username,
    level,
    points,
    total_minutes,
    referral_count,
    referral_tier,
    lyra_balance,
    membership_level,
    registration_bonus_applied
  ) VALUES (
    p_telegram_id,
    p_supabase_auth_id,
    display_username,
    p_level,
    0,
    0,
    0,
    'bronze',
    0,
    'bronze',
    false
  )
  ON CONFLICT (telegram_id) 
  DO UPDATE SET
    supabase_auth_id = EXCLUDED.supabase_auth_id,
    username = COALESCE(NULLIF(trim(EXCLUDED.username), ''), users.username, 'مستخدم جديد'),
    level = EXCLUDED.level
  RETURNING * INTO user_record;

  -- Return user data as JSON
  RETURN json_build_object(
    'id', user_record.id,
    'telegram_id', user_record.telegram_id,
    'username', user_record.username,
    'level', user_record.level,
    'points', user_record.points,
    'total_minutes', user_record.total_minutes,
    'referral_count', user_record.referral_count,
    'referral_tier', user_record.referral_tier,
    'lyra_balance', user_record.lyra_balance,
    'membership_level', user_record.membership_level,
    'registration_bonus_applied', user_record.registration_bonus_applied
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update process_referral function to handle unnamed users
CREATE OR REPLACE FUNCTION process_referral(
  p_referrer_telegram_id text,
  p_referred_telegram_id text
)
RETURNS json AS $$
DECLARE
  referral_record referrals%ROWTYPE;
  referrer_exists boolean;
  referred_exists boolean;
BEGIN
  -- Validate input parameters
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid referral parameters'
    );
  END IF;

  -- Check if users exist
  SELECT EXISTS(SELECT 1 FROM users WHERE telegram_id = p_referrer_telegram_id) INTO referrer_exists;
  SELECT EXISTS(SELECT 1 FROM users WHERE telegram_id = p_referred_telegram_id) INTO referred_exists;

  IF NOT referrer_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Referrer not found'
    );
  END IF;

  IF NOT referred_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Referred user not found'
    );
  END IF;

  -- Prevent self-referral
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Self-referral not allowed'
    );
  END IF;

  -- Check if referral already exists
  IF EXISTS(SELECT 1 FROM referrals WHERE referred_id = p_referred_telegram_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User already referred'
    );
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
  RETURNING * INTO referral_record;

  -- Award points to referrer immediately
  UPDATE users 
  SET 
    points = points + 30,
    referral_count = referral_count + 1
  WHERE telegram_id = p_referrer_telegram_id;

  -- Update referral tier based on count
  UPDATE users 
  SET referral_tier = CASE 
    WHEN referral_count >= 50 THEN 'platinum'
    WHEN referral_count >= 25 THEN 'gold'
    WHEN referral_count >= 10 THEN 'silver'
    ELSE 'bronze'
  END
  WHERE telegram_id = p_referrer_telegram_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', referral_record.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_id ON users(supabase_auth_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

-- Clean up any orphaned data
DELETE FROM referrals 
WHERE referrer_id NOT IN (SELECT telegram_id FROM users)
   OR referred_id NOT IN (SELECT telegram_id FROM users);

-- Update any null usernames
UPDATE users 
SET username = 'مستخدم جديد' 
WHERE username IS NULL OR trim(username) = '';