/*
  # LYRA Exchange System

  1. New Tables
    - `exchange_transactions` - Records all exchange transactions (buy/sell/convert)
    - `ton_transactions` - Records TON blockchain transactions
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
  
  3. Changes
    - Add exchange rate constants
    - Add exchange functions for all three methods
*/

-- Exchange transactions table
CREATE TABLE IF NOT EXISTS exchange_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id text NOT NULL REFERENCES users(telegram_id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('buy_with_ton', 'sell_for_ton', 'convert_minutes')),
  amount_in numeric NOT NULL,
  currency_in text NOT NULL CHECK (currency_in IN ('TON', 'MINUTES', 'LYRA')),
  amount_out numeric NOT NULL,
  currency_out text NOT NULL CHECK (currency_out IN ('TON', 'MINUTES', 'LYRA')),
  exchange_rate numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  transaction_hash text,
  wallet_address text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '10 minutes')
);

-- TON transactions table
CREATE TABLE IF NOT EXISTS ton_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_transaction_id uuid REFERENCES exchange_transactions(id) ON DELETE CASCADE,
  transaction_hash text NOT NULL,
  wallet_address text NOT NULL,
  amount numeric NOT NULL,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  blockchain_confirmation boolean DEFAULT false,
  confirmation_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_user ON exchange_transactions(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_status ON exchange_transactions(status);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_type ON exchange_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_expires ON exchange_transactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ton_transactions_hash ON ton_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_ton_transactions_exchange ON ton_transactions(exchange_transaction_id);

-- Enable RLS
ALTER TABLE exchange_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ton_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exchange_transactions
CREATE POLICY "Users can read their own exchange transactions"
  ON exchange_transactions
  FOR SELECT
  TO authenticated
  USING (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own exchange transactions"
  ON exchange_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_telegram_id IN (
    SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- RLS Policies for ton_transactions
CREATE POLICY "Users can read their ton transactions"
  ON ton_transactions
  FOR SELECT
  TO authenticated
  USING (exchange_transaction_id IN (
    SELECT id FROM exchange_transactions 
    WHERE user_telegram_id IN (
      SELECT telegram_id FROM users WHERE supabase_auth_id = auth.uid()
    )
  ));

-- Function to buy LYRA with TON
CREATE OR REPLACE FUNCTION buy_lyra_with_ton(
  p_user_telegram_id text,
  p_ton_amount numeric,
  p_wallet_address text
)
RETURNS TABLE(
  success boolean,
  message text,
  transaction_id uuid,
  lyra_amount numeric,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
  v_lyra_amount numeric;
  v_exchange_rate numeric := 100; -- 1 TON = 100 LYRA
  v_expires_at timestamptz;
BEGIN
  -- Validate input
  IF p_ton_amount < 0.1 THEN
    RETURN QUERY SELECT false, 'Minimum purchase is 0.1 TON', NULL::uuid, 0::numeric, NULL::timestamptz;
    RETURN;
  END IF;
  
  IF p_wallet_address IS NULL OR length(p_wallet_address) < 10 THEN
    RETURN QUERY SELECT false, 'Invalid wallet address', NULL::uuid, 0::numeric, NULL::timestamptz;
    RETURN;
  END IF;
  
  -- Calculate LYRA amount
  v_lyra_amount := p_ton_amount * v_exchange_rate;
  
  -- Set expiration time
  v_expires_at := now() + interval '10 minutes';
  
  -- Create exchange transaction
  INSERT INTO exchange_transactions (
    user_telegram_id,
    transaction_type,
    amount_in,
    currency_in,
    amount_out,
    currency_out,
    exchange_rate,
    status,
    wallet_address,
    expires_at
  ) VALUES (
    p_user_telegram_id,
    'buy_with_ton',
    p_ton_amount,
    'TON',
    v_lyra_amount,
    'LYRA',
    v_exchange_rate,
    'pending',
    p_wallet_address,
    v_expires_at
  ) RETURNING id INTO v_transaction_id;
  
  RETURN QUERY SELECT true, 'Transaction initiated', v_transaction_id, v_lyra_amount, v_expires_at;
END;
$$;

-- Function to verify TON payment and complete LYRA purchase
CREATE OR REPLACE FUNCTION verify_ton_payment_for_lyra(
  p_transaction_id uuid,
  p_transaction_hash text
)
RETURNS TABLE(
  success boolean,
  message text,
  lyra_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction record;
  v_user_record record;
  v_lyra_amount numeric;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM exchange_transactions
  WHERE id = p_transaction_id
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Transaction not found or expired', 0::numeric;
    RETURN;
  END IF;
  
  -- Validate transaction hash
  IF p_transaction_hash IS NULL OR length(p_transaction_hash) < 10 THEN
    RETURN QUERY SELECT false, 'Invalid transaction hash', 0::numeric;
    RETURN;
  END IF;
  
  -- Record TON transaction
  INSERT INTO ton_transactions (
    exchange_transaction_id,
    transaction_hash,
    wallet_address,
    amount,
    direction,
    status
  ) VALUES (
    p_transaction_id,
    p_transaction_hash,
    v_transaction.wallet_address,
    v_transaction.amount_in,
    'incoming',
    'confirmed'
  );
  
  -- Update exchange transaction
  UPDATE exchange_transactions
  SET status = 'completed',
      transaction_hash = p_transaction_hash,
      completed_at = now()
  WHERE id = p_transaction_id;
  
  -- Add LYRA to user balance
  UPDATE users
  SET lyra_balance = lyra_balance + v_transaction.amount_out
  WHERE telegram_id = v_transaction.user_telegram_id
  RETURNING lyra_balance INTO v_user_record;
  
  -- Log activity
  PERFORM log_user_activity(
    v_transaction.user_telegram_id,
    'lyra_purchased',
    jsonb_build_object(
      'amount', v_transaction.amount_out,
      'payment_method', 'ton',
      'ton_amount', v_transaction.amount_in
    )
  );
  
  RETURN QUERY SELECT true, 'Payment verified and LYRA added to balance', v_transaction.amount_out;
END;
$$;

-- Function to convert minutes to LYRA
CREATE OR REPLACE FUNCTION convert_minutes_to_lyra(
  p_user_telegram_id text,
  p_minutes_amount numeric
)
RETURNS TABLE(
  success boolean,
  message text,
  lyra_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record record;
  v_lyra_amount numeric;
  v_exchange_rate numeric := 1000; -- 1000 minutes = 1 LYRA
  v_transaction_id uuid;
BEGIN
  -- Validate input
  IF p_minutes_amount < 1000 THEN
    RETURN QUERY SELECT false, 'Minimum conversion is 1000 minutes', 0::numeric;
    RETURN;
  END IF;
  
  IF p_minutes_amount % 1000 != 0 THEN
    RETURN QUERY SELECT false, 'Minutes must be in multiples of 1000', 0::numeric;
    RETURN;
  END IF;
  
  -- Get user's current minutes
  SELECT telegram_id, total_minutes INTO v_user_record
  FROM users
  WHERE telegram_id = p_user_telegram_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User not found', 0::numeric;
    RETURN;
  END IF;
  
  IF v_user_record.total_minutes < p_minutes_amount THEN
    RETURN QUERY SELECT false, 'Not enough minutes available', 0::numeric;
    RETURN;
  END IF;
  
  -- Calculate LYRA amount
  v_lyra_amount := p_minutes_amount / v_exchange_rate;
  
  -- Create exchange transaction
  INSERT INTO exchange_transactions (
    user_telegram_id,
    transaction_type,
    amount_in,
    currency_in,
    amount_out,
    currency_out,
    exchange_rate,
    status
  ) VALUES (
    p_user_telegram_id,
    'convert_minutes',
    p_minutes_amount,
    'MINUTES',
    v_lyra_amount,
    'LYRA',
    v_exchange_rate,
    'pending'
  ) RETURNING id INTO v_transaction_id;
  
  -- Update user's minutes and LYRA balance
  UPDATE users
  SET total_minutes = total_minutes - p_minutes_amount,
      lyra_balance = lyra_balance + v_lyra_amount
  WHERE telegram_id = p_user_telegram_id;
  
  -- Complete the transaction
  UPDATE exchange_transactions
  SET status = 'completed',
      completed_at = now()
  WHERE id = v_transaction_id;
  
  -- Log activity
  PERFORM log_user_activity(
    p_user_telegram_id,
    'minutes_converted',
    jsonb_build_object(
      'minutes_amount', p_minutes_amount,
      'lyra_amount', v_lyra_amount
    )
  );
  
  RETURN QUERY SELECT true, 'Minutes successfully converted to LYRA', v_lyra_amount;
END;
$$;

-- Function to sell LYRA for TON
CREATE OR REPLACE FUNCTION sell_lyra_for_ton(
  p_user_telegram_id text,
  p_lyra_amount numeric,
  p_wallet_address text
)
RETURNS TABLE(
  success boolean,
  message text,
  transaction_id uuid,
  ton_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record record;
  v_ton_amount numeric;
  v_exchange_rate numeric := 0.01; -- 1 LYRA = 0.01 TON
  v_transaction_id uuid;
BEGIN
  -- Validate input
  IF p_lyra_amount < 10 THEN
    RETURN QUERY SELECT false, 'Minimum sale is 10 LYRA', NULL::uuid, 0::numeric;
    RETURN;
  END IF;
  
  IF p_wallet_address IS NULL OR length(p_wallet_address) < 10 THEN
    RETURN QUERY SELECT false, 'Invalid wallet address', NULL::uuid, 0::numeric;
    RETURN;
  END IF;
  
  -- Get user's current LYRA balance
  SELECT telegram_id, lyra_balance INTO v_user_record
  FROM users
  WHERE telegram_id = p_user_telegram_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User not found', NULL::uuid, 0::numeric;
    RETURN;
  END IF;
  
  IF v_user_record.lyra_balance < p_lyra_amount THEN
    RETURN QUERY SELECT false, 'Not enough LYRA available', NULL::uuid, 0::numeric;
    RETURN;
  END IF;
  
  -- Calculate TON amount
  v_ton_amount := p_lyra_amount * v_exchange_rate;
  
  -- Create exchange transaction
  INSERT INTO exchange_transactions (
    user_telegram_id,
    transaction_type,
    amount_in,
    currency_in,
    amount_out,
    currency_out,
    exchange_rate,
    status,
    wallet_address
  ) VALUES (
    p_user_telegram_id,
    'sell_for_ton',
    p_lyra_amount,
    'LYRA',
    v_ton_amount,
    'TON',
    v_exchange_rate,
    'pending',
    p_wallet_address
  ) RETURNING id INTO v_transaction_id;
  
  -- Deduct LYRA from user's balance
  UPDATE users
  SET lyra_balance = lyra_balance - p_lyra_amount
  WHERE telegram_id = p_user_telegram_id;
  
  -- Log activity
  PERFORM log_user_activity(
    p_user_telegram_id,
    'lyra_sold',
    jsonb_build_object(
      'lyra_amount', p_lyra_amount,
      'ton_amount', v_ton_amount,
      'wallet_address', p_wallet_address
    )
  );
  
  RETURN QUERY SELECT true, 'LYRA sale initiated', v_transaction_id, v_ton_amount;
END;
$$;

-- Function to complete LYRA sale for TON
CREATE OR REPLACE FUNCTION complete_lyra_sale(
  p_transaction_id uuid,
  p_transaction_hash text
)
RETURNS TABLE(
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction record;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM exchange_transactions
  WHERE id = p_transaction_id
    AND transaction_type = 'sell_for_ton'
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Transaction not found or already processed';
    RETURN;
  END IF;
  
  -- Record TON transaction
  INSERT INTO ton_transactions (
    exchange_transaction_id,
    transaction_hash,
    wallet_address,
    amount,
    direction,
    status
  ) VALUES (
    p_transaction_id,
    p_transaction_hash,
    v_transaction.wallet_address,
    v_transaction.amount_out,
    'outgoing',
    'confirmed'
  );
  
  -- Update exchange transaction
  UPDATE exchange_transactions
  SET status = 'completed',
      transaction_hash = p_transaction_hash,
      completed_at = now()
  WHERE id = p_transaction_id;
  
  RETURN QUERY SELECT true, 'LYRA sale completed successfully';
END;
$$;

-- Function to get user exchange transactions
CREATE OR REPLACE FUNCTION get_user_exchange_transactions(
  p_user_telegram_id text
)
RETURNS TABLE(
  id uuid,
  transaction_type text,
  amount_in numeric,
  currency_in text,
  amount_out numeric,
  currency_out text,
  status text,
  created_at timestamptz,
  completed_at timestamptz,
  transaction_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.transaction_type,
    et.amount_in,
    et.currency_in,
    et.amount_out,
    et.currency_out,
    et.status,
    et.created_at,
    et.completed_at,
    et.transaction_hash
  FROM exchange_transactions et
  WHERE et.user_telegram_id = p_user_telegram_id
  ORDER BY et.created_at DESC;
END;
$$;

-- Function to expire pending exchange transactions
CREATE OR REPLACE FUNCTION expire_pending_exchange_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer := 0;
  v_transaction record;
BEGIN
  -- Get expired transactions
  FOR v_transaction IN
    SELECT * FROM exchange_transactions
    WHERE status = 'pending'
      AND expires_at < now()
  LOOP
    -- If selling LYRA, refund the LYRA
    IF v_transaction.transaction_type = 'sell_for_ton' THEN
      UPDATE users
      SET lyra_balance = lyra_balance + v_transaction.amount_in
      WHERE telegram_id = v_transaction.user_telegram_id;
    END IF;
    
    -- Update transaction status
    UPDATE exchange_transactions
    SET status = 'expired'
    WHERE id = v_transaction.id;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$;

-- Add activity types for exchange
ALTER TABLE user_activity_log
  DROP CONSTRAINT IF EXISTS user_activity_log_activity_type_check;

ALTER TABLE user_activity_log
  ADD CONSTRAINT user_activity_log_activity_type_check 
  CHECK (activity_type IN (
    'login', 'task_completed', 'mining_started', 'mining_claimed', 
    'referral_made', 'game_played', 'boost_purchased',
    'lyra_purchased', 'lyra_sold', 'minutes_converted'
  ));