import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_MAX = 5;

function windowMs(): number {
  const raw = process.env.COMMUNITY_RATE_LIMIT_WINDOW_MS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_MS;
}

function maxPerWindow(): number {
  const raw = process.env.COMMUNITY_RATE_LIMIT_MAX;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX;
}

/** SHA-256 hex of salt + IP for abuse prevention without storing raw IPs. */
export async function hashClientIp(ip: string): Promise<string> {
  const salt =
    process.env.RATE_LIMIT_IP_SALT ||
    process.env.COMMUNITY_ADMIN_SECRET ||
    "familymedvault-dev-salt";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns false if this hash has created too many ideas in the sliding window. */
export async function allowCommunityIdeaSubmission(
  supabase: SupabaseClient,
  ipHash: string | null,
): Promise<{ ok: boolean }> {
  if (!ipHash) return { ok: true };

  const since = new Date(Date.now() - windowMs()).toISOString();
  const { count, error } = await supabase
    .from("community_ideas")
    .select("*", { count: "exact", head: true })
    .eq("submitter_ip_hash", ipHash)
    .gte("created_at", since);

  if (error) {
    console.error("[community] rate limit count", error.message);
    return { ok: true };
  }

  if ((count ?? 0) >= maxPerWindow()) {
    return { ok: false };
  }
  return { ok: true };
}
