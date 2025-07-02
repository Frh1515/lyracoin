/*
  # إصلاح نظام الجلسات اليومية والمهام والتعدين

  1. تحديث جدول المستخدمين لتتبع الجلسات اليومية بدقة
  2. إضافة المهام اليومية الجديدة مع الروابط المحدثة
  3. تحسين نظام التعدين لمنع التلاعب
  4. إصلاح احتساب الإحالات للمستخدمين بدون أسماء
*/

-- تحديث جدول المستخدمين لإضافة تتبع أفضل للجلسات
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_mining_session_id uuid,
ADD COLUMN IF NOT EXISTS last_mining_claim_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mining_sessions_today integer DEFAULT 0;

-- إنشاء جدول لتتبع جلسات التعدين
CREATE TABLE IF NOT EXISTS mining_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL REFERENCES users(telegram_id),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  minutes_earned integer DEFAULT 0,
  claimed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- إنشاء فهارس لجدول جلسات التعدين
CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_status ON mining_sessions(user_telegram_id, status);
CREATE INDEX IF NOT EXISTS idx_mining_sessions_end_time ON mining_sessions(end_time);

-- تمكين RLS لجدول جلسات التعدين
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لجدول جلسات التعدين
CREATE POLICY "Users can read their own mining sessions"
  ON mining_sessions
  FOR SELECT
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own mining sessions"
  ON mining_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own mining sessions"
  ON mining_sessions
  FOR UPDATE
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- حذف المهام اليومية الموجودة لإعادة إنشائها
DELETE FROM daily_tasks;

-- إضافة المهام اليومية الجديدة مع الروابط المحدثة
INSERT INTO daily_tasks (title, description, points_reward, platform, task_type, is_active) VALUES
('شاهد فيديو تيك توك وتفاعل معه | Watch TikTok video and interact', 
 'شاهد الفيديو، أعجب به، وشاركه مع أصدقائك | Watch the video, like it, and share with friends', 
 20, 'tiktok', 'daily', true),

('شاهد ريل إنستغرام وتفاعل معه | Watch Instagram reel and interact', 
 'شاهد الريل، أعجب به، وشاركه مع متابعيك | Watch the reel, like it, and share with followers', 
 20, 'instagram', 'daily', true),

('شاهد منشور تويتر وأعجب به وشاركه | Watch Twitter post and like and share', 
 'شاهد المنشور، أعجب به، وأعد تغريده | Watch the post, like it, and retweet', 
 20, 'twitter', 'daily', true),

('شاهد فيديو يوتيوب وشاركه | Watch YouTube video and share', 
 'شاهد الفيديو، أعجب به، واشترك في القناة | Watch the video, like it, and subscribe to channel', 
 20, 'youtube', 'daily', true),

('شاهد فيديو فيسبوك وأعجب به وشاركه | Watch Facebook video and like and share', 
 'شاهد الفيديو، أعجب به، وشاركه مع أصدقائك | Watch the video, like it, and share with friends', 
 20, 'facebook', 'daily', true);

-- وظيفة محدثة لبدء جلسة تعدين جديدة
CREATE OR REPLACE FUNCTION start_mining_session(p_user_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_end_time timestamptz;
  v_active_session_exists boolean;
BEGIN
  -- التحقق من وجود جلسة نشطة
  SELECT EXISTS(
    SELECT 1 FROM mining_sessions 
    WHERE user_telegram_id = p_user_telegram_id 
    AND status = 'active'
    AND end_time > now()
  ) INTO v_active_session_exists;
  
  IF v_active_session_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Active mining session already exists'
    );
  END IF;
  
  -- حساب وقت انتهاء الجلسة (6 ساعات)
  v_end_time := now() + interval '6 hours';
  
  -- إنشاء جلسة تعدين جديدة
  INSERT INTO mining_sessions (user_telegram_id, start_time, end_time, status)
  VALUES (p_user_telegram_id, now(), v_end_time, 'active')
  RETURNING id INTO v_session_id;
  
  -- تحديث معرف الجلسة الحالية للمستخدم
  UPDATE users 
  SET current_mining_session_id = v_session_id
  WHERE telegram_id = p_user_telegram_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mining session started successfully',
    'session_id', v_session_id,
    'end_time', v_end_time
  );
END;
$$;

-- وظيفة للحصول على حالة التعدين الحالية
CREATE OR REPLACE FUNCTION get_current_mining_status(p_user_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session mining_sessions%ROWTYPE;
  v_can_claim boolean := false;
  v_time_remaining interval;
  v_last_claim_date date;
BEGIN
  -- الحصول على الجلسة النشطة
  SELECT * INTO v_session
  FROM mining_sessions
  WHERE user_telegram_id = p_user_telegram_id
  AND status IN ('active', 'completed')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- الحصول على تاريخ آخر مطالبة
  SELECT last_mining_claim_date INTO v_last_claim_date
  FROM users
  WHERE telegram_id = p_user_telegram_id;
  
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'idle',
      'can_start', true,
      'can_claim', false,
      'session_active', false
    );
  END IF;
  
  -- التحقق من انتهاء الجلسة
  IF now() >= v_session.end_time AND v_session.status = 'active' THEN
    -- تحديث حالة الجلسة إلى مكتملة
    UPDATE mining_sessions 
    SET status = 'completed', minutes_earned = 360 -- 6 ساعات = 360 دقيقة
    WHERE id = v_session.id;
    
    v_session.status := 'completed';
    v_session.minutes_earned := 360;
  END IF;
  
  -- التحقق من إمكانية المطالبة (24 ساعة من آخر مطالبة)
  v_can_claim := (
    v_session.status = 'completed' 
    AND v_session.claimed_at IS NULL
    AND (v_last_claim_date IS NULL OR v_last_claim_date < CURRENT_DATE)
  );
  
  -- حساب الوقت المتبقي
  IF v_session.status = 'active' THEN
    v_time_remaining := v_session.end_time - now();
  ELSE
    v_time_remaining := interval '0';
  END IF;
  
  RETURN jsonb_build_object(
    'status', v_session.status,
    'session_id', v_session.id,
    'start_time', v_session.start_time,
    'end_time', v_session.end_time,
    'minutes_earned', COALESCE(v_session.minutes_earned, 0),
    'can_claim', v_can_claim,
    'can_start', (v_session.status = 'claimed' OR v_session.status IS NULL),
    'session_active', (v_session.status = 'active'),
    'time_remaining_seconds', EXTRACT(EPOCH FROM v_time_remaining)::integer,
    'last_claim_date', v_last_claim_date
  );
END;
$$;

-- وظيفة لمطالبة مكافآت التعدين
CREATE OR REPLACE FUNCTION claim_mining_rewards(p_user_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session mining_sessions%ROWTYPE;
  v_last_claim_date date;
  v_minutes_to_add integer;
  v_points_to_add integer;
BEGIN
  -- الحصول على آخر جلسة مكتملة غير مطالب بها
  SELECT * INTO v_session
  FROM mining_sessions
  WHERE user_telegram_id = p_user_telegram_id
  AND status = 'completed'
  AND claimed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No completed session available for claiming'
    );
  END IF;
  
  -- التحقق من تاريخ آخر مطالبة
  SELECT last_mining_claim_date INTO v_last_claim_date
  FROM users
  WHERE telegram_id = p_user_telegram_id;
  
  IF v_last_claim_date = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already claimed today. Wait 24 hours.'
    );
  END IF;
  
  v_minutes_to_add := COALESCE(v_session.minutes_earned, 360);
  v_points_to_add := v_minutes_to_add / 10; -- 1 نقطة لكل 10 دقائق
  
  -- تحديث رصيد المستخدم
  UPDATE users
  SET 
    total_minutes = total_minutes + v_minutes_to_add,
    points = points + v_points_to_add,
    last_mining_claim_date = CURRENT_DATE
  WHERE telegram_id = p_user_telegram_id;
  
  -- تحديث حالة الجلسة
  UPDATE mining_sessions
  SET 
    status = 'claimed',
    claimed_at = now()
  WHERE id = v_session.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mining rewards claimed successfully',
    'minutes_earned', v_minutes_to_add,
    'points_earned', v_points_to_add
  );
END;
$$;

-- وظيفة محدثة لتسجيل جلسة لعب مع تتبع يومي دقيق
CREATE OR REPLACE FUNCTION record_daily_game_session(p_user_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sessions_today integer;
  v_last_session_date date;
  v_points_earned integer := 0;
  v_can_earn_points boolean := false;
BEGIN
  -- الحصول على عدد الجلسات اليوم وتاريخ آخر جلسة
  SELECT daily_game_sessions, last_game_session_date
  INTO v_sessions_today, v_last_session_date
  FROM users
  WHERE telegram_id = p_user_telegram_id;
  
  -- إعادة تعيين العداد إذا كان يوم جديد
  IF v_last_session_date IS NULL OR v_last_session_date < CURRENT_DATE THEN
    v_sessions_today := 0;
  END IF;
  
  -- التحقق من إمكانية كسب النقاط (أول 3 جلسات فقط)
  IF v_sessions_today < 3 THEN
    v_can_earn_points := true;
    v_points_earned := 20;
  END IF;
  
  -- تحديث عداد الجلسات
  UPDATE users
  SET 
    daily_game_sessions = v_sessions_today + 1,
    last_game_session_date = CURRENT_DATE,
    points = CASE WHEN v_can_earn_points THEN points + v_points_earned ELSE points END
  WHERE telegram_id = p_user_telegram_id;
  
  -- تسجيل الجلسة
  INSERT INTO game_sessions (user_telegram_id, points_earned, session_date)
  VALUES (p_user_telegram_id, v_points_earned, CURRENT_DATE);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_can_earn_points THEN 'Game session recorded with points'
      ELSE 'Game session recorded (no points - daily limit reached)'
    END,
    'points_earned', v_points_earned,
    'sessions_remaining', GREATEST(0, 3 - (v_sessions_today + 1)),
    'can_earn_points', v_can_earn_points
  );
END;
$$;

-- منح الصلاحيات للوظائف الجديدة
GRANT EXECUTE ON FUNCTION start_mining_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_mining_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_mining_rewards(text) TO authenticated;
GRANT EXECUTE ON FUNCTION record_daily_game_session(text) TO authenticated;

-- تحديث وظيفة get_referral_stats_secure لعرض أفضل للمستخدمين بدون أسماء
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
BEGIN
  -- التحقق من وجود المستخدم
  IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = p_telegram_id) THEN
    RETURN jsonb_build_object(
      'total_referrals', 0,
      'verified_referrals', 0,
      'pending_referrals', 0,
      'total_minutes_earned', 0,
      'referral_tier', 'bronze',
      'all_referrals', '[]'::jsonb,
      'unclaimed_referrals', '[]'::jsonb
    );
  END IF;

  -- الحصول على إجمالي الإحالات
  SELECT COUNT(*) INTO v_total_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id;
  
  -- الحصول على الإحالات المؤكدة
  SELECT COUNT(*) INTO v_verified_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'verified';
  
  -- الحصول على الإحالات المعلقة
  SELECT COUNT(*) INTO v_pending_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'pending';
  
  -- الحصول على إجمالي الدقائق المكتسبة من المطالبات
  SELECT COALESCE(SUM(minutes_claimed), 0) INTO v_total_minutes_earned
  FROM referral_claims
  WHERE claimer_telegram_id = p_telegram_id;
  
  -- الحصول على مستوى الإحالة من المستخدم
  SELECT referral_tier INTO v_referral_tier
  FROM users
  WHERE telegram_id = p_telegram_id;
  
  -- الحصول على جميع الإحالات مع المعلومات التفصيلية
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'referred_username', COALESCE(
        NULLIF(TRIM(u.username), ''),
        'مستخدم بدون اسم'
      ),
      'created_at', r.created_at,
      'status', r.status,
      'reward_claimed', r.reward_claimed,
      'is_claimable', (r.status = 'verified' AND r.reward_claimed = false AND NOT EXISTS (
        SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
      )),
      'points_awarded', CASE WHEN r.status = 'verified' THEN 30 ELSE 0 END,
      'minutes_available', CASE 
        WHEN r.status = 'verified' AND r.reward_claimed = false AND NOT EXISTS (
          SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
        ) THEN 60 
        ELSE 0 
      END
    )
    ORDER BY r.created_at DESC
  ), '[]'::jsonb) INTO v_all_referrals
  FROM referrals r
  LEFT JOIN users u ON u.telegram_id = r.referred_id
  WHERE r.referrer_id = p_telegram_id;
  
  -- الحصول على الإحالات غير المطالب بها
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'created_at', r.created_at,
      'status', r.status
    )
    ORDER BY r.created_at DESC
  ), '[]'::jsonb) INTO v_unclaimed_referrals
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
    'all_referrals', v_all_referrals,
    'unclaimed_referrals', v_unclaimed_referrals
  );
END;
$$;