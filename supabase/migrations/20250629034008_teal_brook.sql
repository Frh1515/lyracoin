/*
  # تحديث نظام الإحالات لدعم المستخدمين غير المسمين

  1. تحديثات الوظائف
    - تحديث `process_referral` لقبول المستخدمين بدون username
    - تحديث `register_telegram_user` لإرجاع jsonb بدلاً من نوع users
    - تحديث `get_referral_stats_secure` لعرض أفضل للمستخدمين غير المسمين

  2. الأمان
    - الحفاظ على جميع التحققات الأمنية
    - منع الإحالة الذاتية
    - منع الإحالات المكررة

  3. دعم المستخدمين غير المسمين
    - عرضهم كـ "مستخدم جديد" في الواجهة
    - السماح لهم بالمشاركة في نظام الإحالة
    - منح المكافآت بشكل طبيعي
*/

-- إسقاط الوظيفة الموجودة أولاً لتجنب تضارب نوع الإرجاع
DROP FUNCTION IF EXISTS public.register_telegram_user(text, uuid, text, integer);

-- تحديث وظيفة process_referral لقبول المستخدمين غير المسمين
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
  v_referrer_exists boolean;
  v_referred_exists boolean;
BEGIN
  -- التحقق من صحة المدخلات
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid telegram IDs'
    );
  END IF;
  
  -- التحقق من أن المدخلات ليست فارغة
  IF TRIM(p_referrer_telegram_id) = '' OR TRIM(p_referred_telegram_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Telegram IDs cannot be empty'
    );
  END IF;
  
  -- منع الإحالة الذاتية
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot refer yourself'
    );
  END IF;
  
  -- التحقق من عدم وجود إحالة سابقة للمستخدم المُحال
  SELECT COUNT(*) INTO v_existing_referral_count
  FROM referrals
  WHERE referred_id = p_referred_telegram_id;
  
  IF v_existing_referral_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User already referred'
    );
  END IF;
  
  -- التحقق من وجود المحيل في النظام (بغض النظر عن وجود username)
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE telegram_id = p_referrer_telegram_id
  ) INTO v_referrer_exists;
  
  IF NOT v_referrer_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referrer not found in system'
    );
  END IF;
  
  -- التحقق من وجود المُحال في النظام (بغض النظر عن وجود username)
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE telegram_id = p_referred_telegram_id
  ) INTO v_referred_exists;
  
  IF NOT v_referred_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referred user not found in system'
    );
  END IF;
  
  -- إنشاء سجل الإحالة (يقبل المستخدمين مع أو بدون username)
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
  RETURNING id INTO v_referral_id;
  
  -- تحديث عدد الإحالات للمحيل
  UPDATE users
  SET referral_count = referral_count + 1
  WHERE telegram_id = p_referrer_telegram_id;
  
  -- منح 30 نقطة للمحيل فوراً (بغض النظر عن وجود username)
  PERFORM update_user_points(p_referrer_telegram_id, 30, 'successful_referral');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id,
    'points_awarded', 30
  );
END;
$$;

-- إنشاء وظيفة register_telegram_user جديدة مع نوع الإرجاع jsonb
CREATE OR REPLACE FUNCTION public.register_telegram_user(
    p_telegram_id TEXT,
    p_supabase_auth_id UUID DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_level INT DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_new_user boolean := false;
    v_display_username text;
    v_user_id uuid;
    v_result jsonb;
BEGIN
    -- التحقق من صحة المدخلات
    IF p_telegram_id IS NULL OR p_telegram_id = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'telegram_id is required'
        );
    END IF;

    -- التحقق من كون هذا مستخدم جديد
    SELECT NOT EXISTS(
        SELECT 1 FROM users WHERE telegram_id = p_telegram_id
    ) INTO v_is_new_user;

    -- تحديد اسم المستخدم للعرض (إذا لم يكن موجود، استخدم قيمة افتراضية)
    v_display_username := COALESCE(
        NULLIF(TRIM(p_username), ''), 
        'مستخدم جديد'
    );

    -- إدراج أو تحديث بيانات المستخدم
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
        registration_bonus_applied,
        daily_game_sessions,
        last_game_session_date
    )
    VALUES (
        p_telegram_id,
        p_supabase_auth_id,
        v_display_username,
        p_level,
        0,
        0,
        0,
        'bronze',
        0,
        'bronze',
        false,
        0,
        CURRENT_DATE
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
        -- تحديث supabase_auth_id دائماً للجلسة الجديدة
        supabase_auth_id = EXCLUDED.supabase_auth_id,
        -- تحديث username فقط إذا كان الجديد أفضل من الموجود
        username = CASE 
            WHEN EXCLUDED.username IS NOT NULL 
                 AND EXCLUDED.username != 'مستخدم جديد' 
                 AND TRIM(EXCLUDED.username) != '' 
            THEN EXCLUDED.username
            ELSE users.username
        END,
        level = EXCLUDED.level
    RETURNING id INTO v_user_id;
    
    -- تطبيق مكافأة التسجيل للمستخدمين الجدد
    IF v_is_new_user THEN
        PERFORM apply_registration_bonus(p_telegram_id);
    END IF;
    
    -- إنشاء النتيجة
    SELECT jsonb_build_object(
        'success', true,
        'message', 'User registered successfully',
        'user_id', u.id,
        'telegram_id', u.telegram_id,
        'username', u.username,
        'level', u.level,
        'points', u.points,
        'total_minutes', u.total_minutes,
        'referral_count', u.referral_count,
        'is_new_user', v_is_new_user
    ) INTO v_result
    FROM users u
    WHERE u.telegram_id = p_telegram_id;
    
    RETURN v_result;
END;
$$;

-- تحديث وظيفة get_referral_stats_secure لعرض أفضل للمستخدمين غير المسمين
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
      'success', false,
      'message', 'User not found'
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
  
  -- الحصول على جميع الإحالات مع المعلومات التفصيلية (مع دعم المستخدمين غير المسمين)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'referred_username', CASE 
        WHEN u.username IS NULL OR TRIM(u.username) = '' THEN 'مستخدم جديد'
        WHEN u.username = 'مستخدم جديد' THEN 'مستخدم جديد'
        ELSE u.username
      END,
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

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats_secure(text) TO authenticated;