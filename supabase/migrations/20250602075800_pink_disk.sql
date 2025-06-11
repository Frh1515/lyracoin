-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id text NOT NULL REFERENCES public.users(telegram_id),
    referred_id text NOT NULL REFERENCES public.users(telegram_id),
    created_at timestamptz DEFAULT now(),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    reward_claimed boolean DEFAULT false,
    UNIQUE(referred_id)
);

-- Create referral_rewards table to track reward claims
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id uuid REFERENCES public.referrals(id),
    minutes_rewarded integer NOT NULL,
    claimed_at timestamptz DEFAULT now(),
    UNIQUE(referral_id)
);

-- Add referral_tier to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_tier text 
DEFAULT 'bronze' CHECK (referral_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for referrals table
CREATE POLICY "Users can read their own referrals" ON public.referrals
    FOR SELECT USING (
        auth.uid()::text = referrer_id OR 
        auth.uid()::text = referred_id
    );

CREATE POLICY "Users can insert referrals only for themselves" ON public.referrals
    FOR INSERT WITH CHECK (
        auth.uid()::text = referred_id AND
        referrer_id != referred_id
    );

-- Function to update user's referral tier
CREATE OR REPLACE FUNCTION update_referral_tier()
RETURNS trigger AS $$
BEGIN
    UPDATE public.users
    SET referral_tier = 
        CASE 
            WHEN (
                SELECT count(*) 
                FROM public.referrals 
                WHERE referrer_id = NEW.referrer_id AND 
                      status = 'verified'
            ) >= 50 THEN 'platinum'
            WHEN (
                SELECT count(*) 
                FROM public.referrals 
                WHERE referrer_id = NEW.referrer_id AND 
                      status = 'verified'
            ) >= 25 THEN 'gold'
            WHEN (
                SELECT count(*) 
                FROM public.referrals 
                WHERE referrer_id = NEW.referrer_id AND 
                      status = 'verified'
            ) >= 10 THEN 'silver'
            ELSE 'bronze'
        END
    WHERE telegram_id = NEW.referrer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update referral tier
CREATE TRIGGER update_referral_tier_trigger
    AFTER INSERT OR UPDATE OF status
    ON public.referrals
    FOR EACH ROW
    WHEN (NEW.status = 'verified')
    EXECUTE FUNCTION update_referral_tier();