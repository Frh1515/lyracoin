/*
  # نظام المهام المدفوعة مع التحقق من الدفع

  1. جداول جديدة
    - `paid_tasks` - المهام المدفوعة
    - `task_payments` - سجل المدفوعات
    - `payment_verifications` - التحقق من المعاملات

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للمستخدمين والإدارة

  3. وظائف
    - إنشاء مهمة مدفوعة
    - التحقق من الدفع
    - نشر المهمة بعد التحقق
*/

-- جدول المهام المدفوعة
CREATE TABLE IF NOT EXISTS paid_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL REFERENCES users(telegram_id),
  title text NOT NULL,
  description text,
  link text NOT NULL,
  platform text NOT NULL,
  total_clicks integer NOT NULL,
  completed_clicks integer DEFAULT 0,
  target_community text NOT NULL,
  price_paid numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('lyra', 'ton')),
  status text DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_verified', 'active', 'paused', 'completed', 'cancelled')),
  payment_verified boolean DEFAULT false,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول سجل المدفوعات
CREATE TABLE IF NOT EXISTS task_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES paid_tasks(id) ON DELETE CASCADE,
  user_telegram_id text NOT NULL REFERENCES users(telegram_id),
  payment_method text NOT NULL CHECK (payment_method IN ('lyra', 'ton')),
  amount_paid numeric NOT NULL,
  currency text NOT NULL CHECK (currency IN ('LYRA', 'TON')),
  transaction_hash text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired')),
  verified_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

-- جدول التحقق من المعاملات
CREATE TABLE IF NOT EXISTS payment_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES task_payments(id) ON DELETE CASCADE,
  transaction_hash text NOT NULL,
  blockchain_network text DEFAULT 'TON',
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'not_found')),
  verification_attempts integer DEFAULT 0,
  last_verification_attempt timestamptz,
  verified_amount numeric,
  verified_at timestamptz,
  admin_verified boolean DEFAULT false,
  admin_verified_by text,
  admin_verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_paid_tasks_user ON paid_tasks(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_paid_tasks_status ON paid_tasks(status);
CREATE INDEX IF NOT EXISTS idx_paid_tasks_community ON paid_tasks(target_community);
CREATE INDEX IF NOT EXISTS idx_paid_tasks_created ON paid_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_payments_task ON task_payments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_payments_status ON task_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_task_payments_expires ON task_payments(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_hash ON payment_verifications(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_status ON payment_verifications(verification_status);

-- تفعيل RLS
ALTER TABLE paid_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للمهام المدفوعة
CREATE POLICY "Users can read their own paid tasks"
  ON paid_tasks
  FOR SELECT
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own paid tasks"
  ON paid_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own paid tasks"
  ON paid_tasks
  FOR UPDATE
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- سياسات RLS للمدفوعات
CREATE POLICY "Users can read their own payments"
  ON task_payments
  FOR SELECT
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own payments"
  ON task_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- سياسات RLS للتحقق من المعاملات
CREATE POLICY "Users can read their payment verifications"
  ON payment_verifications
  FOR SELECT
  TO authenticated
  USING (payment_id IN (
    SELECT id FROM task_payments WHERE user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  ));

-- وظيفة إنشاء مهمة مدفوعة
CREATE OR REPLACE FUNCTION create_paid_task(
  p_user_telegram_id text,
  p_title text,
  p_description text,
  p_link text,
  p_platform text,
  p_total_clicks integer,
  p_target_community text,
  p_price numeric,
  p_payment_method text
)
RETURNS TABLE(
  success boolean,
  message text,
  task_id uuid,
  payment_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
  v_payment_id uuid;
  v_user_balance numeric;
  v_expires_at timestamptz;
BEGIN
  -- التحقق من صحة البيانات
  IF p_link IS NULL OR NOT p_link LIKE 'https://%' THEN
    RETURN QUERY SELECT false, 'Invalid link format', null::uuid, null::uuid;
    RETURN;
  END IF;

  IF p_total_clicks NOT IN (500, 1000, 2000, 5000, 10000) THEN
    RETURN QUERY SELECT false, 'Invalid clicks amount', null::uuid, null::uuid;
    RETURN;
  END IF;

  IF p_target_community NOT IN ('AR', 'EN', 'RU', 'FR', 'FA', 'ID', 'ES', 'UZ') THEN
    RETURN QUERY SELECT false, 'Invalid community selection', null::uuid, null::uuid;
    RETURN;
  END IF;

  IF p_payment_method NOT IN ('lyra', 'ton') THEN
    RETURN QUERY SELECT false, 'Invalid payment method', null::uuid, null::uuid;
    RETURN;
  END IF;

  -- إذا كان الدفع بـ LYRA، التحقق من الرصيد
  IF p_payment_method = 'lyra' THEN
    SELECT lyra_balance INTO v_user_balance
    FROM users
    WHERE telegram_id = p_user_telegram_id;

    IF v_user_balance IS NULL THEN
      RETURN QUERY SELECT false, 'User not found', null::uuid, null::uuid;
      RETURN;
    END IF;

    IF v_user_balance < p_price THEN
      RETURN QUERY SELECT false, 'Insufficient LYRA balance', null::uuid, null::uuid;
      RETURN;
    END IF;
  END IF;

  -- تحديد وقت انتهاء الصلاحية
  v_expires_at := now() + interval '10 minutes';

  -- إنشاء المهمة
  INSERT INTO paid_tasks (
    user_telegram_id,
    title,
    description,
    link,
    platform,
    total_clicks,
    target_community,
    price_paid,
    payment_method,
    status,
    expires_at
  ) VALUES (
    p_user_telegram_id,
    p_title,
    p_description,
    p_link,
    p_platform,
    p_total_clicks,
    p_target_community,
    p_price,
    p_payment_method,
    'pending_payment',
    v_expires_at
  ) RETURNING id INTO v_task_id;

  -- إنشاء سجل الدفع
  INSERT INTO task_payments (
    task_id,
    user_telegram_id,
    payment_method,
    amount_paid,
    currency,
    expires_at
  ) VALUES (
    v_task_id,
    p_user_telegram_id,
    p_payment_method,
    p_price,
    CASE WHEN p_payment_method = 'lyra' THEN 'LYRA' ELSE 'TON' END,
    v_expires_at
  ) RETURNING id INTO v_payment_id;

  RETURN QUERY SELECT true, 'Task created successfully', v_task_id, v_payment_id;
END;
$$;

-- وظيفة معالجة الدفع بـ LYRA
CREATE OR REPLACE FUNCTION process_lyra_payment(
  p_payment_id uuid,
  p_user_telegram_id text
)
RETURNS TABLE(
  success boolean,
  message text,
  task_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_record record;
  v_user_balance numeric;
  v_task_id uuid;
BEGIN
  -- الحصول على تفاصيل الدفع
  SELECT tp.*, pt.id as task_id, pt.price_paid
  INTO v_payment_record
  FROM task_payments tp
  JOIN paid_tasks pt ON tp.task_id = pt.id
  WHERE tp.id = p_payment_id
    AND tp.user_telegram_id = p_user_telegram_id
    AND tp.payment_status = 'pending'
    AND tp.expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Payment not found or expired', null::uuid;
    RETURN;
  END IF;

  -- التحقق من رصيد المستخدم
  SELECT lyra_balance INTO v_user_balance
  FROM users
  WHERE telegram_id = p_user_telegram_id;

  IF v_user_balance < v_payment_record.amount_paid THEN
    RETURN QUERY SELECT false, 'Insufficient LYRA balance', null::uuid;
    RETURN;
  END IF;

  -- خصم المبلغ من رصيد المستخدم
  UPDATE users
  SET lyra_balance = lyra_balance - v_payment_record.amount_paid
  WHERE telegram_id = p_user_telegram_id;

  -- تحديث حالة الدفع
  UPDATE task_payments
  SET payment_status = 'completed',
      verified_at = now()
  WHERE id = p_payment_id;

  -- تحديث حالة المهمة
  UPDATE paid_tasks
  SET status = 'payment_verified',
      payment_verified = true,
      published_at = now()
  WHERE id = v_payment_record.task_id;

  RETURN QUERY SELECT true, 'Payment processed successfully', v_payment_record.task_id;
END;
$$;

-- وظيفة بدء التحقق من معاملة TON
CREATE OR REPLACE FUNCTION initiate_ton_verification(
  p_payment_id uuid,
  p_transaction_hash text,
  p_user_telegram_id text
)
RETURNS TABLE(
  success boolean,
  message text,
  verification_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_record record;
  v_verification_id uuid;
BEGIN
  -- التحقق من وجود الدفع
  SELECT tp.*, pt.price_paid
  INTO v_payment_record
  FROM task_payments tp
  JOIN paid_tasks pt ON tp.task_id = pt.id
  WHERE tp.id = p_payment_id
    AND tp.user_telegram_id = p_user_telegram_id
    AND tp.payment_status = 'pending'
    AND tp.expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Payment not found or expired', null::uuid;
    RETURN;
  END IF;

  -- التحقق من صحة hash المعاملة
  IF p_transaction_hash IS NULL OR length(p_transaction_hash) < 10 THEN
    RETURN QUERY SELECT false, 'Invalid transaction hash', null::uuid;
    RETURN;
  END IF;

  -- تحديث hash المعاملة في سجل الدفع
  UPDATE task_payments
  SET transaction_hash = p_transaction_hash
  WHERE id = p_payment_id;

  -- إنشاء سجل التحقق
  INSERT INTO payment_verifications (
    payment_id,
    transaction_hash,
    verification_status,
    verification_attempts,
    last_verification_attempt
  ) VALUES (
    p_payment_id,
    p_transaction_hash,
    'pending',
    1,
    now()
  ) RETURNING id INTO v_verification_id;

  RETURN QUERY SELECT true, 'Verification initiated', v_verification_id;
END;
$$;

-- وظيفة التحقق من معاملة TON (محاكاة)
CREATE OR REPLACE FUNCTION verify_ton_transaction(
  p_verification_id uuid,
  p_expected_amount numeric
)
RETURNS TABLE(
  success boolean,
  message text,
  verified boolean,
  amount_verified numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_verification_record record;
  v_payment_record record;
  v_is_verified boolean := false;
  v_verified_amount numeric := 0;
BEGIN
  -- الحصول على تفاصيل التحقق
  SELECT pv.*, tp.amount_paid, tp.task_id
  INTO v_verification_record
  FROM payment_verifications pv
  JOIN task_payments tp ON pv.payment_id = tp.id
  WHERE pv.id = p_verification_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Verification record not found', false, 0::numeric;
    RETURN;
  END IF;

  -- محاكاة التحقق من البلوكشين
  -- في التطبيق الحقيقي، هنا سيتم استدعاء API للتحقق من المعاملة
  
  -- للمحاكاة: نعتبر المعاملة صحيحة إذا كان hash يحتوي على "verified"
  IF v_verification_record.transaction_hash LIKE '%verified%' THEN
    v_is_verified := true;
    v_verified_amount := p_expected_amount;
  ELSE
    -- محاكاة فشل التحقق
    v_is_verified := false;
    v_verified_amount := 0;
  END IF;

  -- تحديث سجل التحقق
  UPDATE payment_verifications
  SET verification_status = CASE WHEN v_is_verified THEN 'verified' ELSE 'failed' END,
      verification_attempts = verification_attempts + 1,
      last_verification_attempt = now(),
      verified_amount = v_verified_amount,
      verified_at = CASE WHEN v_is_verified THEN now() ELSE NULL END
  WHERE id = p_verification_id;

  IF v_is_verified THEN
    -- تحديث حالة الدفع
    UPDATE task_payments
    SET payment_status = 'completed',
        verified_at = now()
    WHERE id = v_verification_record.payment_id;

    -- تحديث حالة المهمة
    UPDATE paid_tasks
    SET status = 'payment_verified',
        payment_verified = true,
        published_at = now()
    WHERE id = v_verification_record.task_id;

    RETURN QUERY SELECT true, 'Transaction verified successfully', true, v_verified_amount;
  ELSE
    RETURN QUERY SELECT false, 'Transaction verification failed', false, 0::numeric;
  END IF;
END;
$$;

-- وظيفة انتهاء صلاحية المدفوعات
CREATE OR REPLACE FUNCTION expire_pending_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer := 0;
BEGIN
  -- تحديث المدفوعات المنتهية الصلاحية
  UPDATE task_payments
  SET payment_status = 'expired'
  WHERE payment_status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- تحديث المهام المرتبطة
  UPDATE paid_tasks
  SET status = 'cancelled'
  WHERE id IN (
    SELECT task_id
    FROM task_payments
    WHERE payment_status = 'expired'
  ) AND status = 'pending_payment';

  RETURN v_expired_count;
END;
$$;

-- وظيفة الحصول على المهام المدفوعة للمستخدم
CREATE OR REPLACE FUNCTION get_user_paid_tasks(p_user_telegram_id text)
RETURNS TABLE(
  task_id uuid,
  title text,
  description text,
  link text,
  platform text,
  total_clicks integer,
  completed_clicks integer,
  target_community text,
  price_paid numeric,
  payment_method text,
  status text,
  payment_verified boolean,
  created_at timestamptz,
  published_at timestamptz,
  payment_status text,
  transaction_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.title,
    pt.description,
    pt.link,
    pt.platform,
    pt.total_clicks,
    pt.completed_clicks,
    pt.target_community,
    pt.price_paid,
    pt.payment_method,
    pt.status,
    pt.payment_verified,
    pt.created_at,
    pt.published_at,
    tp.payment_status,
    tp.transaction_hash
  FROM paid_tasks pt
  LEFT JOIN task_payments tp ON pt.id = tp.task_id
  WHERE pt.user_telegram_id = p_user_telegram_id
  ORDER BY pt.created_at DESC;
END;
$$;

-- تشغيل وظيفة انتهاء الصلاحية كل دقيقة (في التطبيق الحقيقي سيتم استخدام cron job)
-- SELECT expire_pending_payments();

-- إدراج بيانات تجريبية للاختبار
INSERT INTO paid_tasks (
  user_telegram_id,
  title,
  description,
  link,
  platform,
  total_clicks,
  target_community,
  price_paid,
  payment_method,
  status,
  payment_verified
) VALUES 
(
  '12345',
  'Facebook Task',
  'Like and share our Facebook page',
  'https://facebook.com/lyracoin',
  'facebook',
  1000,
  'AR',
  200,
  'lyra',
  'payment_verified',
  true
),
(
  '12345',
  'Instagram Task',
  'Follow our Instagram account',
  'https://instagram.com/lyracoin',
  'instagram',
  500,
  'EN',
  100,
  'lyra',
  'active',
  true
) ON CONFLICT DO NOTHING;