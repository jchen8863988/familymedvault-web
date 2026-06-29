import { NextRequest, NextResponse } from "next/server";

const AMAP_REGEO = "https://restapi.amap.com/v3/geocode/regeo";

/** WGS-84 → GCJ-02（高德坐标系） */
function wgs84ToGcj02(lat: number, lng: number): { lat: number; lng: number } {
  const PI = Math.PI;
  const A = 6378245.0;
  const EE = 0.006693421622965943;

  function outOfChina(la: number, ln: number): boolean {
    return ln < 72.004 || ln > 137.8347 || la < 0.8293 || la > 55.8271;
  }
  function transformLat(x: number, y: number): number {
    let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    ret += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
    ret += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
    return ret;
  }
  function transformLng(x: number, y: number): number {
    let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    ret += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
    ret += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
    return ret;
  }

  if (outOfChina(lat, lng)) return { lat, lng };
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return { lat: lat + dLat, lng: lng + dLng };
}

/**
 * TeLog 高德逆地理代理 — AMAP_WEB_KEY 仅存服务端。
 * GET /api/telog/geocode?lat=&lng=  (WGS-84, Tesla GPS)
 * Authorization: Bearer TESLA_CN_AUTH_PROXY_KEY
 */
export async function GET(req: NextRequest) {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!proxyKey || bearer !== proxyKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const amapKey = process.env.AMAP_WEB_KEY;
  if (!amapKey) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
  }

  const gcj = wgs84ToGcj02(lat, lng);
  const params = new URLSearchParams({
    key: amapKey,
    location: `${gcj.lng},${gcj.lat}`,
    extensions: "all",
    output: "json",
    radius: "200",
  });

  try {
    const amapRes = await fetch(`${AMAP_REGEO}?${params.toString()}`);
    const amap = await amapRes.json();
    return NextResponse.json({ amap }, { status: amapRes.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "amap_unreachable" }, { status: 502 });
  }
}
