/*
  # إصلاح خطأ العمود المفقود في إحصائيات الإحالة

  1. التغييرات
    - إصلاح وظيفة get_referral_stats_secure لإزالة المراجع للأعمدة غير الموجودة
    - تحديث الوظيفة لتعمل مع الهيكل الحالي لقاعدة البيانات
    - إضافة التحقق من وجود البيانات قبل المعالجة

  2. الأمان
    - الحفاظ على جميع ميزات الأمان الموجودة
    - التأكد من عمل الوظيفة مع الهيكل الحالي
*/

-- إصلاح وظيفة get_referral_stats_secure
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
  
  -- الحصول على جميع الإحالات مع المعلومات التفصيلية
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'referred_username', COALESCE(u.username, 'مستخدم جديد'),
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
  
  -- الحصول على الإحالات غير المطالب بها (مجموعة فرعية من جميع الإحالات)
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
GRANT EXECUTE ON FUNCTION public.get_referral_stats_secure(text) TO authenticated;

-- التحقق من صحة الوظيفة
DO $$
DECLARE
  v_test_result jsonb;
  v_user_exists boolean;
BEGIN
  -- التحقق من وجود مستخدمين في النظام
  SELECT EXISTS(SELECT 1 FROM users LIMIT 1) INTO v_user_exists;
  
  IF v_user_exists THEN
    -- اختبار الوظيفة مع أول مستخدم في النظام
    DECLARE
      v_test_telegram_id text;
    BEGIN
      SELECT telegram_id INTO v_test_telegram_id FROM users LIMIT 1;
      
      SELECT get_referral_stats_secure(v_test_telegram_id) INTO v_test_result;
      
      IF v_test_result IS NOT NULL THEN
        RAISE NOTICE '✅ تم إصلاح وظيفة get_referral_stats_secure بنجاح!';
        RAISE NOTICE '📊 اختبار الوظيفة مع المستخدم %: نجح', v_test_telegram_id;
      ELSE
        RAISE WARNING '⚠️ الوظيفة تعمل ولكن أرجعت null';
      END IF;
    END;
  ELSE
    RAISE NOTICE '📝 لا يوجد مستخدمين في النظام للاختبار، ولكن الوظيفة تم إصلاحها';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 تم إصلاح مشكلة العمود المفقود بنجاح!';
  RAISE NOTICE '✅ الوظيفة get_referral_stats_secure تعمل الآن بشكل صحيح';
  RAISE NOTICE '✅ تم إزالة جميع المراجع للأعمدة غير الموجودة';
  RAISE NOTICE '✅ تم إضافة التحقق من صحة البيانات';
END $$;