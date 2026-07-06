import { NextRequest, NextResponse } from "next/server";

import {
  acceptFamilyInvite,
  createFamilyInvite,
  deleteFamilyLiveSnapshot,
  FamilyShareStorageError,
  getFamilyInvite,
  getFamilyLiveSnapshot,
  revokeFamilyInvite,
  upsertFamilyLiveSnapshot,
} from "@/lib/telog/familyShareStore";

/**
 * TeLog family share invite relay — token registry + grantee binding + live snapshot relay.
 * POST { action: 'create_invite' | 'accept_invite' | 'revoke' | 'push_live', ... }
 * GET ?token= — invite metadata
 * GET ?live=1&shareLinkId=&granteeUserId= — scoped live payload for grantee
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

function stripLivePayload(
  payload: Record<string, unknown>,
  permission: "location" | "basic",
  granteeLocationConsentAt?: string,
): Record<string, unknown> {
  const out = { ...payload };
  const allowLocation =
    permission === "location" && !!granteeLocationConsentAt && out.liveLocation;
  if (!allowLocation) delete out.liveLocation;
  return out;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const live = req.nextUrl.searchParams.get("live") === "1";
  if (live) {
    const shareLinkId = req.nextUrl.searchParams.get("shareLinkId")?.trim();
    const granteeUserId = req.nextUrl.searchParams.get("granteeUserId")?.trim();
    if (!shareLinkId || !granteeUserId) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    try {
      const snapshot = await getFamilyLiveSnapshot(shareLinkId);
      if (!snapshot) {
        return NextResponse.json({ payload: {}, updatedAt: null });
      }

      const invite = await getFamilyInvite(snapshot.inviteToken);
      if (
        !invite ||
        invite.revoked ||
        invite.granteeUserId !== granteeUserId ||
        invite.shareLinkId !== shareLinkId
      ) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      const payload = stripLivePayload(
        snapshot.payload,
        invite.permission,
        invite.granteeLocationConsentAt,
      );

      return NextResponse.json({
        payload,
        updatedAt: snapshot.updatedAt,
        vehicleLabel: invite.vehicleLabel,
        ownerLabel: invite.ownerLabel,
      });
    } catch (e) {
      if (e instanceof FamilyShareStorageError) return storageErrorResponse(e);
      throw e;
    }
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
      shareLinkId: row.shareLinkId,
      ownerAccountId: row.ownerAccountId,
      granteeUserId: row.granteeUserId,
      granteePhoneMasked: row.granteePhoneMasked,
      acceptedAt: row.acceptedAt,
      vehicleLabel: row.vehicleLabel,
      ownerLabel: row.ownerLabel,
      granteeLocationConsentAt: row.granteeLocationConsentAt,
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
        vehicleLabel: String(body.vehicleLabel ?? "") || undefined,
        ownerLabel: String(body.ownerLabel ?? "") || undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "accept_invite") {
      const inviteToken = String(body.inviteToken ?? "").trim();
      await acceptFamilyInvite({
        inviteToken,
        granteeUserId: String(body.granteeUserId ?? "").trim() || undefined,
        granteePhoneMasked: String(body.granteePhoneMasked ?? "").trim() || undefined,
        granteeLocationConsentAt:
          String(body.granteeLocationConsentAt ?? "").trim() || undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "revoke") {
      const inviteToken = String(body.inviteToken ?? "").trim();
      const row = await getFamilyInvite(inviteToken);
      await revokeFamilyInvite(inviteToken);
      if (row?.shareLinkId) await deleteFamilyLiveSnapshot(row.shareLinkId);
      return NextResponse.json({ ok: true });
    }

    if (action === "push_live") {
      const shareLinkId = String(body.shareLinkId ?? "").trim();
      const inviteToken = String(body.inviteToken ?? "").trim();
      const payload = body.payload;
      if (!shareLinkId || !inviteToken || !payload || typeof payload !== "object") {
        return NextResponse.json({ error: "missing_payload" }, { status: 400 });
      }
      const invite = await getFamilyInvite(inviteToken);
      if (!invite || invite.revoked || invite.shareLinkId !== shareLinkId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      await upsertFamilyLiveSnapshot({
        shareLinkId,
        inviteToken,
        payload: payload as Record<string, unknown>,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  } catch (e) {
    if (e instanceof FamilyShareStorageError) return storageErrorResponse(e);
    throw e;
  }
}
