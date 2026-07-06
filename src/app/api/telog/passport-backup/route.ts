import { NextRequest, NextResponse } from "next/server";

import {
  deletePassportBackup,
  PassportBackupStorageError,
  pullPassportBackup,
  pushPassportBackup,
  type PassportAutoSnapshotPayload,
  type PassportBackupEntry,
} from "@/lib/telog/passportBackupStore";

/**
 * TeLog passport cloud backup — manual entries + auto snapshot.
 * POST { action: 'push' | 'pull' | 'delete', deviceId, vinSuffix, entries?, autoSnapshot? }
 */

function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
}

function storageErrorResponse(err: PassportBackupStorageError): NextResponse {
  if (err.code === "storage_not_configured") {
    return NextResponse.json(
      {
        error: "backend_not_configured",
        hint: "Run supabase/migration_telog_passport_backup.sql and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "db_error", detail: err.message }, { status: 500 });
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
  const deviceId = String(body.deviceId ?? "").trim();
  const vinSuffix = String(body.vinSuffix ?? "").trim();
  if (!deviceId || !vinSuffix) {
    return NextResponse.json({ error: "missing_ids" }, { status: 400 });
  }

  try {
    if (action === "push") {
      const entries = Array.isArray(body.entries)
        ? (body.entries as PassportBackupEntry[])
        : [];
      const autoSnapshot = body.autoSnapshot
        ? (body.autoSnapshot as PassportAutoSnapshotPayload)
        : null;
      await pushPassportBackup({ deviceId, vinSuffix, entries, autoSnapshot });
      return NextResponse.json({ ok: true });
    }

    if (action === "pull") {
      const row = await pullPassportBackup(deviceId, vinSuffix);
      return NextResponse.json({
        ok: true,
        entries: row?.entries ?? [],
        autoSnapshot: row?.autoSnapshot ?? null,
        updatedAt: row?.updatedAt ?? null,
      });
    }

    if (action === "delete") {
      await deletePassportBackup(deviceId, vinSuffix);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (err) {
    if (err instanceof PassportBackupStorageError) {
      return storageErrorResponse(err);
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
