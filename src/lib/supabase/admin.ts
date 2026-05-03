import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only: bypasses RLS for moderation (delete / pin). Never import from client code. */
export function createServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
