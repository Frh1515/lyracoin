/*
  # إضافة مهمة TikTok وتحديث المهام الموجودة

  1. التغييرات
    - إضافة مهمة TikTok جديدة للمهام الثابتة
    - تحديث مهمة "شارك LYRA COIN مع الأصدقاء" لتصبح مهمة TikTok
    - إضافة رابط TikTok الصحيح

  2. الأمان
    - استخدام DO blocks لتجنب التضارب
    - التحقق من وجود المهام قبل الإدراج
*/

-- تحديث مهمة "شارك LYRA COIN مع الأصدقاء" لتصبح مهمة TikTok
UPDATE public.fixed_tasks 
SET 
  title = 'تابع LYRA COIN على تيك توك',
  description = 'تابع حسابنا الرسمي على تيك توك للحصول على محتوى ممتع ومقاطع فيديو قصيرة',
  platform = 'tiktok'
WHERE title = 'شارك LYRA COIN مع الأصدقاء' AND platform = 'social';

-- إضافة مهمة جديدة لمشاركة LYRA COIN مع الأصدقاء
DO $$
BEGIN
  -- التحقق من عدم وجود مهمة مشاركة جديدة
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE title = 'شارك LYRA COIN في مجموعات التيليجرام') THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES (
      'شارك LYRA COIN في مجموعات التيليجرام', 
      'شارك معلومات LYRA COIN في مجموعات التيليجرام وساعد في نشر الوعي بالمشروع', 
      20, 
      'telegram', 
      'fixed'
    );
  END IF;
END $$;

-- التأكد من وجود جميع المهام المطلوبة مع المنصات الصحيحة
DO $$
BEGIN
  -- مهمة يوتيوب
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE platform = 'youtube' AND is_active = true) THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES (
      'اشترك في قناة LYRA COIN على يوتيوب', 
      'اشترك في قناتنا الرسمية على يوتيوب لمشاهدة محتوى الفيديو والتحديثات', 
      20, 
      'youtube', 
      'fixed'
    );
  END IF;

  -- مهمة فيسبوك
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE platform = 'facebook' AND is_active = true) THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES (
      'أعجب بصفحة LYRA COIN على فيسبوك', 
      'أعجب بصفحتنا الرسمية على فيسبوك للحصول على آخر الأخبار والتحديثات', 
      20, 
      'facebook', 
      'fixed'
    );
  END IF;

  -- مهمة تيليجرام
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE platform = 'telegram' AND title LIKE '%قناة%' AND is_active = true) THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES (
      'انضم إلى قناة LYRA COIN على تيليجرام', 
      'انضم إلى قناتنا الرسمية على تيليجرام للحصول على التحديثات الفورية والإعلانات المهمة', 
      20, 
      'telegram', 
      'fixed'
    );
  END IF;

  -- مهمة انستغرام
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE platform = 'instagram' AND is_active = true) THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES (
      'تابع LYRA COIN على انستغرام', 
      'تابع حسابنا الرسمي على انستغرام للحصول على الصور والقصص المرئية', 
      20, 
      'instagram', 
      'fixed'
    );
  END IF;

  -- مهمة تويتر
  IF NOT EXISTS (SELECT 1 FROM fixed_tasks WHERE platform = 'twitter' AND is_active = true) THEN
    INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type) 
    VALUES (
      'تابع LYRA COIN على تويتر', 
      'تابع حسابنا الرسمي على تويتر للحصول على آخر الأخبار والتحديثات السريعة', 
      20, 
      'twitter', 
      'fixed'
    );
  END IF;
END $$;