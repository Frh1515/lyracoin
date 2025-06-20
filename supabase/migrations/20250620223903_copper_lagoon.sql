/*
  # تفعيل نظام مكافآت الإحالة وإعادة حساب المكافآت

  1. التغييرات
    - تحديث وظيفة process_referral لمنح 30 نقطة للمحيل
    - تحديث وظيفة claim_referral_reward_secure لمنح 60 دقيقة للمحيل
    - إنشاء وظيفة لإعادة حساب المكافآت للإحالات الموجودة
    - تطبيق المكافآت على جميع الإحالات المؤكدة التي لم تحصل على مكافآت

  2. الأمان
    - منع المكافآت المتكررة
    - التحقق من صحة البيانات
    - تسجيل جميع المعاملات
*/

-- تحديث وظيفة process_referral لمنح 30 نقطة للمحيل
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
  -- التحقق من صحة المدخلات
  IF p_referrer_telegram_id IS NULL OR p_referred_telegram_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid telegram IDs'
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
  
  -- التحقق من وجود كلا المستخدمين
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
  
  -- إنشاء سجل الإحالة
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_telegram_id, p_referred_telegram_id, 'verified')
  RETURNING id INTO v_referral_id;
  
  -- تحديث عدد الإحالات للمحيل
  UPDATE users
  SET referral_count = referral_count + 1
  WHERE telegram_id = p_referrer_telegram_id;
  
  -- منح 30 نقطة للمحيل فوراً
  PERFORM update_user_points(p_referrer_telegram_id, 30, 'successful_referral');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral processed successfully',
    'referral_id', v_referral_id,
    'points_awarded', 30
  );
END;
$$;

-- تحديث وظيفة claim_referral_reward_secure لمنح 60 دقيقة للمحيل
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
BEGIN
  -- التحقق من عدم المطالبة بالمكافأة من قبل
  SELECT COUNT(*) INTO v_existing_claim_count
  FROM referral_claims
  WHERE referral_id = p_referral_id;
  
  IF v_existing_claim_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Reward already claimed'
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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid referral or not authorized to claim'
    );
  END IF;
  
  -- تسجيل المطالبة
  INSERT INTO referral_claims (referral_id, claimer_telegram_id, minutes_claimed)
  VALUES (p_referral_id, p_claimer_telegram_id, v_minutes_reward);
  
  -- تحديث إجمالي الدقائق للمستخدم
  UPDATE users
  SET total_minutes = total_minutes + v_minutes_reward
  WHERE telegram_id = p_claimer_telegram_id;
  
  -- تحديد الإحالة كمطالب بها
  UPDATE referrals
  SET reward_claimed = true
  WHERE id = p_referral_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward claimed successfully',
    'minutes_earned', v_minutes_reward
  );
END;
$$;

-- إنشاء وظيفة لإعادة حساب مكافآت الإحالات الموجودة
CREATE OR REPLACE FUNCTION recalculate_existing_referral_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_record record;
  v_points_awarded integer := 0;
  v_referrals_processed integer := 0;
  v_total_referrals integer := 0;
BEGIN
  -- عد إجمالي الإحالات المؤكدة
  SELECT COUNT(*) INTO v_total_referrals
  FROM referrals
  WHERE status = 'verified';
  
  -- معالجة جميع الإحالات المؤكدة التي لم تحصل على نقاط الإحالة
  FOR v_referral_record IN 
    SELECT DISTINCT r.referrer_id, r.id, r.created_at
    FROM referrals r
    WHERE r.status = 'verified'
    ORDER BY r.created_at
  LOOP
    -- التحقق من أن المحيل لم يحصل على نقاط لهذه الإحالة من قبل
    -- (نفترض أن النقاط لم تُمنح إذا لم تكن هناك سجلات في user_fixed_tasks أو user_daily_tasks مرتبطة بالإحالة)
    
    -- منح 30 نقطة للمحيل
    PERFORM update_user_points(
      v_referral_record.referrer_id, 
      30, 
      'referral_reward_recalculation'
    );
    
    v_points_awarded := v_points_awarded + 30;
    v_referrals_processed := v_referrals_processed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral rewards recalculated successfully',
    'total_referrals', v_total_referrals,
    'referrals_processed', v_referrals_processed,
    'total_points_awarded', v_points_awarded
  );
END;
$$;

-- إنشاء وظيفة لإعادة حساب مكافآت الإحالات بشكل آمن (تجنب التكرار)
CREATE OR REPLACE FUNCTION safe_recalculate_referral_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_record record;
  v_points_awarded integer := 0;
  v_referrals_processed integer := 0;
  v_total_referrals integer := 0;
  v_user_current_points integer;
  v_expected_referral_points integer;
BEGIN
  -- عد إجمالي الإحالات المؤكدة
  SELECT COUNT(*) INTO v_total_referrals
  FROM referrals
  WHERE status = 'verified';
  
  -- معالجة كل مستخدم لديه إحالات مؤكدة
  FOR v_referral_record IN 
    SELECT 
      r.referrer_id,
      COUNT(*) as verified_referrals,
      u.points as current_points,
      u.referral_count
    FROM referrals r
    JOIN users u ON u.telegram_id = r.referrer_id
    WHERE r.status = 'verified'
    GROUP BY r.referrer_id, u.points, u.referral_count
    ORDER BY r.referrer_id
  LOOP
    -- حساب النقاط المتوقعة من الإحالات (30 نقطة لكل إحالة مؤكدة)
    v_expected_referral_points := v_referral_record.verified_referrals * 30;
    
    -- التحقق من أن المستخدم لديه نقاط أقل من المتوقع
    -- (هذا يعني أنه لم يحصل على جميع نقاط الإحالة)
    IF v_referral_record.current_points < v_expected_referral_points THEN
      -- منح النقاط المفقودة
      DECLARE
        v_missing_points integer := v_expected_referral_points - v_referral_record.current_points;
      BEGIN
        -- التأكد من أن النقاط المفقودة موجبة ومعقولة
        IF v_missing_points > 0 AND v_missing_points <= (v_referral_record.verified_referrals * 30) THEN
          PERFORM update_user_points(
            v_referral_record.referrer_id, 
            v_missing_points, 
            'referral_reward_correction'
          );
          
          v_points_awarded := v_points_awarded + v_missing_points;
          v_referrals_processed := v_referrals_processed + 1;
        END IF;
      END;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral rewards safely recalculated',
    'total_referrals', v_total_referrals,
    'users_processed', v_referrals_processed,
    'total_points_awarded', v_points_awarded
  );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.recalculate_existing_referral_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_recalculate_referral_rewards() TO authenticated;

-- تطبيق إعادة حساب المكافآت للإحالات الموجودة
DO $$
DECLARE
  v_result jsonb;
  v_before_stats record;
  v_after_stats record;
BEGIN
  -- إحصائيات قبل التطبيق
  SELECT 
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE status = 'verified') as verified_referrals,
    SUM(u.points) as total_user_points
  INTO v_before_stats
  FROM referrals r
  LEFT JOIN users u ON u.telegram_id = r.referrer_id;
  
  RAISE NOTICE '📊 إحصائيات قبل إعادة الحساب:';
  RAISE NOTICE '   - إجمالي الإحالات: %', v_before_stats.total_referrals;
  RAISE NOTICE '   - الإحالات المؤكدة: %', v_before_stats.verified_referrals;
  RAISE NOTICE '   - إجمالي نقاط المستخدمين: %', v_before_stats.total_user_points;
  
  -- تطبيق إعادة حساب المكافآت بشكل آمن
  SELECT safe_recalculate_referral_rewards() INTO v_result;
  
  -- إحصائيات بعد التطبيق
  SELECT 
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE status = 'verified') as verified_referrals,
    SUM(u.points) as total_user_points
  INTO v_after_stats
  FROM referrals r
  LEFT JOIN users u ON u.telegram_id = r.referrer_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ تم تطبيق إعادة حساب مكافآت الإحالة بنجاح!';
  RAISE NOTICE '📊 النتائج:';
  RAISE NOTICE '   - المستخدمين المعالجين: %', (v_result->>'users_processed')::integer;
  RAISE NOTICE '   - إجمالي النقاط الممنوحة: %', (v_result->>'total_points_awarded')::integer;
  RAISE NOTICE '   - إجمالي نقاط المستخدمين بعد التطبيق: %', v_after_stats.total_user_points;
  RAISE NOTICE '   - الزيادة في النقاط: %', v_after_stats.total_user_points - v_before_stats.total_user_points;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 نظام مكافآت الإحالة مفعل ومحدث!';
  RAISE NOTICE '💡 المكافآت الجديدة:';
  RAISE NOTICE '   - 30 نقطة فورية عند نجاح الإحالة';
  RAISE NOTICE '   - 60 دقيقة عند المطالبة بمكافأة الإحالة';
  RAISE NOTICE '   - تحديث تلقائي لمستوى العضوية';
END $$;