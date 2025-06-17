/*
  # إعادة تعيين المهام وبيانات المستخدمين

  1. التغييرات
    - حذف جميع المهام الموجودة
    - إنشاء 6 مهام ثابتة فقط (واحدة من كل منصة)
    - إعادة تعيين بيانات المستخدمين (النقاط والدقائق والمهام المكتملة)
    - دعم اللغة العربية والإنجليزية في عناوين المهام

  2. الأمان
    - الحفاظ على هيكل قاعدة البيانات
    - إعادة تعيين آمنة للبيانات
    - عدم حذف حسابات المستخدمين
*/

-- حذف جميع المهام المكتملة للمستخدمين
DELETE FROM public.user_fixed_tasks;
DELETE FROM public.user_daily_tasks;
DELETE FROM public.game_sessions;
DELETE FROM public.referral_claims;

-- إعادة تعيين بيانات المستخدمين
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

-- إنشاء المهام الثابتة الـ 6 (واحدة من كل منصة)
INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type, is_active) VALUES
-- 1. تيليجرام
('Join LYRA COIN Telegram Channel | انضم إلى قناة LYRA COIN', 'Subscribe to our official Telegram channel for updates | اشترك في قناتنا الرسمية على تيليجرام للحصول على التحديثات', 20, 'telegram', 'fixed', true),

-- 2. تيك توك
('Follow LYRA COIN on TikTok | تابع LYRA COIN على تيك توك', 'Follow our official TikTok account for fun content | تابع حسابنا الرسمي على تيك توك للمحتوى الممتع', 20, 'tiktok', 'fixed', true),

-- 3. انستغرام
('Follow LYRA COIN on Instagram | تابع LYRA COIN على انستغرام', 'Follow our official Instagram account for visual updates | تابع حسابنا الرسمي على انستغرام للتحديثات المرئية', 20, 'instagram', 'fixed', true),

-- 4. يوتيوب
('Subscribe to LYRA COIN YouTube | اشترك في قناة LYRA COIN', 'Subscribe to our YouTube channel for video content | اشترك في قناتنا على يوتيوب لمحتوى الفيديو', 20, 'youtube', 'fixed', true),

-- 5. تويتر
('Follow LYRA COIN on Twitter | تابع LYRA COIN على تويتر', 'Follow our official Twitter account for news | تابع حسابنا الرسمي على تويتر للأخبار', 20, 'twitter', 'fixed', true),

-- 6. فيسبوك
('Like LYRA COIN Facebook Page | أعجب بصفحة LYRA COIN', 'Like our official Facebook page for updates | أعجب بصفحتنا الرسمية على فيسبوك للتحديثات', 20, 'facebook', 'fixed', true);

-- التحقق النهائي من العدد الصحيح
DO $$
DECLARE
    fixed_count integer;
    platforms_fixed text[];
    platform_counts jsonb;
BEGIN
    -- عد المهام الثابتة
    SELECT COUNT(*) INTO fixed_count FROM fixed_tasks WHERE is_active = true;
    
    -- التحقق من المنصات في المهام الثابتة
    SELECT array_agg(DISTINCT platform) INTO platforms_fixed 
    FROM fixed_tasks WHERE is_active = true;
    
    -- عد المهام لكل منصة
    SELECT jsonb_object_agg(platform, count) INTO platform_counts
    FROM (
        SELECT platform, COUNT(*) as count 
        FROM fixed_tasks 
        WHERE is_active = true 
        GROUP BY platform
    ) counts;
    
    -- التحقق من العدد الصحيح
    IF fixed_count != 6 THEN
        RAISE EXCEPTION 'خطأ: عدد المهام الثابتة يجب أن يكون 6، العدد الحالي: %', fixed_count;
    END IF;
    
    -- التحقق من وجود جميع المنصات المطلوبة
    IF NOT (platforms_fixed @> ARRAY['telegram', 'tiktok', 'instagram', 'youtube', 'twitter', 'facebook']) THEN
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
    
    RAISE NOTICE 'تم بنجاح: % مهام ثابتة مع جميع المنصات المطلوبة (واحدة لكل منصة)', fixed_count;
    RAISE NOTICE 'المنصات: %', platforms_fixed;
    RAISE NOTICE 'عدد المهام لكل منصة: %', platform_counts;
    RAISE NOTICE 'تم إعادة تعيين بيانات جميع المستخدمين بنجاح';
END $$;

-- إعادة تطبيق مكافآت التسجيل للمستخدمين الموجودين
DO $$
DECLARE
    user_record record;
BEGIN
    FOR user_record IN 
        SELECT telegram_id FROM users WHERE registration_bonus_applied = false
    LOOP
        PERFORM apply_registration_bonus(user_record.telegram_id);
    END LOOP;
    
    RAISE NOTICE 'تم إعادة تطبيق مكافآت التسجيل لجميع المستخدمين';
END $$;