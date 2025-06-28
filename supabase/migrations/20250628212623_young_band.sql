/*
  # إصلاح نظام الإحالة

  1. التغييرات
    - تحسين وظيفة process_referral لتسجيل الإحالات بشكل صحيح
    - إضافة تسجيل أفضل للأحداث والأخطاء
    - إصلاح مشكلة تحديث عدد الإحالات في جدول المستخدمين
    - تحسين وظيفة get_referral_stats_secure لعرض جميع الإحالات بشكل صحيح

  2. الأمان
    - الحفاظ على جميع التحققات الأمنية الموجودة
    - تحسين التحقق من البيانات
    - منع الإحالات المكررة
*/

-- تحديث وظيفة process_referral لتسجيل الإحالات بشكل صحيح
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
  v_referrer_record record;
  v_current_referral_count integer;
  v_debug_info jsonb;
BEGIN
  -- تسجيل بداية العملية للتصحيح
  v_debug_info := jsonb_build_object(
    'function', 'process_referral',
    'referrer_id', p_referrer_telegram_id,
    'referred_id', p_referred_telegram_id,
    'timestamp', now()
  );

  RAISE NOTICE 'بدء معالجة الإحالة: %', v_debug_info;

  -- التحقق من صحة المدخلات
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RAISE NOTICE 'خطأ: معرفات تلغرام غير صالحة';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid telegram IDs',
      'debug', v_debug_info
    );
  END IF;
  
  -- التحقق من أن المدخلات ليست فارغة
  IF TRIM(p_referrer_telegram_id) = '' OR TRIM(p_referred_telegram_id) = '' THEN
    RAISE NOTICE 'خطأ: معرفات تلغرام فارغة';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Telegram IDs cannot be empty',
      'debug', v_debug_info
    );
  END IF;
  
  -- منع الإحالة الذاتية
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RAISE NOTICE 'خطأ: لا يمكن إحالة نفسك';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot refer yourself',
      'debug', v_debug_info
    );
  END IF;
  
  -- التحقق من عدم وجود إحالة سابقة للمستخدم المُحال
  SELECT COUNT(*) INTO v_existing_referral_count
  FROM referrals
  WHERE referred_id = p_referred_telegram_id;
  
  IF v_existing_referral_count > 0 THEN
    RAISE NOTICE 'خطأ: المستخدم تمت إحالته بالفعل';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User already referred',
      'debug', jsonb_build_object(
        'existing_referrals', v_existing_referral_count
      )
    );
  END IF;
  
  -- التحقق من وجود المحيل في النظام
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE telegram_id = p_referrer_telegram_id
  ) INTO v_referrer_exists;
  
  IF NOT v_referrer_exists THEN
    RAISE NOTICE 'خطأ: المحيل غير موجود في النظام';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referrer not found in system',
      'debug', v_debug_info
    );
  END IF;
  
  -- التحقق من وجود المُحال في النظام
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE telegram_id = p_referred_telegram_id
  ) INTO v_referred_exists;
  
  IF NOT v_referred_exists THEN
    RAISE NOTICE 'خطأ: المستخدم المُحال غير موجود في النظام';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referred user not found in system',
      'debug', v_debug_info
    );
  END IF;

  -- الحصول على بيانات المحيل الحالية
  SELECT * INTO v_referrer_record
  FROM users
  WHERE telegram_id = p_referrer_telegram_id;

  v_current_referral_count := COALESCE(v_referrer_record.referral_count, 0);
  
  RAISE NOTICE 'عدد الإحالات الحالي للمحيل: %', v_current_referral_count;
  
  -- إنشاء سجل الإحالة
  BEGIN
    INSERT INTO referrals (referrer_id, referred_id, status)
    VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
    RETURNING id INTO v_referral_id;
    
    RAISE NOTICE 'تم إنشاء سجل الإحالة بنجاح: %', v_referral_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في إنشاء سجل الإحالة: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error creating referral record: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  -- تحديث عدد الإحالات للمحيل
  BEGIN
    UPDATE users
    SET 
      referral_count = v_current_referral_count + 1,
      referral_tier = CASE 
        WHEN v_current_referral_count + 1 >= 50 THEN 'platinum'
        WHEN v_current_referral_count + 1 >= 25 THEN 'gold'
        WHEN v_current_referral_count + 1 >= 10 THEN 'silver'
        ELSE 'bronze'
      END
    WHERE telegram_id = p_referrer_telegram_id;
    
    RAISE NOTICE 'تم تحديث عدد الإحالات للمحيل: % -> %', v_current_referral_count, v_current_referral_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في تحديث عدد الإحالات: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error updating referral count: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  -- منح 30 نقطة للمحيل فوراً
  BEGIN
    PERFORM update_user_points(p_referrer_telegram_id, 30, 'successful_referral');
    RAISE NOTICE 'تم منح 30 نقطة للمحيل بنجاح';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في منح النقاط: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error awarding points: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  RAISE NOTICE 'تمت معالجة الإحالة بنجاح';
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id,
    'points_awarded', 30,
    'new_referral_count', v_current_referral_count + 1
  );
END;
$$;

-- تحديث وظيفة get_referral_stats_secure لعرض جميع الإحالات بشكل صحيح
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
  v_debug_info jsonb;
BEGIN
  -- تسجيل بداية العملية للتصحيح
  v_debug_info := jsonb_build_object(
    'function', 'get_referral_stats_secure',
    'telegram_id', p_telegram_id,
    'timestamp', now()
  );

  RAISE NOTICE 'بدء الحصول على إحصائيات الإحالة: %', v_debug_info;

  -- التحقق من وجود المستخدم
  IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = p_telegram_id) THEN
    RAISE NOTICE 'خطأ: المستخدم غير موجود';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found',
      'debug', v_debug_info
    );
  END IF;

  -- الحصول على إجمالي الإحالات
  SELECT COUNT(*) INTO v_total_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id;
  
  RAISE NOTICE 'إجمالي الإحالات: %', v_total_referrals;
  
  -- الحصول على الإحالات المؤكدة
  SELECT COUNT(*) INTO v_verified_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'verified';
  
  RAISE NOTICE 'الإحالات المؤكدة: %', v_verified_referrals;
  
  -- الحصول على الإحالات المعلقة
  SELECT COUNT(*) INTO v_pending_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'pending';
  
  RAISE NOTICE 'الإحالات المعلقة: %', v_pending_referrals;
  
  -- الحصول على إجمالي الدقائق المكتسبة من المطالبات
  SELECT COALESCE(SUM(minutes_claimed), 0) INTO v_total_minutes_earned
  FROM referral_claims
  WHERE claimer_telegram_id = p_telegram_id;
  
  RAISE NOTICE 'إجمالي الدقائق المكتسبة: %', v_total_minutes_earned;
  
  -- الحصول على مستوى الإحالة من المستخدم
  SELECT referral_tier INTO v_referral_tier
  FROM users
  WHERE telegram_id = p_telegram_id;
  
  RAISE NOTICE 'مستوى الإحالة: %', v_referral_tier;
  
  -- الحصول على جميع الإحالات مع المعلومات التفصيلية
  BEGIN
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
    
    RAISE NOTICE 'تم الحصول على % إحالة', jsonb_array_length(v_all_referrals);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في الحصول على الإحالات: %', SQLERRM;
      v_all_referrals := '[]'::jsonb;
  END;
  
  -- الحصول على الإحالات غير المطالب بها
  BEGIN
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
    
    RAISE NOTICE 'تم الحصول على % إحالة غير مطالب بها', jsonb_array_length(v_unclaimed_referrals);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في الحصول على الإحالات غير المطالب بها: %', SQLERRM;
      v_unclaimed_referrals := '[]'::jsonb;
  END;
  
  RAISE NOTICE 'تم الحصول على إحصائيات الإحالة بنجاح';
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

-- تحديث وظيفة claim_referral_reward_secure لتحسين عملية المطالبة بالمكافآت
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
  v_debug_info jsonb;
BEGIN
  -- تسجيل بداية العملية للتصحيح
  v_debug_info := jsonb_build_object(
    'function', 'claim_referral_reward_secure',
    'referral_id', p_referral_id,
    'claimer_telegram_id', p_claimer_telegram_id,
    'timestamp', now()
  );

  RAISE NOTICE 'بدء المطالبة بمكافأة الإحالة: %', v_debug_info;

  -- التحقق من عدم المطالبة بالمكافأة من قبل
  SELECT COUNT(*) INTO v_existing_claim_count
  FROM referral_claims
  WHERE referral_id = p_referral_id;
  
  IF v_existing_claim_count > 0 THEN
    RAISE NOTICE 'خطأ: تمت المطالبة بالمكافأة بالفعل';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Reward already claimed',
      'debug', v_debug_info
    );
  END IF;
  
  -- الحصول على تفاصيل الإحالة والتحقق من صحتها
  SELECT r.*, u.telegram_id as referrer_telegram_id
  INTO v_referral_record
  FROM referrals r
  JOIN users u ON u.telegram_id = r.referrer_id
  WHERE r.id = p_referral_id
    AND r.status = 'verified'
    AND r.referrer_id = p_claimer_telegram_id;
  
  IF v_referral_record IS NULL THEN
    RAISE NOTICE 'خطأ: إحالة غير صالحة أو غير مصرح بالمطالبة';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid referral or not authorized to claim',
      'debug', v_debug_info
    );
  END IF;
  
  -- تسجيل المطالبة
  BEGIN
    INSERT INTO referral_claims (referral_id, claimer_telegram_id, minutes_claimed)
    VALUES (p_referral_id, p_claimer_telegram_id, v_minutes_reward);
    
    RAISE NOTICE 'تم تسجيل المطالبة بنجاح';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في تسجيل المطالبة: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error recording claim: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  -- تحديث إجمالي الدقائق للمستخدم
  BEGIN
    UPDATE users
    SET total_minutes = total_minutes + v_minutes_reward
    WHERE telegram_id = p_claimer_telegram_id;
    
    RAISE NOTICE 'تم تحديث إجمالي الدقائق للمستخدم بنجاح';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في تحديث إجمالي الدقائق: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error updating total minutes: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  -- تحديد الإحالة كمطالب بها
  BEGIN
    UPDATE referrals
    SET reward_claimed = true
    WHERE id = p_referral_id;
    
    RAISE NOTICE 'تم تحديث حالة الإحالة بنجاح';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في تحديث حالة الإحالة: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error updating referral status: ' || SQLERRM,
        'debug', v_debug_info
      );
  END;
  
  RAISE NOTICE 'تمت المطالبة بمكافأة الإحالة بنجاح';
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward claimed successfully',
    'minutes_earned', v_minutes_reward
  );
END;
$$;

-- إضافة وظيفة لتصحيح عدد الإحالات للمستخدمين
CREATE OR REPLACE FUNCTION fix_referral_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_actual_count integer;
  v_current_count integer;
  v_users_updated integer := 0;
  v_total_users integer := 0;
BEGIN
  -- الحصول على إجمالي عدد المستخدمين
  SELECT COUNT(*) INTO v_total_users FROM users;
  
  -- معالجة كل مستخدم
  FOR v_user IN SELECT telegram_id, referral_count FROM users
  LOOP
    -- حساب العدد الفعلي للإحالات
    SELECT COUNT(*) INTO v_actual_count
    FROM referrals
    WHERE referrer_id = v_user.telegram_id AND status = 'verified';
    
    v_current_count := COALESCE(v_user.referral_count, 0);
    
    -- تحديث عدد الإحالات إذا كان مختلفاً
    IF v_current_count != v_actual_count THEN
      UPDATE users
      SET 
        referral_count = v_actual_count,
        referral_tier = CASE 
          WHEN v_actual_count >= 50 THEN 'platinum'
          WHEN v_actual_count >= 25 THEN 'gold'
          WHEN v_actual_count >= 10 THEN 'silver'
          ELSE 'bronze'
        END
      WHERE telegram_id = v_user.telegram_id;
      
      v_users_updated := v_users_updated + 1;
      
      RAISE NOTICE 'تم تحديث عدد الإحالات للمستخدم %: % -> %', 
        v_user.telegram_id, v_current_count, v_actual_count;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_users', v_total_users,
    'users_updated', v_users_updated,
    'message', 'Referral counts fixed successfully'
  );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_telegram_user(TEXT, UUID, TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats_secure(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward_secure(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_referral_counts() TO authenticated;

-- تصحيح عدد الإحالات للمستخدمين الحاليين
DO $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT fix_referral_counts() INTO v_result;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 تم تصحيح نظام الإحالات بنجاح!';
  RAISE NOTICE '✅ النتائج:';
  RAISE NOTICE '   - إجمالي المستخدمين: %', v_result->>'total_users';
  RAISE NOTICE '   - المستخدمين الذين تم تحديثهم: %', v_result->>'users_updated';
  RAISE NOTICE '';
  RAISE NOTICE '✅ التحسينات المطبقة:';
  RAISE NOTICE '   - تصحيح عدد الإحالات لجميع المستخدمين';
  RAISE NOTICE '   - تحسين تسجيل الأحداث والأخطاء';
  RAISE NOTICE '   - إصلاح مشكلة تحديث عدد الإحالات';
  RAISE NOTICE '   - تحسين عرض الإحالات في واجهة المستخدم';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ملاحظات إضافية:';
  RAISE NOTICE '   - تم إضافة تسجيل مفصل للأخطاء';
  RAISE NOTICE '   - تم تحسين التحقق من البيانات';
  RAISE NOTICE '   - تم إضافة معلومات تصحيح للمطورين';
END $$;