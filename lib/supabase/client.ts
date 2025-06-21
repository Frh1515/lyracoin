import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly configured
if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here' || !supabaseUrl.startsWith('https://')) {
  throw new Error('VITE_SUPABASE_URL is not properly configured. Please set it to your actual Supabase project URL (e.g., https://your-project-id.supabase.co)');
}

if (!supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
  throw new Error('VITE_SUPABASE_ANON_KEY is not properly configured. Please set it to your actual Supabase anonymous key.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);