/**
 * TeLog family-share invite persistence — Supabase with dev memory fallback.
 */
import { createServiceSupabase } from "@/lib/supabase/admin";

export type FamilyInvitePermission = "location" | "basic";

export type FamilyInviteRow = {
  inviteToken: string;
  permission: FamilyInvitePermission;
  relation: string;
  revoked: boolean;
  createdAt: string;
  shareLinkId?: string;
  ownerAccountId?: string;
  granteeUserId?: string;
  granteePhoneMasked?: string;
  acceptedAt?: string;
};

export class FamilyShareStorageError extends Error {
  constructor(
    message: string,
    readonly code: "storage_not_configured" | "not_found" | "db_error",
  ) {
    super(message);
    this.name = "FamilyShareStorageError";
  }
}

type MemoryRow = {
  permission: FamilyInvitePermission;
  relation: string;
  revoked: boolean;
  createdAt: string;
  shareLinkId?: string;
  ownerAccountId?: string;
  granteeUserId?: string;
  granteePhoneMasked?: string;
  acceptedAt?: string;
};

const memoryInvites = new Map<string, MemoryRow>();

function useMemoryFallback(): boolean {
  return process.env.TELOG_CLOUD_COLLECT_ALLOW_MEMORY === "1" || process.env.NODE_ENV === "development";
}

function rowFromMemory(token: string, row: MemoryRow): FamilyInviteRow {
  return {
    inviteToken: token,
    permission: row.permission,
    relation: row.relation,
    revoked: row.revoked,
    createdAt: row.createdAt,
    shareLinkId: row.shareLinkId,
    ownerAccountId: row.ownerAccountId,
    granteeUserId: row.granteeUserId,
    granteePhoneMasked: row.granteePhoneMasked,
    acceptedAt: row.acceptedAt,
  };
}

function mapDbRow(row: Record<string, unknown>): FamilyInviteRow {
  return {
    inviteToken: String(row.invite_token),
    permission: row.permission === "location" ? "location" : "basic",
    relation: String(row.relation ?? "家庭成员"),
    revoked: Boolean(row.revoked),
    createdAt: String(row.created_at),
    shareLinkId: row.share_link_id ? String(row.share_link_id) : undefined,
    ownerAccountId: row.owner_account_id ? String(row.owner_account_id) : undefined,
    granteeUserId: row.grantee_user_id ? String(row.grantee_user_id) : undefined,
    granteePhoneMasked: row.grantee_phone_masked ? String(row.grantee_phone_masked) : undefined,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : undefined,
  };
}

export async function getFamilyInvite(token: string): Promise<FamilyInviteRow | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) return null;
    const row = memoryInvites.get(trimmed);
    return row ? rowFromMemory(trimmed, row) : null;
  }

  const { data, error } = await sb
    .from("telog_family_invites")
    .select("*")
    .eq("invite_token", trimmed)
    .maybeSingle();

  if (error) throw new FamilyShareStorageError(error.message, "db_error");
  if (!data) return null;
  return mapDbRow(data as Record<string, unknown>);
}

export async function createFamilyInvite(input: {
  inviteToken: string;
  permission: FamilyInvitePermission;
  relation: string;
  shareLinkId?: string;
  ownerAccountId?: string;
}): Promise<void> {
  const token = input.inviteToken.trim();
  if (!token) throw new FamilyShareStorageError("missing_token", "db_error");

  const createdAt = new Date().toISOString();
  const sb = createServiceSupabase();

  if (!sb) {
    if (!useMemoryFallback()) {
      throw new FamilyShareStorageError("storage_not_configured", "storage_not_configured");
    }
    memoryInvites.set(token, {
      permission: input.permission,
      relation: input.relation,
      revoked: false,
      createdAt,
      shareLinkId: input.shareLinkId,
      ownerAccountId: input.ownerAccountId,
    });
    return;
  }

  const { error } = await sb.from("telog_family_invites").upsert(
    {
      invite_token: token,
      permission: input.permission,
      relation: input.relation,
      revoked: false,
      created_at: createdAt,
      share_link_id: input.shareLinkId ?? null,
      owner_account_id: input.ownerAccountId ?? null,
      grantee_user_id: null,
      grantee_phone_masked: null,
      accepted_at: null,
    },
    { onConflict: "invite_token" },
  );

  if (error) throw new FamilyShareStorageError(error.message, "db_error");
}

export async function acceptFamilyInvite(input: {
  inviteToken: string;
  granteeUserId?: string;
  granteePhoneMasked?: string;
}): Promise<void> {
  const token = input.inviteToken.trim();
  const existing = await getFamilyInvite(token);
  if (!existing || existing.revoked) {
    throw new FamilyShareStorageError("not_found", "not_found");
  }

  const acceptedAt = new Date().toISOString();
  const sb = createServiceSupabase();

  if (!sb) {
    if (!useMemoryFallback()) {
      throw new FamilyShareStorageError("storage_not_configured", "storage_not_configured");
    }
    const row = memoryInvites.get(token);
    if (!row || row.revoked) throw new FamilyShareStorageError("not_found", "not_found");
    row.granteeUserId = input.granteeUserId;
    row.granteePhoneMasked = input.granteePhoneMasked;
    row.acceptedAt = acceptedAt;
    memoryInvites.set(token, row);
    return;
  }

  const { error } = await sb
    .from("telog_family_invites")
    .update({
      grantee_user_id: input.granteeUserId ?? null,
      grantee_phone_masked: input.granteePhoneMasked ?? null,
      accepted_at: acceptedAt,
    })
    .eq("invite_token", token)
    .eq("revoked", false);

  if (error) throw new FamilyShareStorageError(error.message, "db_error");
}

export async function revokeFamilyInvite(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;

  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) return;
    const row = memoryInvites.get(trimmed);
    if (row) {
      row.revoked = true;
      memoryInvites.set(trimmed, row);
    }
    return;
  }

  const { error } = await sb
    .from("telog_family_invites")
    .update({ revoked: true })
    .eq("invite_token", trimmed);

  if (error) throw new FamilyShareStorageError(error.message, "db_error");
}
