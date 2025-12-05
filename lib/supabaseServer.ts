import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getRequiredEnv, getOptionalEnv } from './env';

/**
 * Server-side Supabase client with service role key for admin operations.
 * Use this for operations that require elevated permissions (e.g., bypassing RLS).
 * 
 * DO NOT expose this client to the browser - it has full database access.
 */
const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY', '');

if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - some server operations may fail');
}

export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey || getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

