import { NextRequest, NextResponse } from "next/server";

const TESLA_CN_TOKEN_URL = "https://auth.tesla.cn/oauth2/v3/token";
const TESLA_CN_AUDIENCE = "https://fleet-api.prd.cn.vn.cloud.tesla.cn";

/**
 * TeLog Tesla China token proxy — keeps client_secret off the mobile app.
 * App POSTs { grant_type, code?, redirect_uri?, refresh_token? }
 * with Authorization: Bearer TESLA_CN_AUTH_PROXY_KEY
 */
export async function POST(req: NextRequest) {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!proxyKey || bearer !== proxyKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clientId = process.env.TESLA_CN_CLIENT_ID;
  const clientSecret = process.env.TESLA_CN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  let body: Record<string, string>;
  try {
    body = (await req.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.client_secret || body.clientSecret) {
    return NextResponse.json({ error: "client_secret_forbidden_on_client" }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  });

  if (body.grant_type === "authorization_code") {
    if (!body.code || !body.redirect_uri) {
      return NextResponse.json({ error: "missing_code_or_redirect" }, { status: 400 });
    }
    params.set("grant_type", "authorization_code");
    params.set("code", body.code);
    params.set("redirect_uri", body.redirect_uri);
    params.set("audience", TESLA_CN_AUDIENCE);
  } else if (body.grant_type === "refresh_token") {
    if (!body.refresh_token) {
      return NextResponse.json({ error: "missing_refresh_token" }, { status: 400 });
    }
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", body.refresh_token);
  } else {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  try {
    const teslaRes = await fetch(TESLA_CN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await teslaRes.json();
    return NextResponse.json(data, { status: teslaRes.status });
  } catch {
    return NextResponse.json({ error: "tesla_unreachable" }, { status: 502 });
  }
}
