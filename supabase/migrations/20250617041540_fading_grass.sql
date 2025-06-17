/*
  # إعادة تعيين قاعدة البيانات للمهام الثابتة

  1. التغييرات
    - حذف جميع المهام المكتملة للمستخدمين
    - إعادة تعيين النقاط والدقائق والمهام المنفذة لجميع المستخدمين إلى صفر
    - حذف جميع المهام الموجودة
    - إنشاء 6 مهام ثابتة فقط (واحدة لكل منصة)
    - دعم اللغة العربية والإنجليزية في نفس المهمة

  2. الأمان
    - الحفاظ على حسابات المستخدمين
    - إعادة تطبيق مكافآت التسجيل
    - التحقق من صحة البيانات
*/

-- حذف جميع المهام المكتملة للمستخدمين
DELETE FROM public.user_fixed_tasks;
DELETE FROM public.user_daily_tasks;
DELETE FROM public.game_sessions;
DELETE FROM public.referral_claims;

-- إعادة تعيين بيانات المستخدمين إلى صفر
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
('أعجب بصفحة LYRA COIN على فيسبوك | Like LYRA COIN Facebook Page', 
'أعجب بصفحتنا الرسمية على فيسبوك للحصول على آخر الأخبار والتحديثات | Like our official Facebook page for latest news and updates', 
20, 'facebook', 'fixed', true),

-- 2. تويتر
('تابع LYRA COIN على تويتر | Follow LYRA COIN on Twitter', 
'تابع حسابنا الرسمي على تويتر للحصول على آخر الأخبار والتحديثات السريعة | Follow our official Twitter account for latest news and quick updates', 
20, 'twitter', 'fixed', true),

-- 3. يوتيوب
('اشترك في قناة LYRA COIN على يوتيوب | Subscribe to LYRA COIN YouTube', 
'اشترك في قناتنا الرسمية على يوتيوب لمشاهدة محتوى الفيديو والتحديثات | Subscribe to our official YouTube channel for video content and updates', 
20, 'youtube', 'fixed', true),

-- 4. تيك توك
('تابع LYRA COIN على تيك توك | Follow LYRA COIN on TikTok', 
'تابع حسابنا الرسمي على تيك توك للحصول على محتوى ممتع ومقاطع فيديو قصيرة | Follow our official TikTok account for fun content and short videos', 
20, 'tiktok', 'fixed', true),

-- 5. انستغرام
('تابع LYRA COIN على انستغرام | Follow LYRA COIN on Instagram', 
'تابع حسابنا الرسمي على انستغرام للحصول على الصور والقصص المرئية | Follow our official Instagram account for photos and visual stories', 
20, 'instagram', 'fixed', true),

-- 6. تيليجرام
('انضم إلى قناة LYRA COIN على تيليجرام | Join LYRA COIN Telegram Channel', 
'انضم إلى قناتنا الرسمية على تيليجرام للحصول على التحديثات الفورية والإعلانات المهمة | Join our official Telegram channel for instant updates and important announcements', 
20, 'telegram', 'fixed', true);

-- التحقق النهائي من صحة البيانات
DO $$
DECLARE
    fixed_count integer;
    platforms_fixed text[];
    platform_counts jsonb;
    users_reset_count integer;
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
    
    -- التحقق من العدد الصحيح
    IF fixed_count != 6 THEN
        RAISE EXCEPTION 'خطأ: عدد المهام الثابتة يجب أن يكون 6، العدد الحالي: %', fixed_count;
    END IF;
    
    -- التحقق من وجود جميع المنصات المطلوبة
    IF NOT (platforms_fixed @> ARRAY['facebook', 'instagram', 'telegram', 'tiktok', 'twitter', 'youtube']) THEN
        RAISE EXCEPTION 'خطأ: المنصات المطلوبة غير مكتملة. المنصات الموجودة: %', platforms_fixed;
    END IF;
    
    -- التحقق من وجود مهمة واحدة فقط لكل منصة
    IF EXISTS (
        SELECT 1 FROM (
            SELECT platform, COUNT(*) as count 
            FROM fixed_tasks 
            WHERE is_active = true 
            GROUP BY platform 
            HAVING COUNT(*) > 1
        ) duplicate_platforms
    ) THEN
        RAISE EXCEPTION 'خطأ: يوجد أكثر من مهمة واحدة لبعض المنصات. عدد المهام لكل منصة: %', platform_counts;
    END IF;
    
    RAISE NOTICE '✅ تم بنجاح: % مهام ثابتة مع جميع المنصات المطلوبة', fixed_count;
    RAISE NOTICE '✅ المنصات: %', platforms_fixed;
    RAISE NOTICE '✅ عدد المهام لكل منصة: %', platform_counts;
    RAISE NOTICE '✅ تم إعادة تعيين بيانات % مستخدم بنجاح', users_reset_count;
    RAISE NOTICE '✅ جميع المهام تدعم اللغة العربية والإنجليزية';
END $$;

-- إعادة تطبيق مكافآت التسجيل للمستخدمين الموجودين
DO $$
DECLARE
    user_record record;
    bonus_applied_count integer := 0;
BEGIN
    FOR user_record IN 
        SELECT telegram_id FROM users WHERE registration_bonus_applied = false
    LOOP
        PERFORM apply_registration_bonus(user_record.telegram_id);
        bonus_applied_count := bonus_applied_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ تم إعادة تطبيق مكافآت التسجيل لـ % مستخدم', bonus_applied_count;
END $$;

-- تنظيف البيانات المتبقية
DELETE FROM public.presale_purchases;

RAISE NOTICE '🎉 تم إكمال إعادة تعيين قاعدة البيانات بنجاح!';
RAISE NOTICE '📋 النتائج النهائية:';
RAISE NOTICE '   - 6 مهام ثابتة (واحدة لكل منصة)';
RAISE NOTICE '   - دعم كامل للغة العربية والإنجليزية';
RAISE NOTICE '   - إعادة تعيين جميع بيانات المستخدمين';
RAISE NOTICE '   - إعادة تطبيق مكافآت التسجيل';
RAISE NOTICE '   - حذف جميع المهام المكتملة';