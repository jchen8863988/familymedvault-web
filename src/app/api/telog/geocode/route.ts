import { NextRequest, NextResponse } from "next/server";

const AMAP_REGEO = "https://restapi.amap.com/v3/geocode/regeo";
const AMAP_GEO = "https://restapi.amap.com/v3/geocode/geo";
const AMAP_POI_AROUND = "https://restapi.amap.com/v3/place/around";
const AMAP_POI_TEXT = "https://restapi.amap.com/v3/place/text";

const AMAP_TIMEOUT_MS = 8_000;

async function fetchAmapJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(AMAP_TIMEOUT_MS) });
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type AmapGeoResponse = {
  status?: string;
  geocodes?: Array<{ location?: string; formatted_address?: string }>;
};

type AmapPoiResponse = {
  status?: string;
  pois?: Array<{ location?: string; name?: string; address?: string }>;
};

function poiHit(poi: { location?: string; name?: string; address?: string } | undefined) {
  if (!poi?.location) return null;
  const label = [poi.name, typeof poi.address === "string" ? poi.address : ""]
    .filter(Boolean)
    .join(" · ");
  return { location: poi.location, formatted: label || poi.name || "", label: label || poi.name || "" };
}

/**
 * Structured geocode first; fall back to POI search so brand/place names
 * (「特斯拉中心」) and partial street addresses (「华祥路11号」) still resolve.
 * `nearGcj` = "lng,lat" (GCJ-02) biases POI search to the user's map area.
 */
async function forwardSearch(
  amapKey: string,
  address: string,
  nearGcj: string | null,
): Promise<{ location: string; formatted: string; label: string } | null> {
  const geoParams = new URLSearchParams({ key: amapKey, address, output: "json" });
  const geo = await fetchAmapJson<AmapGeoResponse>(`${AMAP_GEO}?${geoParams}`);
  const g = geo?.status === "1" ? geo.geocodes?.[0] : undefined;
  if (g?.location) {
    return {
      location: g.location,
      formatted: g.formatted_address ?? address,
      label: g.formatted_address ?? address,
    };
  }

  if (nearGcj) {
    const aroundParams = new URLSearchParams({
      key: amapKey,
      keywords: address,
      location: nearGcj,
      radius: "50000",
      sortrule: "distance",
      offset: "1",
      output: "json",
    });
    const around = await fetchAmapJson<AmapPoiResponse>(`${AMAP_POI_AROUND}?${aroundParams}`);
    const hit = around?.status === "1" ? poiHit(around.pois?.[0]) : null;
    if (hit) return hit;
  }

  const textParams = new URLSearchParams({
    key: amapKey,
    keywords: address,
    offset: "1",
    output: "json",
  });
  const text = await fetchAmapJson<AmapPoiResponse>(`${AMAP_POI_TEXT}?${textParams}`);
  return text?.status === "1" ? poiHit(text.pois?.[0]) : null;
}

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

function authorize(req: NextRequest): NextResponse | null {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!proxyKey || bearer !== proxyKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.AMAP_WEB_KEY) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  return null;
}

/**
 * TeLog 高德地理编码代理 — AMAP_WEB_KEY 仅存服务端。
 * GET /api/telog/geocode?lat=&lng=       逆地理（WGS-84）
 * GET /api/telog/geocode?address=...&near=lat,lng
 *   正向地理（返回 GCJ location + formatted）；地址库查不到时回退 POI 搜索，
 *   near（WGS-84）用于就近排序（如「特斯拉中心」优先返回附近门店）。
 * Authorization: Bearer TESLA_CN_AUTH_PROXY_KEY
 */
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  const amapKey = process.env.AMAP_WEB_KEY!;
  const address = (req.nextUrl.searchParams.get("address") ?? "").trim();

  if (address) {
    // Optional bias center — WGS-84 "lat,lng" from the app's current map view.
    let nearGcj: string | null = null;
    const near = (req.nextUrl.searchParams.get("near") ?? "").trim();
    if (near) {
      const [latS, lngS] = near.split(",");
      const nLat = Number(latS);
      const nLng = Number(lngS);
      if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
        const gcj = wgs84ToGcj02(nLat, nLng);
        nearGcj = `${gcj.lng.toFixed(6)},${gcj.lat.toFixed(6)}`;
      }
    }

    const hit = await forwardSearch(amapKey, address, nearGcj);
    if (!hit) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(hit, { status: 200 });
  }

  // Number(null) === 0 — must require the query string to be present.
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng");
  const lat = latRaw == null || latRaw === "" ? NaN : Number(latRaw);
  const lng = lngRaw == null || lngRaw === "" ? NaN : Number(lngRaw);
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
