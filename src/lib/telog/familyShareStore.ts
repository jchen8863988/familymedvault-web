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
  vehicleLabel?: string;
  ownerLabel?: string;
  granteeLocationConsentAt?: string;
};

export type FamilyLiveSnapshotRow = {
  shareLinkId: string;
  inviteToken: string;
  payload: Record<string, unknown>;
  updatedAt: string;
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
  vehicleLabel?: string;
  ownerLabel?: string;
  granteeLocationConsentAt?: string;
};

const memoryLiveSnapshots = new Map<string, FamilyLiveSnapshotRow>();

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
    vehicleLabel: row.vehicleLabel,
    ownerLabel: row.ownerLabel,
    granteeLocationConsentAt: row.granteeLocationConsentAt,
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
    vehicleLabel: row.vehicle_label ? String(row.vehicle_label) : undefined,
    ownerLabel: row.owner_label ? String(row.owner_label) : undefined,
    granteeLocationConsentAt: row.grantee_location_consent_at
      ? String(row.grantee_location_consent_at)
      : undefined,
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
  vehicleLabel?: string;
  ownerLabel?: string;
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
      vehicleLabel: input.vehicleLabel,
      ownerLabel: input.ownerLabel,
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
      vehicle_label: input.vehicleLabel ?? null,
      owner_label: input.ownerLabel ?? null,
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
  granteeLocationConsentAt?: string;
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
    if (input.granteeLocationConsentAt) {
      row.granteeLocationConsentAt = input.granteeLocationConsentAt;
    }
    memoryInvites.set(token, row);
    return;
  }

  const { error } = await sb
    .from("telog_family_invites")
    .update({
      grantee_user_id: input.granteeUserId ?? null,
      grantee_phone_masked: input.granteePhoneMasked ?? null,
      accepted_at: acceptedAt,
      grantee_location_consent_at: input.granteeLocationConsentAt ?? null,
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

export async function upsertFamilyLiveSnapshot(input: {
  shareLinkId: string;
  inviteToken: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const shareLinkId = input.shareLinkId.trim();
  const inviteToken = input.inviteToken.trim();
  if (!shareLinkId || !inviteToken) {
    throw new FamilyShareStorageError("missing_ids", "db_error");
  }

  const updatedAt = new Date().toISOString();
  const sb = createServiceSupabase();

  if (!sb) {
    if (!useMemoryFallback()) {
      throw new FamilyShareStorageError("storage_not_configured", "storage_not_configured");
    }
    memoryLiveSnapshots.set(shareLinkId, {
      shareLinkId,
      inviteToken,
      payload: input.payload,
      updatedAt,
    });
    return;
  }

  const { error } = await sb.from("telog_family_live_snapshots").upsert(
    {
      share_link_id: shareLinkId,
      invite_token: inviteToken,
      payload: input.payload,
      updated_at: updatedAt,
    },
    { onConflict: "share_link_id" },
  );

  if (error) throw new FamilyShareStorageError(error.message, "db_error");
}

export async function getFamilyLiveSnapshot(
  shareLinkId: string,
): Promise<FamilyLiveSnapshotRow | null> {
  const trimmed = shareLinkId.trim();
  if (!trimmed) return null;

  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) return null;
    return memoryLiveSnapshots.get(trimmed) ?? null;
  }

  const { data, error } = await sb
    .from("telog_family_live_snapshots")
    .select("*")
    .eq("share_link_id", trimmed)
    .maybeSingle();

  if (error) throw new FamilyShareStorageError(error.message, "db_error");
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    shareLinkId: String(row.share_link_id),
    inviteToken: String(row.invite_token),
    payload: (row.payload as Record<string, unknown>) ?? {},
    updatedAt: String(row.updated_at),
  };
}

export async function deleteFamilyLiveSnapshot(shareLinkId: string): Promise<void> {
  const trimmed = shareLinkId.trim();
  if (!trimmed) return;

  const sb = createServiceSupabase();
  if (!sb) {
    if (useMemoryFallback()) memoryLiveSnapshots.delete(trimmed);
    return;
  }

  await sb.from("telog_family_live_snapshots").delete().eq("share_link_id", trimmed);
}
