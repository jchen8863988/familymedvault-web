import { createPublicSupabase } from "@/lib/supabase/public";
import type { StoreAppRow } from "@/types/store-app";

export async function fetchStoreApps(): Promise<{
  rows: StoreAppRow[];
  configured: boolean;
}> {
  const supabase = createPublicSupabase();
  if (!supabase) {
    return { rows: [], configured: false };
  }

  const { data, error } = await supabase
    .from("store_apps")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[store-apps] select", error.message);
    return { rows: [], configured: true };
  }

  return { rows: (data ?? []) as StoreAppRow[], configured: true };
}
