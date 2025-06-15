/*
  # إزالة سياسة RLS الزائدة من جدول الإحالات

  1. التغييرات
    - إزالة سياسة RLS الزائدة "Users can insert referrals only for themselves"
    - هذه السياسة تتعارض مع وظائف RPC التي تستخدم SECURITY DEFINER
    
  2. الأمان
    - وظائف RPC مثل process_referral تتجاوز RLS بأمان
    - إزالة هذه السياسة ستسمح لوظائف RPC بالعمل بشكل صحيح
    - الأمان محفوظ من خلال منطق الوظائف نفسها
*/

-- إزالة سياسة RLS الزائدة من جدول public.referrals
DROP POLICY IF EXISTS "Users can insert referrals only for themselves" ON public.referrals;

-- التأكد من أن RLS ما زال مفعلاً للحماية
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- إضافة تعليق توضيحي
COMMENT ON TABLE public.referrals IS 'جدول الإحالات - يتم إدارة الإدراج من خلال وظائف RPC آمنة';