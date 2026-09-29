import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!url || !key) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before starting Cocoon.');
export const browserSupabase = createClient(
  url, key,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
);
