import { NextRequest, NextResponse } from "next/server";

const TESLA_CN_TOKEN_URL = "https://auth.tesla.cn/oauth2/v3/token";
const TESLA_CN_FLEET_API = "https://fleet-api.prd.cn.vn.cloud.tesla.cn";
const DEFAULT_PARTNER_DOMAIN = "www.familymedvault.com";

/**
 * One-time Tesla CN Fleet API partner registration.
 * Requires public key at /.well-known/appspecific/com.tesla.3p.public-key.pem
 *
 * POST with Authorization: Bearer TESLA_CN_AUTH_PROXY_KEY
 * Optional body: { "domain": "www.familymedvault.com" }
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

  let domain = process.env.TESLA_CN_PARTNER_DOMAIN ?? DEFAULT_PARTNER_DOMAIN;
  try {
    const body = (await req.json()) as { domain?: string };
    if (body.domain?.trim()) domain = body.domain.trim();
  } catch {
    // empty body is fine — use env/default domain
  }

  try {
    const tokenParams = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: TESLA_CN_FLEET_API,
      scope:
        "openid offline_access user_data vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds",
    });

    const tokenRes = await fetch(TESLA_CN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        {
          error: "partner_token_failed",
          status: tokenRes.status,
          detail: tokenJson.error_description ?? tokenJson.error ?? tokenRes.statusText,
        },
        { status: 502 },
      );
    }

    const registerRes = await fetch(`${TESLA_CN_FLEET_API}/api/1/partner_accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ domain }),
    });

    const registerText = await registerRes.text();
    let registerJson: unknown = registerText;
    try {
      registerJson = JSON.parse(registerText);
    } catch {
      // keep raw text
    }

    return NextResponse.json(
      {
        domain,
        status: registerRes.status,
        response: registerJson,
      },
      { status: registerRes.ok ? 200 : registerRes.status },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "register_request_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
