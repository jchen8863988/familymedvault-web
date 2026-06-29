import { NextRequest, NextResponse } from "next/server";

/**
 * TeLog family share invite relay — token only, no VIN.
 * POST { action: 'create_invite' | 'revoke', inviteToken, permission?, relation? }
 * GET ?token= — invite metadata for accept flow (future)
 */

type InviteRow = {
  permission: "location" | "basic";
  relation: string;
  revoked: boolean;
  createdAt: string;
};

const invites = new Map<string, InviteRow>();

function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const row = invites.get(token);
  if (!row || row.revoked) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    inviteToken: token,
    permission: row.permission,
    relation: row.relation,
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

  if (action === "create_invite") {
    const inviteToken = String(body.inviteToken ?? "").trim();
    const permission = body.permission === "location" ? "location" : "basic";
    const relation = String(body.relation ?? "").trim() || "家庭成员";
    if (!inviteToken) {
      return NextResponse.json({ error: "missing_token" }, { status: 400 });
    }
    invites.set(inviteToken, {
      permission,
      relation,
      revoked: false,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    const inviteToken = String(body.inviteToken ?? "").trim();
    const row = invites.get(inviteToken);
    if (row) {
      row.revoked = true;
      invites.set(inviteToken, row);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
}
