import { NextRequest, NextResponse } from "next/server";

import {
  RedeemCodeError,
  redeemMembershipCode,
} from "@/lib/telog/redeemCodeStore";

/**
 * TeLog Cloud membership redeem — server-side code validation.
 * POST { subject: "apple:<id>" | "phone:<e164>", code: "TELOG-..." }
 * → { ok: true, months: number }
 */
function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
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

  const subject = String(body.subject ?? "").trim();
  const code = String(body.code ?? "");
  if (!subject) {
    return NextResponse.json({ error: "missing_subject" }, { status: 400 });
  }

  try {
    const result = await redeemMembershipCode(subject, code);
    return NextResponse.json({ ok: true, months: result.months });
  } catch (e) {
    if (e instanceof RedeemCodeError) {
      if (e.code === "storage_not_configured") {
        return NextResponse.json(
          {
            error: "backend_not_configured",
            hint: "Run supabase/migration_telog_redeem_codes.sql",
          },
          { status: 503 },
        );
      }
      const status =
        e.code === "already_used"
          ? 409
          : e.code === "invalid_code"
            ? 404
            : 400;
      return NextResponse.json({ error: e.code }, { status });
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "db_error", detail: msg }, { status: 500 });
  }
}
