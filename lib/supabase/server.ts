import { createClient } from '@supabase/supabase-js';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createServerSupabaseClient() {
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
