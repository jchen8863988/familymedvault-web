import { NextRequest, NextResponse } from "next/server";

import { runCloudCollectCollectorTick } from "@/lib/telog/cloudCollectCollector";
import { CloudCollectStorageError } from "@/lib/telog/cloudCollectStore";

function authorize(req: NextRequest): boolean {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!proxyKey) return true;
  return bearer === proxyKey;
}

/** Optional cron: GET /api/telog/cloud-collect/collector */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCloudCollectCollectorTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof CloudCollectStorageError && e.code === "storage_not_configured") {
      return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
    }
    throw e;
  }
}
