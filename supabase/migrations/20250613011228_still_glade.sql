/*
  # Fix profile authentication system

  1. Changes
    - Add supabase_auth_id column to users table
    - Add profile_image column to users table
    - Update RLS policies to use supabase_auth_id
    - Create storage bucket for profile images

  2. Security
    - Users can only access their own data using supabase_auth_id
    - Profile images stored securely in Supabase Storage
    - Maintain existing telegram_id for Telegram integration
*/

-- Add new columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS supabase_auth_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS profile_image text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_supabase_auth_id_idx ON public.users(supabase_auth_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Enable insert for telegram users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for own data" ON public.users;
DROP POLICY IF EXISTS "Enable update for own data" ON public.users;

-- Create new RLS policies using supabase_auth_id
CREATE POLICY "Enable insert for authenticated users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = supabase_auth_id
  );

CREATE POLICY "Enable read access for own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = supabase_auth_id
  );

CREATE POLICY "Enable update for own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = supabase_auth_id
  )
  WITH CHECK (
    auth.uid() = supabase_auth_id
  );

-- Allow anonymous registration (for initial Telegram user creation)
CREATE POLICY "Allow anonymous registration"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (
    telegram_id IS NOT NULL
  );

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for profile images
CREATE POLICY "Users can upload their own profile images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view profile images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update their own profile images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );