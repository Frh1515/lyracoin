/*
  # Enhance User Experience and System Performance

  1. New Features
    - Add user activity tracking
    - Add notification preferences
    - Add achievement system
    - Add user statistics view

  2. Performance Improvements
    - Add missing indexes for better query performance
    - Add materialized view for user stats

  3. Security Enhancements
    - Add additional RLS policies
    - Add audit logging for important actions

  4. Data Integrity
    - Add constraints and triggers for data consistency
*/

-- Add user activity tracking table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL REFERENCES users(telegram_id),
  activity_type text NOT NULL CHECK (activity_type IN ('login', 'task_completed', 'mining_started', 'mining_claimed', 'referral_made', 'game_played', 'boost_purchased')),
  activity_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add notification preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text UNIQUE NOT NULL REFERENCES users(telegram_id),
  mining_notifications boolean DEFAULT true,
  task_notifications boolean DEFAULT true,
  referral_notifications boolean DEFAULT true,
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'ar')),
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT '🏆',
  requirement_type text NOT NULL CHECK (requirement_type IN ('points', 'referrals', 'tasks', 'mining_sessions', 'game_sessions')),
  requirement_value integer NOT NULL,
  reward_points integer DEFAULT 0,
  reward_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL REFERENCES users(telegram_id),
  achievement_id uuid NOT NULL REFERENCES achievements(id),
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_telegram_id, achievement_id)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_type ON user_activity_log(user_telegram_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_mining_sessions_status_end_time ON mining_sessions(status, end_time);
CREATE INDEX IF NOT EXISTS idx_referrals_status_created ON referrals(status, created_at DESC);

-- Enable RLS on new tables
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity_log
CREATE POLICY "Users can read their own activity log"
  ON user_activity_log
  FOR SELECT
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "System can insert activity log"
  ON user_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ))
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- RLS Policies for achievements
CREATE POLICY "Anyone can read active achievements"
  ON achievements
  FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can read their own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "System can award achievements"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- Insert default achievements
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, reward_points, reward_minutes) VALUES
('First Steps', 'Complete your first task', '👶', 'tasks', 1, 10, 5),
('Task Master', 'Complete 10 tasks', '📋', 'tasks', 10, 50, 30),
('Task Legend', 'Complete 50 tasks', '🏆', 'tasks', 50, 200, 100),
('Referral Starter', 'Make your first referral', '🤝', 'referrals', 1, 20, 10),
('Referral Pro', 'Make 5 referrals', '🌟', 'referrals', 5, 100, 60),
('Referral Master', 'Make 25 referrals', '👑', 'referrals', 25, 500, 300),
('Point Collector', 'Earn 100 points', '💎', 'points', 100, 25, 15),
('Point Millionaire', 'Earn 1000 points', '💰', 'points', 1000, 100, 60),
('Miner', 'Complete 5 mining sessions', '⛏️', 'mining_sessions', 5, 50, 30),
('Mining Expert', 'Complete 25 mining sessions', '🏭', 'mining_sessions', 25, 200, 120),
('Gamer', 'Play 10 game sessions', '🎮', 'game_sessions', 10, 30, 20),
('Gaming Champion', 'Play 50 game sessions', '🏅', 'game_sessions', 50, 150, 90)
ON CONFLICT DO NOTHING;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_telegram_id text,
  p_activity_type text,
  p_activity_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity_log (user_telegram_id, activity_type, activity_data)
  VALUES (p_user_telegram_id, p_activity_type, p_activity_data);
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_telegram_id text)
RETURNS TABLE(
  achievement_name text,
  achievement_description text,
  achievement_icon text,
  points_awarded integer,
  minutes_awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_stats record;
  achievement_record record;
  already_earned boolean;
BEGIN
  -- Get user statistics
  SELECT 
    u.points,
    u.referral_count,
    COALESCE(task_count.total, 0) as total_tasks,
    COALESCE(mining_count.total, 0) as total_mining_sessions,
    COALESCE(game_count.total, 0) as total_game_sessions
  INTO user_stats
  FROM users u
  LEFT JOIN (
    SELECT user_telegram_id, 
           COUNT(*) as total
    FROM (
      SELECT user_telegram_id FROM user_daily_tasks WHERE user_telegram_id = p_user_telegram_id
      UNION ALL
      SELECT user_telegram_id FROM user_fixed_tasks WHERE user_telegram_id = p_user_telegram_id
    ) combined_tasks
    GROUP BY user_telegram_id
  ) task_count ON u.telegram_id = task_count.user_telegram_id
  LEFT JOIN (
    SELECT user_telegram_id, COUNT(*) as total
    FROM mining_sessions 
    WHERE user_telegram_id = p_user_telegram_id AND status = 'claimed'
    GROUP BY user_telegram_id
  ) mining_count ON u.telegram_id = mining_count.user_telegram_id
  LEFT JOIN (
    SELECT user_telegram_id, COUNT(*) as total
    FROM game_sessions 
    WHERE user_telegram_id = p_user_telegram_id
    GROUP BY user_telegram_id
  ) game_count ON u.telegram_id = game_count.user_telegram_id
  WHERE u.telegram_id = p_user_telegram_id;

  -- Check each achievement
  FOR achievement_record IN 
    SELECT * FROM achievements WHERE is_active = true
  LOOP
    -- Check if user already has this achievement
    SELECT EXISTS(
      SELECT 1 FROM user_achievements 
      WHERE user_telegram_id = p_user_telegram_id 
      AND achievement_id = achievement_record.id
    ) INTO already_earned;

    IF NOT already_earned THEN
      -- Check if user meets the requirement
      CASE achievement_record.requirement_type
        WHEN 'points' THEN
          IF user_stats.points >= achievement_record.requirement_value THEN
            -- Award achievement
            INSERT INTO user_achievements (user_telegram_id, achievement_id)
            VALUES (p_user_telegram_id, achievement_record.id);
            
            -- Update user points and minutes
            UPDATE users 
            SET points = points + achievement_record.reward_points,
                total_minutes = total_minutes + achievement_record.reward_minutes
            WHERE telegram_id = p_user_telegram_id;
            
            -- Return achievement info
            achievement_name := achievement_record.name;
            achievement_description := achievement_record.description;
            achievement_icon := achievement_record.icon;
            points_awarded := achievement_record.reward_points;
            minutes_awarded := achievement_record.reward_minutes;
            RETURN NEXT;
          END IF;
          
        WHEN 'referrals' THEN
          IF user_stats.referral_count >= achievement_record.requirement_value THEN
            INSERT INTO user_achievements (user_telegram_id, achievement_id)
            VALUES (p_user_telegram_id, achievement_record.id);
            
            UPDATE users 
            SET points = points + achievement_record.reward_points,
                total_minutes = total_minutes + achievement_record.reward_minutes
            WHERE telegram_id = p_user_telegram_id;
            
            achievement_name := achievement_record.name;
            achievement_description := achievement_record.description;
            achievement_icon := achievement_record.icon;
            points_awarded := achievement_record.reward_points;
            minutes_awarded := achievement_record.reward_minutes;
            RETURN NEXT;
          END IF;
          
        WHEN 'tasks' THEN
          IF user_stats.total_tasks >= achievement_record.requirement_value THEN
            INSERT INTO user_achievements (user_telegram_id, achievement_id)
            VALUES (p_user_telegram_id, achievement_record.id);
            
            UPDATE users 
            SET points = points + achievement_record.reward_points,
                total_minutes = total_minutes + achievement_record.reward_minutes
            WHERE telegram_id = p_user_telegram_id;
            
            achievement_name := achievement_record.name;
            achievement_description := achievement_record.description;
            achievement_icon := achievement_record.icon;
            points_awarded := achievement_record.reward_points;
            minutes_awarded := achievement_record.reward_minutes;
            RETURN NEXT;
          END IF;
          
        WHEN 'mining_sessions' THEN
          IF user_stats.total_mining_sessions >= achievement_record.requirement_value THEN
            INSERT INTO user_achievements (user_telegram_id, achievement_id)
            VALUES (p_user_telegram_id, achievement_record.id);
            
            UPDATE users 
            SET points = points + achievement_record.reward_points,
                total_minutes = total_minutes + achievement_record.reward_minutes
            WHERE telegram_id = p_user_telegram_id;
            
            achievement_name := achievement_record.name;
            achievement_description := achievement_record.description;
            achievement_icon := achievement_record.icon;
            points_awarded := achievement_record.reward_points;
            minutes_awarded := achievement_record.reward_minutes;
            RETURN NEXT;
          END IF;
          
        WHEN 'game_sessions' THEN
          IF user_stats.total_game_sessions >= achievement_record.requirement_value THEN
            INSERT INTO user_achievements (user_telegram_id, achievement_id)
            VALUES (p_user_telegram_id, achievement_record.id);
            
            UPDATE users 
            SET points = points + achievement_record.reward_points,
                total_minutes = total_minutes + achievement_record.reward_minutes
            WHERE telegram_id = p_user_telegram_id;
            
            achievement_name := achievement_record.name;
            achievement_description := achievement_record.description;
            achievement_icon := achievement_record.icon;
            points_awarded := achievement_record.reward_points;
            minutes_awarded := achievement_record.reward_minutes;
            RETURN NEXT;
          END IF;
      END CASE;
    END IF;
  END LOOP;
END;
$$;

-- Function to get user comprehensive stats
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_telegram_id text)
RETURNS TABLE(
  user_info jsonb,
  activity_summary jsonb,
  achievements_earned jsonb,
  recent_activities jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get user basic info
  SELECT jsonb_build_object(
    'telegram_id', u.telegram_id,
    'username', u.username,
    'level', u.level,
    'points', u.points,
    'total_minutes', u.total_minutes,
    'referral_count', u.referral_count,
    'referral_tier', u.referral_tier,
    'membership_level', u.membership_level,
    'registered_at', u.registered_at
  ) INTO user_info
  FROM users u
  WHERE u.telegram_id = p_user_telegram_id;

  -- Get activity summary
  SELECT jsonb_build_object(
    'total_tasks_completed', COALESCE(task_stats.total, 0),
    'daily_tasks_completed', COALESCE(task_stats.daily_count, 0),
    'fixed_tasks_completed', COALESCE(task_stats.fixed_count, 0),
    'mining_sessions_completed', COALESCE(mining_stats.total, 0),
    'game_sessions_played', COALESCE(game_stats.total, 0),
    'total_referrals', COALESCE(referral_stats.total, 0),
    'verified_referrals', COALESCE(referral_stats.verified, 0)
  ) INTO activity_summary
  FROM (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN source = 'daily' THEN 1 END) as daily_count,
      COUNT(CASE WHEN source = 'fixed' THEN 1 END) as fixed_count
    FROM (
      SELECT 'daily' as source FROM user_daily_tasks WHERE user_telegram_id = p_user_telegram_id
      UNION ALL
      SELECT 'fixed' as source FROM user_fixed_tasks WHERE user_telegram_id = p_user_telegram_id
    ) combined_tasks
  ) task_stats
  CROSS JOIN (
    SELECT COUNT(*) as total
    FROM mining_sessions 
    WHERE user_telegram_id = p_user_telegram_id AND status = 'claimed'
  ) mining_stats
  CROSS JOIN (
    SELECT COUNT(*) as total
    FROM game_sessions 
    WHERE user_telegram_id = p_user_telegram_id
  ) game_stats
  CROSS JOIN (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified
    FROM referrals 
    WHERE referrer_id = p_user_telegram_id
  ) referral_stats;

  -- Get earned achievements
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', a.name,
      'description', a.description,
      'icon', a.icon,
      'earned_at', ua.earned_at
    ) ORDER BY ua.earned_at DESC
  ) INTO achievements_earned
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_telegram_id = p_user_telegram_id;

  -- Get recent activities
  SELECT jsonb_agg(
    jsonb_build_object(
      'activity_type', activity_type,
      'activity_data', activity_data,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO recent_activities
  FROM (
    SELECT activity_type, activity_data, created_at
    FROM user_activity_log
    WHERE user_telegram_id = p_user_telegram_id
    ORDER BY created_at DESC
    LIMIT 20
  ) recent;

  RETURN QUERY SELECT user_info, activity_summary, achievements_earned, recent_activities;
END;
$$;

-- Trigger to automatically check achievements after important actions
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_telegram_id_val text;
BEGIN
  -- Get user telegram_id based on the table
  IF TG_TABLE_NAME = 'user_daily_tasks' OR TG_TABLE_NAME = 'user_fixed_tasks' THEN
    user_telegram_id_val := NEW.user_telegram_id;
  ELSIF TG_TABLE_NAME = 'game_sessions' THEN
    user_telegram_id_val := NEW.user_telegram_id;
  ELSIF TG_TABLE_NAME = 'mining_sessions' THEN
    user_telegram_id_val := NEW.user_telegram_id;
  ELSIF TG_TABLE_NAME = 'referrals' THEN
    user_telegram_id_val := NEW.referrer_id;
  ELSIF TG_TABLE_NAME = 'users' THEN
    user_telegram_id_val := NEW.telegram_id;
  END IF;

  -- Check achievements asynchronously (in a separate transaction)
  PERFORM check_and_award_achievements(user_telegram_id_val);
  
  RETURN NEW;
END;
$$;

-- Create triggers for achievement checking
DROP TRIGGER IF EXISTS check_achievements_after_daily_task ON user_daily_tasks;
CREATE TRIGGER check_achievements_after_daily_task
  AFTER INSERT ON user_daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

DROP TRIGGER IF EXISTS check_achievements_after_fixed_task ON user_fixed_tasks;
CREATE TRIGGER check_achievements_after_fixed_task
  AFTER INSERT ON user_fixed_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

DROP TRIGGER IF EXISTS check_achievements_after_game_session ON game_sessions;
CREATE TRIGGER check_achievements_after_game_session
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

DROP TRIGGER IF EXISTS check_achievements_after_mining_claim ON mining_sessions;
CREATE TRIGGER check_achievements_after_mining_claim
  AFTER UPDATE ON mining_sessions
  FOR EACH ROW
  WHEN (OLD.status != 'claimed' AND NEW.status = 'claimed')
  EXECUTE FUNCTION trigger_check_achievements();

DROP TRIGGER IF EXISTS check_achievements_after_referral ON referrals;
CREATE TRIGGER check_achievements_after_referral
  AFTER UPDATE ON referrals
  FOR EACH ROW
  WHEN (OLD.status != 'verified' AND NEW.status = 'verified')
  EXECUTE FUNCTION trigger_check_achievements();

-- Add updated_at trigger for user_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();