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

const COMMENT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_COMMENT_MAX = 25;

function commentMaxPerWindow(): number {
  const raw = process.env.COMMUNITY_COMMENT_RATE_LIMIT_MAX;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COMMENT_MAX;
}

/** Limit comments per browser client_id per hour to reduce spam threads. */
export async function allowCommentSubmission(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ ok: boolean }> {
  const cid = clientId.trim().slice(0, 120);
  if (!cid) return { ok: false };

  const since = new Date(Date.now() - COMMENT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("idea_comments")
    .select("*", { count: "exact", head: true })
    .eq("client_id", cid)
    .gte("created_at", since);

  if (error) {
    console.error("[community] comment rate limit count", error.message);
    return { ok: true };
  }

  if ((count ?? 0) >= commentMaxPerWindow()) {
    return { ok: false };
  }
  return { ok: true };
}
