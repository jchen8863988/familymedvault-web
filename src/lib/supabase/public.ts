import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isValidSupabaseHttpUrl,
  normalizeEnv,
} from "@/lib/supabase/env";

/** Both vars required for community CRUD; missing → `createPublicSupabase()` is null and actions/UI treat community as unavailable. */
export function isSupabaseConfigured(): boolean {
  const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Boolean(url && key && isValidSupabaseHttpUrl(url));
}

/** Server Components & Server Actions: public anon client for RLS-protected tables. */
export function createPublicSupabase(): SupabaseClient | null {
  const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key || !isValidSupabaseHttpUrl(url)) return null;
  return createClient(url, key);
}
