"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isValidSupabaseHttpUrl,
  normalizeEnv,
} from "@/lib/supabase/env";

export function getBrowserSupabase(): SupabaseClient | null {
  const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key || !isValidSupabaseHttpUrl(url)) return null;
  return createClient(url, key);
}
