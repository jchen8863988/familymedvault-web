/**
 * TeLog membership redeem codes — server-side validation (Supabase + dev memory).
 * Codes are stored as SHA-256 hashes; plaintext never persisted.
 */
import { createHash } from "crypto";

import { createServiceSupabase } from "@/lib/supabase/admin";

export type RedeemCodeErrorCode =
  | "invalid_code"
  | "already_used"
  | "expired"
  | "exhausted"
  | "disabled"
  | "storage_not_configured"
  | "db_error";

export class RedeemCodeError extends Error {
  constructor(
    message: string,
    readonly code: RedeemCodeErrorCode,
  ) {
    super(message);
    this.name = "RedeemCodeError";
  }
}

export type RedeemCodeSuccess = {
  months: number;
  codeHash: string;
};

type MemoryCode = {
  months: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  disabled: boolean;
};

const memoryCodes = new Map<string, MemoryCode>();
const memoryRedemptions = new Set<string>();

function redemptionKey(codeHash: string, subject: string): string {
  return `${codeHash}:${subject}`;
}

function allowMemoryFallback(): boolean {
  return process.env.TELOG_CLOUD_COLLECT_ALLOW_MEMORY === "1" || process.env.NODE_ENV === "development";
}

export function normalizeRedeemCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashRedeemCode(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function seedMemoryCatalog(): void {
  if (memoryCodes.size > 0) return;
  const seeds: Array<{ code: string; months: number; note?: string }> = [
    { code: "TELOG-REVIEW-2026", months: 6, note: "review" },
    { code: "TELOG-HALFYEAR", months: 6 },
    { code: "TELOG-HALFYEAR-2026", months: 6 },
  ];
  for (const row of seeds) {
    const normalized = normalizeRedeemCode(row.code);
    memoryCodes.set(hashRedeemCode(normalized), {
      months: row.months,
      maxRedemptions: null,
      redemptionCount: 0,
      expiresAt: null,
      disabled: false,
    });
  }
}

async function redeemMemory(subject: string, normalized: string): Promise<RedeemCodeSuccess> {
  seedMemoryCatalog();
  const codeHash = hashRedeemCode(normalized);
  const entry = memoryCodes.get(codeHash);
  if (!entry) throw new RedeemCodeError("invalid_code", "invalid_code");
  if (entry.disabled) throw new RedeemCodeError("disabled", "disabled");
  if (entry.expiresAt && Date.parse(entry.expiresAt) < Date.now()) {
    throw new RedeemCodeError("expired", "expired");
  }
  if (memoryRedemptions.has(redemptionKey(codeHash, subject))) {
    throw new RedeemCodeError("already_used", "already_used");
  }
  if (entry.maxRedemptions != null && entry.redemptionCount >= entry.maxRedemptions) {
    throw new RedeemCodeError("exhausted", "exhausted");
  }
  memoryRedemptions.add(redemptionKey(codeHash, subject));
  entry.redemptionCount += 1;
  return { months: entry.months, codeHash };
}

async function redeemSupabase(subject: string, normalized: string): Promise<RedeemCodeSuccess> {
  const sb = createServiceSupabase();
  if (!sb) throw new RedeemCodeError("storage_not_configured", "storage_not_configured");

  const codeHash = hashRedeemCode(normalized);

  const existing = await sb
    .from("telog_redeem_redemptions")
    .select("id")
    .eq("code_hash", codeHash)
    .eq("subject", subject)
    .maybeSingle();
  if (existing.error) throw new RedeemCodeError(existing.error.message, "db_error");
  if (existing.data) throw new RedeemCodeError("already_used", "already_used");

  const catalog = await sb
    .from("telog_redeem_codes")
    .select("months, max_redemptions, redemption_count, expires_at, disabled")
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (catalog.error) throw new RedeemCodeError(catalog.error.message, "db_error");
  if (!catalog.data) throw new RedeemCodeError("invalid_code", "invalid_code");
  if (catalog.data.disabled) throw new RedeemCodeError("disabled", "disabled");
  if (catalog.data.expires_at && Date.parse(String(catalog.data.expires_at)) < Date.now()) {
    throw new RedeemCodeError("expired", "expired");
  }
  const max = catalog.data.max_redemptions != null ? Number(catalog.data.max_redemptions) : null;
  const count = Number(catalog.data.redemption_count ?? 0);
  if (max != null && count >= max) throw new RedeemCodeError("exhausted", "exhausted");

  const insert = await sb.from("telog_redeem_redemptions").insert({
    code_hash: codeHash,
    subject,
  });
  if (insert.error) {
    if (insert.error.code === "23505") throw new RedeemCodeError("already_used", "already_used");
    throw new RedeemCodeError(insert.error.message, "db_error");
  }

  const bump = await sb
    .from("telog_redeem_codes")
    .update({ redemption_count: count + 1 })
    .eq("code_hash", codeHash);
  if (bump.error) throw new RedeemCodeError(bump.error.message, "db_error");

  return { months: Number(catalog.data.months), codeHash };
}

export async function redeemMembershipCode(
  subject: string,
  rawCode: string,
): Promise<RedeemCodeSuccess> {
  const key = subject.trim();
  if (!key) throw new RedeemCodeError("missing_subject", "invalid_code");

  const normalized = normalizeRedeemCode(rawCode);
  if (!normalized) throw new RedeemCodeError("empty_code", "invalid_code");
  if (!/^[A-Z0-9][A-Z0-9-]{4,48}[A-Z0-9]$/.test(normalized)) {
    throw new RedeemCodeError("invalid_format", "invalid_code");
  }

  const sb = createServiceSupabase();
  if (sb) return redeemSupabase(key, normalized);
  if (allowMemoryFallback()) return redeemMemory(key, normalized);
  throw new RedeemCodeError("storage_not_configured", "storage_not_configured");
}
