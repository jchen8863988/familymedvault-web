import { NextRequest, NextResponse } from "next/server";

import {
  appendCloudCollectEvents,
  CloudCollectStorageError,
  getCloudCollectTenantStatus,
  pullCloudCollectEvents,
  registerCloudCollectTenant,
  revokeCloudCollectTenant,
  type RegisterTenantInput,
} from "@/lib/telog/cloudCollectStore";

/**
 * TeLog CN cloud-collect — multi-tenant 7×24 collector registry.
 * Persistence: Supabase (migration_telog_cloud_collect.sql).
 *
 * POST body.action: register | events | revoke
 * GET ?tenantId= — status or ?pull=1 for sync batch
 * GET /collector — optional cron tick (authorize required)
 */

function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
}

function storageErrorResponse(err: CloudCollectStorageError): NextResponse {
  if (err.code === "storage_not_configured") {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }
  if (err.code === "tenant_not_found") {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }
  return NextResponse.json({ error: "db_error", detail: err.message }, { status: 500 });
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant_id" }, { status: 400 });
  }

  try {
    const pull = req.nextUrl.searchParams.get("pull");
    if (pull === "1") {
      const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0));
      const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 100)), 500);
      const batch = await pullCloudCollectEvents(tenantId, offset, limit);
      return NextResponse.json(batch);
    }

    const status = await getCloudCollectTenantStatus(tenantId);
    if (!status) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (e) {
    if (e instanceof CloudCollectStorageError) return storageErrorResponse(e);
    throw e;
  }
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

  try {
    if (action === "register") {
      const refreshToken = String(body.refreshToken ?? "");
      const vehicles = body.vehicles as RegisterTenantInput["vehicles"] | undefined;
      if (!refreshToken || !vehicles?.length) {
        return NextResponse.json({ error: "missing_register_fields" }, { status: 400 });
      }

      const result = await registerCloudCollectTenant({
        retentionDays: Number(body.retentionDays ?? 365),
        storageRegion: "cn",
        transport: (body.transport as RegisterTenantInput["transport"]) ?? "fleet_api",
        consentAcceptedAt: String(body.consentAcceptedAt ?? new Date().toISOString()),
        disclosureVersion: Number(body.disclosureVersion ?? 1),
        disclosureAcceptedAt: String(body.disclosureAcceptedAt ?? new Date().toISOString()),
        vehicles,
        refreshToken,
      });

      return NextResponse.json(result);
    }

    if (action === "events") {
      const tenantId = String(body.tenantId ?? "");
      const events = body.events as unknown[] | undefined;
      if (!tenantId) {
        return NextResponse.json({ error: "missing_tenant_id" }, { status: 400 });
      }
      const result = await appendCloudCollectEvents(tenantId, events ?? []);
      return NextResponse.json(result);
    }

    if (action === "revoke") {
      const tenantId = String(body.tenantId ?? "");
      if (!tenantId) {
        return NextResponse.json({ error: "missing_tenant_id" }, { status: 400 });
      }
      await revokeCloudCollectTenant(tenantId);
      return NextResponse.json({ ok: true, tokenDestroyed: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    if (e instanceof CloudCollectStorageError) return storageErrorResponse(e);
    throw e;
  }
}
