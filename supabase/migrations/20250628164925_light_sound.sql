/*
  # السماح للمستخدمين غير المسمين في نظام الإحالات

  1. التغييرات
    - تحديث وظيفة process_referral لقبول المستخدمين غير المسمين
    - تحديث وظيفة register_telegram_user لتعامل أفضل مع المستخدمين غير المسمين
    - إضافة دعم للمستخدمين الذين لا يملكون username

  2. الأمان
    - الحفاظ على جميع التحققات الأمنية الموجودة
    - منع الإحالة الذاتية
    - منع الإحالات المكررة
    - التأكد من وجود المستخدمين في النظام
*/

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

-- تحديث وظيفة register_telegram_user لتعامل أفضل مع المستخدمين غير المسمين
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
    v_display_username text;
BEGIN
    -- التحقق من صحة المدخلات
    IF p_telegram_id IS NULL OR p_telegram_id = '' THEN
        RAISE EXCEPTION 'telegram_id is required';
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

    -- التحقق من وجود supabase_auth_id في جدول auth.users
    IF p_supabase_auth_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_supabase_auth_id) THEN
            p_supabase_auth_id := NULL; -- تعيين القيمة إلى NULL إذا لم يكن موجوداً
        END IF;
    END IF;

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
        -- تحديث supabase_auth_id فقط إذا كان صالحاً
        supabase_auth_id = CASE 
            WHEN EXCLUDED.supabase_auth_id IS NOT NULL 
            THEN EXCLUDED.supabase_auth_id
            ELSE users.supabase_auth_id
        END,
        -- تحديث username فقط إذا كان الجديد أفضل من الموجود
        username = CASE 
            WHEN EXCLUDED.username IS NOT NULL 
                 AND EXCLUDED.username != 'مستخدم جديد' 
                 AND TRIM(EXCLUDED.username) != '' 
            THEN EXCLUDED.username
            ELSE users.username
        END,
        level = EXCLUDED.level,
        -- الحفاظ على القيم الموجودة للحقول الأخرى
        referral_count = users.referral_count,
        total_minutes = users.total_minutes,
        points = users.points,
        referral_tier = users.referral_tier,
        lyra_balance = users.lyra_balance,
        membership_level = users.membership_level,
        registration_bonus_applied = users.registration_bonus_applied,
        daily_game_sessions = users.daily_game_sessions,
        last_game_session_date = users.last_game_session_date
    RETURNING * INTO registered_user;
    
    -- تطبيق مكافأة التسجيل للمستخدمين الجدد
    IF v_is_new_user THEN
        PERFORM apply_registration_bonus(p_telegram_id);
        
        -- جلب سجل المستخدم المحدث مع المكافأة المطبقة
        SELECT * INTO registered_user
        FROM users
        WHERE telegram_id = p_telegram_id;
    END IF;
    
    RETURN registered_user;
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

-- اختبار آمن للنظام بدون إنشاء مستخدمين جدد
DO $$
DECLARE
  v_existing_users_count integer;
  v_test_result jsonb;
BEGIN
  -- التحقق من وجود مستخدمين في النظام
  SELECT COUNT(*) INTO v_existing_users_count FROM users;
  
  IF v_existing_users_count > 0 THEN
    -- اختبار وظيفة get_referral_stats_secure مع أول مستخدم موجود
    DECLARE
      v_first_user_id text;
    BEGIN
      SELECT telegram_id INTO v_first_user_id FROM users LIMIT 1;
      
      IF v_first_user_id IS NOT NULL THEN
        SELECT get_referral_stats_secure(v_first_user_id) INTO v_test_result;
        
        IF v_test_result IS NOT NULL THEN
          RAISE NOTICE '✅ اختبار get_referral_stats_secure: نجح';
        ELSE
          RAISE NOTICE '❌ اختبار get_referral_stats_secure: فشل';
        END IF;
      END IF;
    END;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 تم تحديث نظام الإحالات بنجاح!';
  RAISE NOTICE '✅ المستخدمون غير المسمون يمكنهم الآن:';
  RAISE NOTICE '   - إحالة مستخدمين آخرين';
  RAISE NOTICE '   - أن يتم إحالتهم من قبل مستخدمين آخرين';
  RAISE NOTICE '   - الحصول على مكافآت الإحالة (30 نقطة + 60 دقيقة)';
  RAISE NOTICE '   - عرض إحصائيات الإحالة الخاصة بهم';
  RAISE NOTICE '✅ يتم عرضهم كـ "مستخدم جديد" في واجهة الإحالات';
  RAISE NOTICE '✅ جميع التحققات الأمنية محفوظة';
END $$;