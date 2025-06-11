/*
  # Create users table and security policies

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `telegram_id` (text, unique)
      - `username` (text, nullable)
      - `level` (integer)
      - `wallet_address` (text, nullable)
      - `registered_at` (timestamp with time zone)
      - `referral_count` (integer)
      - `preferred_exchange` (text, nullable)
      - `total_minutes` (integer)
      - `points` (integer)

  2. Security
    - Enable RLS on users table
    - Add policies for:
      - Select: Users can read their own data
      - Insert: Authenticated users can insert their own data
      - Update: Users can update their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  username text,
  level integer DEFAULT 1,
  wallet_address text,
  registered_at timestamptz DEFAULT now(),
  referral_count integer DEFAULT 0,
  preferred_exchange text,
  total_minutes integer DEFAULT 0,
  points integer DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid()::text = telegram_id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid()::text = telegram_id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid()::text = telegram_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON public.users(telegram_id);