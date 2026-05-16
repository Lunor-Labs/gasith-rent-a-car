import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Guard: skip initialization during static build when env vars aren't available.
// NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so on the
// client side they will always be present once the build succeeds.
export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

export default supabase;
