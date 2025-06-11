-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id text NOT NULL UNIQUE,
    username text,
    level integer DEFAULT 1,
    wallet_address text,
    registered_at timestamptz DEFAULT now(),
    referral_count integer DEFAULT 0,
    preferred_exchange text,
    total_minutes integer DEFAULT 0,
    points integer DEFAULT 0
);

-- Create index for telegram_id lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON public.users (telegram_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
    DROP POLICY IF EXISTS "Users can read own data" ON public.users;
    DROP POLICY IF EXISTS "Users can update own data" ON public.users;
END $$;

-- Create policies
CREATE POLICY "Users can insert own data"
    ON public.users
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid())::text = telegram_id);

CREATE POLICY "Users can read own data"
    ON public.users
    FOR SELECT
    TO public
    USING ((auth.uid())::text = telegram_id);

CREATE POLICY "Users can update own data"
    ON public.users
    FOR UPDATE
    TO public
    USING ((auth.uid())::text = telegram_id)
    WITH CHECK ((auth.uid())::text = telegram_id);