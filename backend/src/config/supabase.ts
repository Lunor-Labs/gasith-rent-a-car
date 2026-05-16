import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env in local dev (Render sets env vars directly in production)
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '.env.local' });
  // Fallback to .env if .env.local doesn't have the vars
  if (!process.env.SUPABASE_URL) {
    dotenv.config();
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Service-role client — bypasses RLS (for backend use only)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Storage bucket name (single bucket with folder prefixes)
export const STORAGE_BUCKET = 'uploads';

export default supabase;
