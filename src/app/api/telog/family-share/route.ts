import { NextRequest, NextResponse } from "next/server";

import {
  acceptFamilyInvite,
  createFamilyInvite,
  FamilyShareStorageError,
  getFamilyInvite,
  revokeFamilyInvite,
} from "@/lib/telog/familyShareStore";

/**
 * TeLog family share invite relay — token registry + grantee account binding.
 * POST { action: 'create_invite' | 'accept_invite' | 'revoke', ... }
 * GET ?token= — invite metadata
 */

function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
}

function storageErrorResponse(err: FamilyShareStorageError): NextResponse {
  if (err.code === "storage_not_configured") {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }
  if (err.code === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ error: "db_error", detail: err.message }, { status: 500 });
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  try {
    const row = await getFamilyInvite(token);
    if (!row || row.revoked) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      inviteToken: row.inviteToken,
      permission: row.permission,
      relation: row.relation,
      granteeUserId: row.granteeUserId,
      granteePhoneMasked: row.granteePhoneMasked,
      acceptedAt: row.acceptedAt,
    });
  } catch (e) {
    if (e instanceof FamilyShareStorageError) return storageErrorResponse(e);
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
    if (action === "create_invite") {
      const inviteToken = String(body.inviteToken ?? "").trim();
      const permission = body.permission === "location" ? "location" : "basic";
      const relation = String(body.relation ?? "").trim() || "家庭成员";
      if (!inviteToken) {
        return NextResponse.json({ error: "missing_token" }, { status: 400 });
      }
      await createFamilyInvite({
        inviteToken,
        permission,
        relation,
        shareLinkId: String(body.shareLinkId ?? "") || undefined,
        ownerAccountId: String(body.ownerAccountId ?? "") || undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "accept_invite") {
      const inviteToken = String(body.inviteToken ?? "").trim();
      await acceptFamilyInvite({
        inviteToken,
        granteeUserId: String(body.granteeUserId ?? "").trim() || undefined,
        granteePhoneMasked: String(body.granteePhoneMasked ?? "").trim() || undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "revoke") {
      const inviteToken = String(body.inviteToken ?? "").trim();
      await revokeFamilyInvite(inviteToken);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  } catch (e) {
    if (e instanceof FamilyShareStorageError) return storageErrorResponse(e);
    throw e;
  }
}
