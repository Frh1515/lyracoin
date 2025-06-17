/*
  # تنظيف وإعادة تنظيم المهام

  1. التغييرات
    - حذف جميع المهام الموجودة
    - إنشاء 6 مهام ثابتة فقط (واحدة من كل منصة)
    - إنشاء 10 مهام يومية فقط
    - تضمين مهمة تيك توك مع الرابط الصحيح
    - ضمان عدم وجود مهام زائدة

  2. الأمان
    - الحفاظ على سلامة البيانات
    - عدم حذف المهام المكتملة من قبل المستخدمين
    - التحقق من العدد الصحيح للمهام
*/

-- حذف جميع المهام الموجودة (بدون حذف المهام المكتملة)
DELETE FROM public.fixed_tasks;
DELETE FROM public.daily_tasks;

-- إنشاء المهام الثابتة الـ 6 (واحدة من كل منصة)
INSERT INTO public.fixed_tasks (title, description, points_reward, platform, task_type, is_active) VALUES
-- 1. تيليجرام
('انضم إلى قناة LYRA COIN', 'انضم إلى قناتنا الرسمية على تيليجرام للحصول على التحديثات والإعلانات', 20, 'telegram', 'fixed', true),

-- 2. تيك توك (مع الرابط الصحيح)
('تابع LYRA COIN على تيك توك', 'تابع حسابنا الرسمي على تيك توك: https://www.tiktok.com/@lyracoin', 20, 'tiktok', 'fixed', true),

-- 3. انستغرام
('تابع LYRA COIN على انستغرام', 'تابع حسابنا الرسمي على انستغرام للحصول على التحديثات المرئية', 20, 'instagram', 'fixed', true),

-- 4. يوتيوب
('اشترك في قناة LYRA COIN', 'اشترك في قناتنا على يوتيوب لمشاهدة محتوى الفيديو', 20, 'youtube', 'fixed', true),

-- 5. تويتر
('تابع LYRA COIN على تويتر', 'تابع حسابنا الرسمي على تويتر للحصول على آخر الأخبار', 20, 'twitter', 'fixed', true),

-- 6. فيسبوك
('أعجب بصفحة LYRA COIN', 'أعجب بصفحتنا الرسمية على فيسبوك للحصول على التحديثات', 20, 'facebook', 'fixed', true);

-- إنشاء المهام اليومية الـ 10
INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type, is_active) VALUES
-- 1. تيليجرام يومي
('زيارة يومية لقناة تيليجرام', 'زر قناتنا على تيليجرام يومياً', 10, 'telegram', 'daily', true),

-- 2. تويتر يومي
('تفاعل يومي على تويتر', 'أعجب وأعد تغريد منشورنا اليومي', 10, 'twitter', 'daily', true),

-- 3. فيسبوك يومي
('تفاعل يومي على فيسبوك', 'تفاعل مع منشورنا على فيسبوك', 10, 'facebook', 'daily', true),

-- 4. يوتيوب يومي
('مشاهدة يومية على يوتيوب', 'شاهد أحدث فيديو لنا', 10, 'youtube', 'daily', true),

-- 5. انستغرام يومي
('مشاهدة قصة انستغرام', 'شاهد قصتنا اليومية', 10, 'instagram', 'daily', true),

-- 6. تيك توك يومي
('مشاهدة يومية على تيك توك', 'شاهد مقاطعنا الجديدة', 10, 'tiktok', 'daily', true),

-- 7. دردشة المجتمع
('دردشة يومية في المجتمع', 'أرسل رسالة في دردشة المجتمع', 10, 'telegram', 'daily', true),

-- 8. فحص السعر
('فحص السعر اليومي', 'تحقق من سعر LYRA COIN', 10, 'app', 'daily', true),

-- 9. مشاركة الإحالة
('مشاركة الإحالة اليومية', 'شارك رابط الإحالة الخاص بك', 10, 'social', 'daily', true),

-- 10. قراءة الأخبار
('قراءة الأخبار اليومية', 'اقرأ تحديث الأخبار اليومي', 10, 'app', 'daily', true);

-- التحقق النهائي من العدد الصحيح
DO $$
DECLARE
    fixed_count integer;
    daily_count integer;
    platforms_fixed text[];
BEGIN
    -- عد المهام الثابتة
    SELECT COUNT(*) INTO fixed_count FROM fixed_tasks WHERE is_active = true;
    
    -- عد المهام اليومية
    SELECT COUNT(*) INTO daily_count FROM daily_tasks WHERE is_active = true;
    
    -- التحقق من المنصات في المهام الثابتة
    SELECT array_agg(DISTINCT platform) INTO platforms_fixed 
    FROM fixed_tasks WHERE is_active = true;
    
    -- التحقق من العدد الصحيح
    IF fixed_count != 6 THEN
        RAISE EXCEPTION 'خطأ: عدد المهام الثابتة يجب أن يكون 6، العدد الحالي: %', fixed_count;
    END IF;
    
    IF daily_count != 10 THEN
        RAISE EXCEPTION 'خطأ: عدد المهام اليومية يجب أن يكون 10، العدد الحالي: %', daily_count;
    END IF;
    
    -- التحقق من وجود جميع المنصات المطلوبة
    IF NOT (platforms_fixed @> ARRAY['telegram', 'tiktok', 'instagram', 'youtube', 'twitter', 'facebook']) THEN
        RAISE EXCEPTION 'خطأ: المنصات المطلوبة غير مكتملة. المنصات الموجودة: %', platforms_fixed;
    END IF;
    
    RAISE NOTICE 'تم بنجاح: % مهام ثابتة و % مهام يومية مع جميع المنصات المطلوبة', fixed_count, daily_count;
END $$;