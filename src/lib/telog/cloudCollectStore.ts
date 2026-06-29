/**
 * TeLog cloud-collect persistence — Supabase (CN Postgres) with dev memory fallback.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import { createServiceSupabase } from "@/lib/supabase/admin";
import {
  destroyRefreshTokenVault,
  hashRefreshToken,
  sealRefreshToken,
  type EncryptedRefreshTokenVault,
} from "@/lib/telog/tokenVault";

export type VehicleRef = { carId: string; vin: string; fleetVehicleId: string };

export type RegisterTenantInput = {
  retentionDays: number;
  storageRegion: "cn";
  transport: "fleet_api" | "fleet_telemetry";
  consentAcceptedAt: string;
  disclosureVersion: number;
  disclosureAcceptedAt: string;
  vehicles: VehicleRef[];
  refreshToken: string;
};

export type RegisterTenantResult = {
  tenantId: string;
  transport: "fleet_api" | "fleet_telemetry";
  storageRegion: "cn";
  collectorStatus: "active" | "pending";
  registeredAt: string;
  tokenVaultStored: boolean;
};

export type TenantStatus = {
  tenantId: string;
  collectorStatus: "active" | "paused" | "revoked";
  eventCount: number;
  lastSeenAt: string | null;
  transport: "fleet_api" | "fleet_telemetry";
  storageRegion: "cn";
};

export type PullEventsResult = {
  events: unknown[];
  nextOffset: number;
  total: number;
};

export class CloudCollectStorageError extends Error {
  constructor(
    message: string,
    readonly code: "storage_not_configured" | "tenant_not_found" | "db_error",
  ) {
    super(message);
    this.name = "CloudCollectStorageError";
  }
}

function eventSyncKey(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const rec = event as Record<string, unknown>;
  if (typeof rec.syncKey === "string") return rec.syncKey;
  const payload = rec.payload as Record<string, unknown> | undefined;
  if (payload && typeof payload.syncKey === "string") return payload.syncKey;
  return null;
}

function mergeCloudEvent(existing: unknown, incoming: unknown): unknown {
  if (!existing || typeof existing !== "object") return incoming;
  if (!incoming || typeof incoming !== "object") return existing;
  const a = existing as Record<string, unknown>;
  const b = incoming as Record<string, unknown>;
  const mergedPayload = {
    ...(typeof a.payload === "object" && a.payload ? a.payload : {}),
    ...(typeof b.payload === "object" && b.payload ? b.payload : {}),
  };
  return { ...a, ...b, payload: mergedPayload };
}

type MemoryTenant = {
  tenantId: string;
  storageRegion: "cn";
  transport: "fleet_api" | "fleet_telemetry";
  retentionDays: number;
  consentAcceptedAt: string;
  disclosureVersion: number;
  disclosureAcceptedAt: string;
  vehicles: VehicleRef[];
  refreshTokenHash: string;
  refreshTokenVault?: EncryptedRefreshTokenVault;
  collectorStatus: "active" | "paused" | "revoked";
  registeredAt: string;
  lastSeenAt: string | null;
  events: unknown[];
  eventIndex: Map<string, number>;
};

const memoryTenants = new Map<string, MemoryTenant>();

function useMemoryFallback(): boolean {
  return process.env.TELOG_CLOUD_COLLECT_ALLOW_MEMORY === "1";
}

function upsertTenantEventMemory(tenant: MemoryTenant, event: unknown): void {
  const key = eventSyncKey(event);
  if (!key) {
    tenant.events.push(event);
    return;
  }
  const idx = tenant.eventIndex.get(key);
  if (idx == null) {
    tenant.eventIndex.set(key, tenant.events.length);
    tenant.events.push(event);
    return;
  }
  tenant.events[idx] = mergeCloudEvent(tenant.events[idx], event);
}

async function registerTenantMemory(input: RegisterTenantInput): Promise<RegisterTenantResult> {
  const tenantId = randomUUID();
  const registeredAt = new Date().toISOString();
  const vault = sealRefreshToken(tenantId, input.refreshToken);
  memoryTenants.set(tenantId, {
    tenantId,
    storageRegion: "cn",
    transport: input.transport,
    retentionDays: input.retentionDays,
    consentAcceptedAt: input.consentAcceptedAt,
    disclosureVersion: input.disclosureVersion,
    disclosureAcceptedAt: input.disclosureAcceptedAt,
    vehicles: input.vehicles,
    refreshTokenHash: hashRefreshToken(input.refreshToken),
    refreshTokenVault: vault ?? undefined,
    collectorStatus: "active",
    registeredAt,
    lastSeenAt: registeredAt,
    events: [],
    eventIndex: new Map(),
  });
  return {
    tenantId,
    transport: input.transport,
    storageRegion: "cn",
    collectorStatus: "active",
    registeredAt,
    tokenVaultStored: Boolean(vault),
  };
}

async function registerTenantSupabase(
  sb: SupabaseClient,
  input: RegisterTenantInput,
): Promise<RegisterTenantResult> {
  const tenantId = randomUUID();
  const registeredAt = new Date().toISOString();
  const vault = sealRefreshToken(tenantId, input.refreshToken);

  const { error } = await sb.from("telog_cloud_tenants").insert({
    tenant_id: tenantId,
    storage_region: input.storageRegion,
    transport: input.transport,
    retention_days: input.retentionDays,
    consent_accepted_at: input.consentAcceptedAt,
    disclosure_version: input.disclosureVersion,
    disclosure_accepted_at: input.disclosureAcceptedAt,
    vehicles: input.vehicles,
    refresh_token_hash: hashRefreshToken(input.refreshToken),
    refresh_token_vault: vault,
    collector_status: "active",
    registered_at: registeredAt,
    last_seen_at: registeredAt,
  });

  if (error) {
    throw new CloudCollectStorageError(error.message, "db_error");
  }

  return {
    tenantId,
    transport: input.transport,
    storageRegion: "cn",
    collectorStatus: "active",
    registeredAt,
    tokenVaultStored: Boolean(vault),
  };
}

export async function registerCloudCollectTenant(
  input: RegisterTenantInput,
): Promise<RegisterTenantResult> {
  const sb = createServiceSupabase();
  if (sb) return registerTenantSupabase(sb, input);
  if (useMemoryFallback()) return registerTenantMemory(input);
  throw new CloudCollectStorageError(
    "Supabase not configured — run migration_telog_cloud_collect.sql",
    "storage_not_configured",
  );
}

export async function appendCloudCollectEvents(
  tenantId: string,
  events: unknown[],
): Promise<{ accepted: number; collectorStatus: string }> {
  if (events.length === 0) {
    throw new CloudCollectStorageError("empty_events", "db_error");
  }

  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) {
      throw new CloudCollectStorageError("storage_not_configured", "storage_not_configured");
    }
    const tenant = memoryTenants.get(tenantId);
    if (!tenant || tenant.collectorStatus === "revoked") {
      throw new CloudCollectStorageError("tenant_not_found", "tenant_not_found");
    }
    for (const event of events) {
      upsertTenantEventMemory(tenant, event);
    }
    tenant.lastSeenAt = new Date().toISOString();
    const maxEvents = 10_000;
    if (tenant.events.length > maxEvents) {
      const drop = tenant.events.length - maxEvents;
      tenant.events = tenant.events.slice(drop);
      tenant.eventIndex.clear();
      tenant.events.forEach((e, i) => {
        const key = eventSyncKey(e);
        if (key) tenant.eventIndex.set(key, i);
      });
    }
    return { accepted: events.length, collectorStatus: tenant.collectorStatus };
  }

  const { data: tenant, error: tenantErr } = await sb
    .from("telog_cloud_tenants")
    .select("tenant_id, collector_status")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (tenantErr) throw new CloudCollectStorageError(tenantErr.message, "db_error");
  if (!tenant || tenant.collector_status === "revoked") {
    throw new CloudCollectStorageError("tenant_not_found", "tenant_not_found");
  }

  for (const event of events) {
    const syncKey = eventSyncKey(event);
    if (syncKey) {
      const { data: existing } = await sb
        .from("telog_cloud_events")
        .select("id, event")
        .eq("tenant_id", tenantId)
        .eq("sync_key", syncKey)
        .maybeSingle();

      if (existing) {
        await sb
          .from("telog_cloud_events")
          .update({ event: mergeCloudEvent(existing.event, event) })
          .eq("id", existing.id);
      } else {
        await sb.from("telog_cloud_events").insert({
          tenant_id: tenantId,
          sync_key: syncKey,
          event,
        });
      }
    } else {
      await sb.from("telog_cloud_events").insert({
        tenant_id: tenantId,
        sync_key: null,
        event,
      });
    }
  }

  const now = new Date().toISOString();
  await sb.from("telog_cloud_tenants").update({ last_seen_at: now }).eq("tenant_id", tenantId);

  return { accepted: events.length, collectorStatus: tenant.collector_status };
}

export async function revokeCloudCollectTenant(tenantId: string): Promise<void> {
  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) {
      throw new CloudCollectStorageError("storage_not_configured", "storage_not_configured");
    }
    const tenant = memoryTenants.get(tenantId);
    if (tenant) {
      destroyRefreshTokenVault(tenant.refreshTokenVault);
      memoryTenants.delete(tenantId);
    }
    return;
  }

  const { data } = await sb
    .from("telog_cloud_tenants")
    .select("refresh_token_vault")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (data?.refresh_token_vault) {
    destroyRefreshTokenVault(data.refresh_token_vault as EncryptedRefreshTokenVault);
  }

  const { error } = await sb.from("telog_cloud_tenants").delete().eq("tenant_id", tenantId);
  if (error) throw new CloudCollectStorageError(error.message, "db_error");
}

export async function getCloudCollectTenantStatus(tenantId: string): Promise<TenantStatus | null> {
  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) return null;
    const tenant = memoryTenants.get(tenantId);
    if (!tenant || tenant.collectorStatus === "revoked") return null;
    return {
      tenantId: tenant.tenantId,
      collectorStatus: tenant.collectorStatus,
      eventCount: tenant.events.length,
      lastSeenAt: tenant.lastSeenAt,
      transport: tenant.transport,
      storageRegion: tenant.storageRegion,
    };
  }

  const { data: tenant, error } = await sb
    .from("telog_cloud_tenants")
    .select("tenant_id, collector_status, last_seen_at, transport, storage_region")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new CloudCollectStorageError(error.message, "db_error");
  if (!tenant || tenant.collector_status === "revoked") return null;

  const { count } = await sb
    .from("telog_cloud_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  return {
    tenantId: tenant.tenant_id,
    collectorStatus: tenant.collector_status,
    eventCount: count ?? 0,
    lastSeenAt: tenant.last_seen_at,
    transport: tenant.transport,
    storageRegion: tenant.storage_region,
  };
}

export async function pullCloudCollectEvents(
  tenantId: string,
  offset: number,
  limit: number,
): Promise<PullEventsResult> {
  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) {
      throw new CloudCollectStorageError("storage_not_configured", "storage_not_configured");
    }
    const tenant = memoryTenants.get(tenantId);
    if (!tenant || tenant.collectorStatus === "revoked") {
      throw new CloudCollectStorageError("tenant_not_found", "tenant_not_found");
    }
    const slice = tenant.events.slice(offset, offset + limit);
    return {
      events: slice,
      nextOffset: offset + slice.length,
      total: tenant.events.length,
    };
  }

  const { count } = await sb
    .from("telog_cloud_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { data, error } = await sb
    .from("telog_cloud_events")
    .select("event")
    .eq("tenant_id", tenantId)
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new CloudCollectStorageError(error.message, "db_error");

  const events = (data ?? []).map(row => row.event);
  return {
    events,
    nextOffset: offset + events.length,
    total: count ?? 0,
  };
}

/** Active tenants for optional 7×24 collector cron. */
export async function listActiveCloudCollectTenants(): Promise<
  Array<{ tenantId: string; transport: string; refreshTokenVault: EncryptedRefreshTokenVault | null }>
> {
  const sb = createServiceSupabase();
  if (!sb) {
    if (!useMemoryFallback()) return [];
    return [...memoryTenants.values()]
      .filter(t => t.collectorStatus === "active")
      .map(t => ({
        tenantId: t.tenantId,
        transport: t.transport,
        refreshTokenVault: t.refreshTokenVault ?? null,
      }));
  }

  const { data, error } = await sb
    .from("telog_cloud_tenants")
    .select("tenant_id, transport, refresh_token_vault")
    .eq("collector_status", "active");

  if (error) throw new CloudCollectStorageError(error.message, "db_error");

  return (data ?? []).map(row => ({
    tenantId: row.tenant_id,
    transport: row.transport,
    refreshTokenVault: (row.refresh_token_vault as EncryptedRefreshTokenVault | null) ?? null,
  }));
}
