/*
  # إصلاح نظام المهام وحل مشكلة Task not found

  1. التغييرات
    - إنشاء وظائف RPC للمطالبة بالمهام اليومية والثابتة
    - إضافة المهام الافتراضية بدون استخدام ON CONFLICT
    - منح الصلاحيات المطلوبة

  2. الأمان
    - التحقق من صحة البيانات
    - منع المطالبة المتكررة
    - حماية من التلاعب
*/

-- وظيفة المطالبة بالمهام اليومية
CREATE OR REPLACE FUNCTION public.claim_daily_task(
  p_user_telegram_id text,
  p_daily_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record record;
  v_already_claimed boolean;
  v_today date := CURRENT_DATE;
BEGIN
  -- التحقق من وجود المهمة وأنها نشطة
  SELECT id, title, points_reward, is_active
  INTO v_task_record
  FROM daily_tasks
  WHERE id = p_daily_task_id;

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

  -- التحقق من عدم المطالبة بالمهمة اليوم
  SELECT EXISTS(
    SELECT 1 FROM user_daily_tasks
    WHERE user_telegram_id = p_user_telegram_id 
    AND daily_task_id = p_daily_task_id
    AND completion_date = v_today
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Task already completed today'
    );
  END IF;

  -- تسجيل إكمال المهمة
  INSERT INTO user_daily_tasks (
    user_telegram_id,
    daily_task_id,
    points_earned,
    completion_date
  ) VALUES (
    p_user_telegram_id,
    p_daily_task_id,
    v_task_record.points_reward,
    v_today
  );

  -- منح النقاط
  PERFORM update_user_points(
    p_user_telegram_id, 
    v_task_record.points_reward, 
    'daily_task_completion'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task completed successfully',
    'points_earned', v_task_record.points_reward,
    'task_title', v_task_record.title
  );
END;
$$;

-- وظيفة المطالبة بالمهام الثابتة
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
  -- التحقق من وجود المهمة وأنها نشطة
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

  -- التحقق من عدم المطالبة بالمهمة من قبل
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

  -- تسجيل إكمال المهمة
  INSERT INTO user_fixed_tasks (
    user_telegram_id,
    fixed_task_id,
    points_earned
  ) VALUES (
    p_user_telegram_id,
    p_fixed_task_id,
    v_task_record.points_reward
  );

  -- منح النقاط
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

-- إدراج المهام الثابتة (6 مهام، 20 نقطة لكل مهمة) - بدون ON CONFLICT
DO $$
BEGIN
  -- المهمة الأولى: تيليجرام
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'انضم إلى قناة LYRA COIN على تيليجرام') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('انضم إلى قناة LYRA COIN على تيليجرام', 'اشترك في قناتنا الرسمية على تيليجرام للحصول على التحديثات والإعلانات', 20, 'telegram', 'fixed');
  END IF;

  -- المهمة الثانية: تويتر
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'تابع LYRA COIN على تويتر') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('تابع LYRA COIN على تويتر', 'تابع حسابنا الرسمي على تويتر للحصول على آخر الأخبار والتحديثات', 20, 'twitter', 'fixed');
  END IF;

  -- المهمة الثالثة: مشاركة اجتماعية
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'شارك LYRA COIN مع الأصدقاء') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('شارك LYRA COIN مع الأصدقاء', 'شارك LYRA COIN مع أصدقائك وساعد في نمو مجتمعنا', 20, 'social', 'fixed');
  END IF;

  -- المهمة الرابعة: فيسبوك
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'أعجب بصفحة LYRA COIN على فيسبوك') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('أعجب بصفحة LYRA COIN على فيسبوك', 'أعجب بصفحتنا الرسمية على فيسبوك للحصول على تحديثات المجتمع', 20, 'facebook', 'fixed');
  END IF;

  -- المهمة الخامسة: يوتيوب
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'اشترك في قناة LYRA COIN على يوتيوب') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('اشترك في قناة LYRA COIN على يوتيوب', 'اشترك في قناتنا على يوتيوب للحصول على محتوى الفيديو', 20, 'youtube', 'fixed');
  END IF;

  -- المهمة السادسة: انستغرام
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'تابع LYRA COIN على انستغرام') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('تابع LYRA COIN على انستغرام', 'تابع حسابنا على انستغرام للحصول على التحديثات المرئية', 20, 'instagram', 'fixed');
  END IF;
END $$;

-- إدراج المهام اليومية (10 مهام، 10 نقاط لكل مهمة) - بدون ON CONFLICT
DO $$
BEGIN
  -- المهمة اليومية الأولى
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'تسجيل الدخول اليومي على تيليجرام') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('تسجيل الدخول اليومي على تيليجرام', 'زر قناتنا على تيليجرام يومياً', 10, 'telegram', 'daily');
  END IF;

  -- المهمة اليومية الثانية
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'التفاعل اليومي على تويتر') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('التفاعل اليومي على تويتر', 'أعجب وأعد تغريد منشورنا اليومي', 10, 'twitter', 'daily');
  END IF;

  -- المهمة اليومية الثالثة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'التفاعل اليومي على فيسبوك') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('التفاعل اليومي على فيسبوك', 'تفاعل مع منشورنا على فيسبوك', 10, 'facebook', 'daily');
  END IF;

  -- المهمة اليومية الرابعة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'مشاهدة يومية على يوتيوب') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('مشاهدة يومية على يوتيوب', 'شاهد أحدث فيديو لنا على يوتيوب', 10, 'youtube', 'daily');
  END IF;

  -- المهمة اليومية الخامسة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'مشاهدة القصة اليومية على انستغرام') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('مشاهدة القصة اليومية على انستغرام', 'شاهد قصتنا على انستغرام', 10, 'instagram', 'daily');
  END IF;

  -- المهمة اليومية السادسة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'الدردشة اليومية في المجتمع') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('الدردشة اليومية في المجتمع', 'أرسل رسالة في دردشة مجتمعنا', 10, 'telegram', 'daily');
  END IF;

  -- المهمة اليومية السابعة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'فحص السعر اليومي') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('فحص السعر اليومي', 'تحقق من سعر LYRA COIN في تطبيقنا', 10, 'app', 'daily');
  END IF;

  -- المهمة اليومية الثامنة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'مشاركة الإحالة اليومية') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('مشاركة الإحالة اليومية', 'شارك رابط الإحالة الخاص بك مرة واحدة', 10, 'social', 'daily');
  END IF;

  -- المهمة اليومية التاسعة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'قراءة الأخبار اليومية') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('قراءة الأخبار اليومية', 'اقرأ تحديث أخبار العملات المشفرة اليومي', 10, 'app', 'daily');
  END IF;

  -- المهمة اليومية العاشرة
  IF NOT EXISTS (SELECT 1 FROM daily_tasks WHERE title = 'تحديث الملف الشخصي اليومي') THEN
    INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type) 
    VALUES ('تحديث الملف الشخصي اليومي', 'حدث معلومات ملفك الشخصي', 10, 'app', 'daily');
  END IF;
END $$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.claim_daily_task(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_fixed_task(text, uuid) TO authenticated;