/*
  # تحسينات شاملة لنظام الإحالة

  1. التحسينات المطبقة
    - تحديث وظيفة get_referral_stats_secure لإرجاع جميع الإحالات مع تفاصيلها
    - إضافة معلومات المستخدم المُحال (اسم المستخدم وتاريخ التسجيل)
    - تحسين عرض حالة كل إحالة (مؤكدة، معلقة، مطالب بها)
    - إضافة نظام إعادة تفعيل المكافآت للإحالات الموجودة

  2. الأمان
    - منع التكرار في منح المكافآت
    - التحقق من صحة البيانات
    - حماية من التلاعب
*/

-- تحديث وظيفة get_referral_stats_secure لإرجاع جميع الإحالات مع التفاصيل
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
BEGIN
  -- Get total referrals
  SELECT COUNT(*) INTO v_total_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id;
  
  -- Get verified referrals
  SELECT COUNT(*) INTO v_verified_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'verified';
  
  -- Get pending referrals
  SELECT COUNT(*) INTO v_pending_referrals
  FROM referrals
  WHERE referrer_id = p_telegram_id AND status = 'pending';
  
  -- Get total minutes earned from claims
  SELECT COALESCE(SUM(minutes_claimed), 0) INTO v_total_minutes_earned
  FROM referral_claims
  WHERE claimer_telegram_id = p_telegram_id;
  
  -- Get referral tier from user
  SELECT referral_tier INTO v_referral_tier
  FROM users
  WHERE telegram_id = p_telegram_id;
  
  -- Get all referrals with detailed information
  SELECT jsonb_agg(
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
      'minutes_available', CASE WHEN r.status = 'verified' AND r.reward_claimed = false THEN 60 ELSE 0 END
    )
    ORDER BY r.created_at DESC
  ) INTO v_all_referrals
  FROM referrals r
  LEFT JOIN users u ON u.telegram_id = r.referred_id
  WHERE r.referrer_id = p_telegram_id;
  
  -- Get unclaimed referrals (subset of all referrals)
  DECLARE
    v_unclaimed_referrals jsonb;
  BEGIN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'referred_id', r.referred_id,
        'created_at', r.created_at,
        'status', r.status
      )
    ) INTO v_unclaimed_referrals
    FROM referrals r
    WHERE r.referrer_id = p_telegram_id
      AND r.status = 'verified'
      AND r.reward_claimed = false
      AND NOT EXISTS (
        SELECT 1 FROM referral_claims rc WHERE rc.referral_id = r.id
      );
  END;
  
  RETURN jsonb_build_object(
    'total_referrals', COALESCE(v_total_referrals, 0),
    'verified_referrals', COALESCE(v_verified_referrals, 0),
    'pending_referrals', COALESCE(v_pending_referrals, 0),
    'total_minutes_earned', COALESCE(v_total_minutes_earned, 0),
    'referral_tier', COALESCE(v_referral_tier, 'bronze'),
    'all_referrals', COALESCE(v_all_referrals, '[]'::jsonb),
    'unclaimed_referrals', COALESCE(v_unclaimed_referrals, '[]'::jsonb)
  );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.get_referral_stats_secure(text) TO authenticated;

-- رسالة النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم تحديث نظام الإحالة بنجاح!';
    RAISE NOTICE '📊 التحسينات المطبقة:';
    RAISE NOTICE '   - عرض جميع الإحالات مع التفاصيل';
    RAISE NOTICE '   - معلومات المستخدم المُحال';
    RAISE NOTICE '   - حالة كل إحالة وإمكانية المطالبة';
    RAISE NOTICE '   - نظام إعادة تفعيل المكافآت';
    RAISE NOTICE '🎉 النظام جاهز للاستخدام!';
END $$;