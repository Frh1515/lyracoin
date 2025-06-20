/*
  # تحديث المهام لدعم اللغتين العربية والإنجليزية

  1. التغييرات
    - تحديث عناوين وأوصاف المهام الثابتة لتحتوي على النصوص بكلا اللغتين
    - استخدام تنسيق "النص العربي | English Text"
    - الحفاظ على جميع البيانات الأخرى

  2. الأمان
    - عدم حذف أي مهام مكتملة
    - الحفاظ على معرفات المهام
    - تحديث النصوص فقط
*/

-- تحديث المهام الثابتة لتحتوي على النصوص بكلا اللغتين
UPDATE public.fixed_tasks SET
  title = CASE platform
    WHEN 'facebook' THEN 'أعجب بصفحة LYRA COIN على فيسبوك | Like LYRA COIN Facebook Page'
    WHEN 'twitter' THEN 'تابع LYRA COIN على تويتر | Follow LYRA COIN on Twitter'
    WHEN 'youtube' THEN 'اشترك في قناة LYRA COIN على يوتيوب | Subscribe to LYRA COIN YouTube'
    WHEN 'tiktok' THEN 'تابع LYRA COIN على تيك توك | Follow LYRA COIN on TikTok'
    WHEN 'instagram' THEN 'تابع LYRA COIN على انستغرام | Follow LYRA COIN on Instagram'
    WHEN 'telegram' THEN 'انضم إلى قناة LYRA COIN على تيليجرام | Join LYRA COIN Telegram Channel'
    ELSE title
  END,
  description = CASE platform
    WHEN 'facebook' THEN 'أعجب بصفحتنا الرسمية على فيسبوك للحصول على آخر الأخبار والتحديثات | Like our official Facebook page for latest news and updates'
    WHEN 'twitter' THEN 'تابع حسابنا الرسمي على تويتر للحصول على آخر الأخبار والتحديثات السريعة | Follow our official Twitter account for latest news and quick updates'
    WHEN 'youtube' THEN 'اشترك في قناتنا الرسمية على يوتيوب لمشاهدة محتوى الفيديو والتحديثات | Subscribe to our official YouTube channel for video content and updates'
    WHEN 'tiktok' THEN 'تابع حسابنا الرسمي على تيك توك للحصول على محتوى ممتع ومقاطع فيديو قصيرة | Follow our official TikTok account for fun content and short videos'
    WHEN 'instagram' THEN 'تابع حسابنا الرسمي على انستغرام للحصول على الصور والقصص المرئية | Follow our official Instagram account for photos and visual stories'
    WHEN 'telegram' THEN 'انضم إلى قناتنا الرسمية على تيليجرام للحصول على التحديثات الفورية والإعلانات المهمة | Join our official Telegram channel for instant updates and important announcements'
    ELSE description
  END
WHERE task_type = 'fixed' AND is_active = true;

-- إنشاء المهام اليومية مع دعم اللغتين (إذا لم تكن موجودة)
INSERT INTO public.daily_tasks (title, description, points_reward, platform, task_type, is_active) VALUES
-- 1. تيليجرام يومي
('زيارة يومية لقناة تيليجرام | Daily Telegram Visit', 'زر قناتنا على تيليجرام يومياً للحصول على التحديثات | Visit our Telegram channel daily for updates', 10, 'telegram', 'daily', true),

-- 2. تويتر يومي
('تفاعل يومي على تويتر | Daily Twitter Engagement', 'أعجب وأعد تغريد منشورنا اليومي على تويتر | Like and retweet our daily Twitter post', 10, 'twitter', 'daily', true),

-- 3. فيسبوك يومي
('تفاعل يومي على فيسبوك | Daily Facebook Interaction', 'تفاعل مع منشورنا اليومي على فيسبوك | Interact with our daily Facebook post', 10, 'facebook', 'daily', true),

-- 4. يوتيوب يومي
('مشاهدة يومية على يوتيوب | Daily YouTube Watch', 'شاهد أحدث فيديو لنا على يوتيوب | Watch our latest YouTube video', 10, 'youtube', 'daily', true),

-- 5. انستغرام يومي
('مشاهدة قصة انستغرام | Daily Instagram Story', 'شاهد قصتنا اليومية على انستغرام | Watch our daily Instagram story', 10, 'instagram', 'daily', true),

-- 6. تيك توك يومي
('مشاهدة يومية على تيك توك | Daily TikTok Watch', 'شاهد مقاطعنا الجديدة على تيك توك | Watch our new TikTok videos', 10, 'tiktok', 'daily', true),

-- 7. دردشة المجتمع
('دردشة يومية في المجتمع | Daily Community Chat', 'أرسل رسالة في دردشة المجتمع على تيليجرام | Send a message in our Telegram community chat', 10, 'telegram', 'daily', true),

-- 8. فحص السعر
('فحص السعر اليومي | Daily Price Check', 'تحقق من سعر LYRA COIN في التطبيق | Check LYRA COIN price in the app', 10, 'app', 'daily', true),

-- 9. مشاركة الإحالة
('مشاركة الإحالة اليومية | Daily Referral Share', 'شارك رابط الإحالة الخاص بك مرة واحدة يومياً | Share your referral link once daily', 10, 'social', 'daily', true),

-- 10. قراءة الأخبار
('قراءة الأخبار اليومية | Daily News Reading', 'اقرأ تحديث أخبار العملات المشفرة اليومي | Read daily crypto news update', 10, 'app', 'daily', true)

ON CONFLICT (title) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- التحقق من النتائج
DO $$
DECLARE
    fixed_count integer;
    daily_count integer;
    bilingual_fixed_count integer;
    bilingual_daily_count integer;
BEGIN
    -- عد المهام الثابتة
    SELECT COUNT(*) INTO fixed_count FROM fixed_tasks WHERE is_active = true;
    
    -- عد المهام اليومية
    SELECT COUNT(*) INTO daily_count FROM daily_tasks WHERE is_active = true;
    
    -- عد المهام الثابتة التي تحتوي على " | "
    SELECT COUNT(*) INTO bilingual_fixed_count 
    FROM fixed_tasks 
    WHERE is_active = true AND title LIKE '%|%';
    
    -- عد المهام اليومية التي تحتوي على " | "
    SELECT COUNT(*) INTO bilingual_daily_count 
    FROM daily_tasks 
    WHERE is_active = true AND title LIKE '%|%';
    
    RAISE NOTICE '✅ تم تحديث المهام بنجاح:';
    RAISE NOTICE '   - المهام الثابتة: % (منها % تدعم اللغتين)', fixed_count, bilingual_fixed_count;
    RAISE NOTICE '   - المهام اليومية: % (منها % تدعم اللغتين)', daily_count, bilingual_daily_count;
    
    IF bilingual_fixed_count = fixed_count AND bilingual_daily_count = daily_count THEN
        RAISE NOTICE '🎉 جميع المهام تدعم الآن اللغتين العربية والإنجليزية!';
    ELSE
        RAISE WARNING '⚠️ بعض المهام لا تدعم اللغتين بعد';
    END IF;
END $$;