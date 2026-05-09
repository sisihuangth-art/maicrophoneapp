import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser / server-component client (uses anon key + RLS) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Storage bucket name for audio recordings */
export const AUDIO_BUCKET = 'recordings';
