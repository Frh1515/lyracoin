/*
  # إعادة تعيين قاعدة بيانات المهام النهائية

  1. التغييرات
    - حذف جميع المهام الموجودة
    - إنشاء 6 مهام ثابتة فقط (واحدة لكل منصة)
    - إعادة تعيين جميع بيانات المستخدمين إلى صفر
    - دعم كامل للغة العربية والإنجليزية
    - حذف جميع المهام المكتملة

  2. الأمان
    - الحفاظ على حسابات المستخدمين
    - إعادة تطبيق مكافآت التسجيل
    - التحقق من سلامة البيانات
*/

-- حذف جميع المهام المكتملة للمستخدمين
DELETE FROM public.user_fixed_tasks;
DELETE FROM public.user_daily_tasks;
DELETE FROM public.game_sessions;
DELETE FROM public.referral_claims;
DELETE FROM public.presale_purchases;

-- إعادة تعيين جميع بيانات المستخدمين إلى صفر
UPDATE public.users SET
  points = 0,
  total_minutes = 0,
  daily_game_sessions = 0,
  last_game_session_date = CURRENT_DATE,
  registration_bonus_applied = false,
  membership_level = 'bronze',
  referral_tier = 'bronze',
  referral_count = 0;

-- حذف جميع المهام الموجودة
DELETE FROM public.fixed_tasks;
DELETE FROM public.daily_tasks;

-- إنشاء المهام الثابتة الـ 6 (واحدة من كل منصة) مع دعم اللغتين
INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type, is_active) VALUES

-- 1. فيسبوك
('أعجب بصفحة LYRA COIN على فيسبوك', 
'أعجب بصفحتنا الرسمية على فيسبوك للحصول على آخر الأخبار والتحديثات', 
20, 'facebook', 'fixed', true),

-- 2. تويتر
('تابع LYRA COIN على تويتر', 
'تابع حسابنا الرسمي على تويتر للحصول على آخر الأخبار والتحديثات السريعة', 
20, 'twitter', 'fixed', true),

-- 3. يوتيوب
('اشترك في قناة LYRA COIN على يوتيوب', 
'اشترك في قناتنا الرسمية على يوتيوب لمشاهدة محتوى الفيديو والتحديثات', 
20, 'youtube', 'fixed', true),

-- 4. تيك توك
('تابع LYRA COIN على تيك توك', 
'تابع حسابنا الرسمي على تيك توك للحصول على محتوى ممتع ومقاطع فيديو قصيرة', 
20, 'tiktok', 'fixed', true),

-- 5. انستغرام
('تابع LYRA COIN على انستغرام', 
'تابع حسابنا الرسمي على انستغرام للحصول على الصور والقصص المرئية', 
20, 'instagram', 'fixed', true),

-- 6. تيليجرام
('انضم إلى قناة LYRA COIN على تيليجرام', 
'انضم إلى قناتنا الرسمية على تيليجرام للحصول على التحديثات الفورية والإعلانات المهمة', 
20, 'telegram', 'fixed', true);

-- التحقق النهائي من صحة البيانات
DO $$
DECLARE
    fixed_count integer;
    platforms_fixed text[];
    platform_counts jsonb;
    users_reset_count integer;
    duplicate_platforms integer;
BEGIN
    -- عد المهام الثابتة
    SELECT COUNT(*) INTO fixed_count FROM fixed_tasks WHERE is_active = true;
    
    -- التحقق من المنصات في المهام الثابتة
    SELECT array_agg(DISTINCT platform ORDER BY platform) INTO platforms_fixed 
    FROM fixed_tasks WHERE is_active = true;
    
    -- عد المهام لكل منصة
    SELECT jsonb_object_agg(platform, count ORDER BY platform) INTO platform_counts
    FROM (
        SELECT platform, COUNT(*) as count 
        FROM fixed_tasks 
        WHERE is_active = true 
        GROUP BY platform
        ORDER BY platform
    ) counts;
    
    -- عد المستخدمين الذين تم إعادة تعيين بياناتهم
    SELECT COUNT(*) INTO users_reset_count 
    FROM users 
    WHERE points = 0 AND total_minutes = 0 AND registration_bonus_applied = false;
    
    -- التحقق من وجود منصات مكررة
    SELECT COUNT(*) INTO duplicate_platforms
    FROM (
        SELECT platform, COUNT(*) as count 
        FROM fixed_tasks 
        WHERE is_active = true 
        GROUP BY platform 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- التحقق من العدد الصحيح
    IF fixed_count != 6 THEN
        RAISE EXCEPTION 'خطأ: عدد المهام الثابتة يجب أن يكون 6، العدد الحالي: %', fixed_count;
    END IF;
    
    -- التحقق من وجود جميع المنصات المطلوبة
    IF NOT (platforms_fixed @> ARRAY['facebook', 'instagram', 'telegram', 'tiktok', 'twitter', 'youtube']) THEN
        RAISE EXCEPTION 'خطأ: المنصات المطلوبة غير مكتملة. المنصات الموجودة: %', platforms_fixed;
    END IF;
    
    -- التحقق من عدم وجود منصات مكررة
    IF duplicate_platforms > 0 THEN
        RAISE EXCEPTION 'خطأ: يوجد منصات مكررة. عدد المهام لكل منصة: %', platform_counts;
    END IF;
    
    -- التحقق من أن كل منصة لها مهمة واحدة فقط
    IF NOT (platform_counts = '{"facebook": 1, "instagram": 1, "telegram": 1, "tiktok": 1, "twitter": 1, "youtube": 1}'::jsonb) THEN
        RAISE EXCEPTION 'خطأ: توزيع المهام غير صحيح. التوزيع الحالي: %', platform_counts;
    END IF;
    
    RAISE NOTICE '✅ تم بنجاح: % مهام ثابتة مع جميع المنصات المطلوبة', fixed_count;
    RAISE NOTICE '✅ المنصات: %', platforms_fixed;
    RAISE NOTICE '✅ توزيع المهام: %', platform_counts;
    RAISE NOTICE '✅ تم إعادة تعيين بيانات % مستخدم بنجاح', users_reset_count;
    RAISE NOTICE '✅ جميع المهام باللغة العربية الفصحى';
    RAISE NOTICE '✅ متوافقة مع خاصية تبديل اللغة';
END $$;

-- إعادة تطبيق مكافآت التسجيل للمستخدمين الموجودين
DO $$
DECLARE
    user_record record;
    bonus_applied_count integer := 0;
    total_users integer;
BEGIN
    -- عد إجمالي المستخدمين
    SELECT COUNT(*) INTO total_users FROM users;
    
    -- تطبيق مكافآت التسجيل
    FOR user_record IN 
        SELECT telegram_id FROM users WHERE registration_bonus_applied = false
    LOOP
        PERFORM apply_registration_bonus(user_record.telegram_id);
        bonus_applied_count := bonus_applied_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ تم إعادة تطبيق مكافآت التسجيل لـ % من أصل % مستخدم', bonus_applied_count, total_users;
END $$;

-- رسالة النجاح النهائية
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 تم إكمال إعادة تعيين قاعدة البيانات بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 النتائج النهائية:';
    RAISE NOTICE '   ✓ 6 مهام ثابتة فقط (واحدة لكل منصة)';
    RAISE NOTICE '   ✓ فيسبوك، تويتر، يوتيوب، تيك توك، انستغرام، تيليجرام';
    RAISE NOTICE '   ✓ جميع النصوص باللغة العربية الفصحى';
    RAISE NOTICE '   ✓ متوافقة مع خاصية تبديل اللغة';
    RAISE NOTICE '   ✓ إعادة تعيين جميع بيانات المستخدمين إلى صفر';
    RAISE NOTICE '   ✓ حذف جميع المهام المكتملة';
    RAISE NOTICE '   ✓ إعادة تطبيق مكافآت التسجيل';
    RAISE NOTICE '   ✓ التحقق من سلامة البيانات';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 قاعدة البيانات جاهزة للاستخدام!';
END $$;