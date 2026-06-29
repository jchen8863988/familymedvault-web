import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";

/**
 * TeLog CN cloud-collect — multi-tenant 7×24 collector registry (stub).
 * Production: persist to CN-region DB + TeslaMate Elixir / Fleet Telemetry workers.
 *
 * Actions (POST body.action):
 *   register — create tenant, store encrypted refresh token ref
 *   events   — append telemetry batch for tenant
 *   revoke   — delete tenant + all events
 *
 * GET ?tenantId= — collector status
 */

type VehicleRef = { carId: string; vin: string; fleetVehicleId: string };

type TenantRecord = {
  tenantId: string;
  storageRegion: "cn";
  transport: "fleet_api" | "fleet_telemetry";
  retentionDays: number;
  consentAcceptedAt: string;
  disclosureVersion: number;
  disclosureAcceptedAt: string;
  vehicles: VehicleRef[];
  refreshTokenHash: string;
  collectorStatus: "active" | "paused" | "revoked";
  registeredAt: string;
  lastSeenAt: string | null;
  events: unknown[];
  /** syncKey → index in events — idempotent (VIN, eventType, startTime). */
  eventIndex: Map<string, number>;
};

const tenants = new Map<string, TenantRecord>();

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

function upsertTenantEvent(tenant: TenantRecord, event: unknown): void {
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

function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant_id" }, { status: 400 });
  }

  const tenant = tenants.get(tenantId);
  if (!tenant || tenant.collectorStatus === "revoked") {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  const pull = req.nextUrl.searchParams.get("pull");
  if (pull === "1") {
    const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0));
    const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 100)), 500);
    const slice = tenant.events.slice(offset, offset + limit);
    return NextResponse.json({
      events: slice,
      nextOffset: offset + slice.length,
      total: tenant.events.length,
    });
  }

  return NextResponse.json({
    tenantId: tenant.tenantId,
    collectorStatus: tenant.collectorStatus,
    eventCount: tenant.events.length,
    lastSeenAt: tenant.lastSeenAt,
    transport: tenant.transport,
    storageRegion: tenant.storageRegion,
  });
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "register") {
    const refreshToken = String(body.refreshToken ?? "");
    const vehicles = body.vehicles as VehicleRef[] | undefined;
    if (!refreshToken || !vehicles?.length) {
      return NextResponse.json({ error: "missing_register_fields" }, { status: 400 });
    }

    const tenantId = randomUUID();
    const registeredAt = new Date().toISOString();
    const record: TenantRecord = {
      tenantId,
      storageRegion: "cn",
      transport: (body.transport as TenantRecord["transport"]) ?? "fleet_api",
      retentionDays: Number(body.retentionDays ?? 365),
      consentAcceptedAt: String(body.consentAcceptedAt ?? registeredAt),
      disclosureVersion: Number(body.disclosureVersion ?? 1),
      disclosureAcceptedAt: String(body.disclosureAcceptedAt ?? registeredAt),
      vehicles,
      refreshTokenHash: hashToken(refreshToken),
      collectorStatus: "active",
      registeredAt,
      lastSeenAt: registeredAt,
      events: [],
      eventIndex: new Map(),
    };
    tenants.set(tenantId, record);

    return NextResponse.json({
      tenantId,
      transport: record.transport,
      storageRegion: record.storageRegion,
      collectorStatus: record.collectorStatus,
      registeredAt,
    });
  }

  if (action === "events") {
    const tenantId = String(body.tenantId ?? "");
    const events = body.events as unknown[] | undefined;
    const tenant = tenants.get(tenantId);
    if (!tenant || tenant.collectorStatus === "revoked") {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "empty_events" }, { status: 400 });
    }

    for (const event of events) {
      upsertTenantEvent(tenant, event);
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

    return NextResponse.json({
      accepted: events.length,
      collectorStatus: tenant.collectorStatus,
    });
  }

  if (action === "revoke") {
    const tenantId = String(body.tenantId ?? "");
    const tenant = tenants.get(tenantId);
    if (tenant) {
      tenant.collectorStatus = "revoked";
      tenant.events = [];
      tenants.delete(tenantId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
