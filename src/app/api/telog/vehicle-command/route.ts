import { NextRequest, NextResponse } from "next/server";

const TESLA_CN_FLEET_API = "https://fleet-api.prd.cn.vn.cloud.tesla.cn";

/**
 * TeLog signed vehicle commands (Tesla Vehicle Command Protocol).
 *
 * App POSTs { vin, command, body?, accessToken } with Bearer TESLA_CN_AUTH_PROXY_KEY.
 * Forwards to tesla-http-proxy (TESLA_VEHICLE_COMMAND_PROXY_URL), which signs with the
 * partner private key before calling Fleet API.
 *
 * Requires:
 * - Public key at /.well-known/appspecific/com.tesla.3p.public-key.pem
 * - tesla-http-proxy running with matching private key (see scripts/tesla-vehicle-command-proxy)
 * - User paired virtual key: https://www.tesla.cn/_ak/www.familymedvault.com?vin=VIN
 */
export async function POST(req: NextRequest) {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!proxyKey || bearer !== proxyKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const commandProxyBase = process.env.TESLA_VEHICLE_COMMAND_PROXY_URL?.replace(/\/$/, "");
  if (!commandProxyBase) {
    return NextResponse.json(
      {
        error: "command_proxy_not_configured",
        detail: "Set TESLA_VEHICLE_COMMAND_PROXY_URL to your tesla-http-proxy base URL",
      },
      { status: 503 },
    );
  }

  let payload: {
    vin?: string;
    command?: string;
    body?: Record<string, unknown>;
    accessToken?: string;
  };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const vin = payload.vin?.trim().toUpperCase();
  const command = payload.command?.trim();
  const accessToken = payload.accessToken?.trim();

  if (!vin || !command || !accessToken) {
    return NextResponse.json({ error: "missing_vin_command_or_token" }, { status: 400 });
  }

  const body = payload.body ?? {};
  // TeslaMateApi uses /wake_up directly, not /command/wake_up.
  const targetUrl =
    command === "wake_up"
      ? `${commandProxyBase}/api/1/vehicles/${encodeURIComponent(vin)}/wake_up`
      : `${commandProxyBase}/api/1/vehicles/${encodeURIComponent(vin)}/command/${encodeURIComponent(command)}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let json: unknown = text;
    try {
      json = JSON.parse(text);
    } catch {
      // raw text
    }

    return NextResponse.json(json, { status: upstream.status });
  } catch (e) {
    return NextResponse.json(
      {
        error: "command_proxy_unreachable",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}

/** Health check — verifies proxy URL is configured (not that proxy is up). */
export async function GET(req: NextRequest) {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!proxyKey || bearer !== proxyKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const configured = Boolean(process.env.TESLA_VEHICLE_COMMAND_PROXY_URL?.trim());
  return NextResponse.json({
    configured,
    fleetApiHost: TESLA_CN_FLEET_API,
  });
}
