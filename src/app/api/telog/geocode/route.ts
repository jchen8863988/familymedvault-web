import { NextRequest, NextResponse } from "next/server";

const AMAP_REGEO = "https://restapi.amap.com/v3/geocode/regeo";
const AMAP_GEO = "https://restapi.amap.com/v3/geocode/geo";
const AMAP_POI_AROUND = "https://restapi.amap.com/v3/place/around";
const AMAP_POI_TEXT = "https://restapi.amap.com/v3/place/text";

const AMAP_TIMEOUT_MS = 8_000;

/** Prefer POI within this of the map center (first pass). */
const AROUND_RADIUS_NEAR_M = 20_000;
/** Second pass when the POI is a bit farther in the same metro. */
const AROUND_RADIUS_FAR_M = 50_000;
/**
 * Reject /geocode/geo hits farther than this from `near`.
 * City-scoped address geocode often returns a same-named street 20km+ away.
 */
const GEO_MAX_FROM_NEAR_M = 12_000;
/** Last-resort nationwide POI must still stay near the map when bias is set. */
const NATIONWIDE_MAX_FROM_NEAR_M = 80_000;

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

type AmapPoi = { location?: string; name?: string; address?: string; distance?: string };
type AmapPoiResponse = {
  status?: string;
  pois?: AmapPoi[];
};

type ForwardHit = { location: string; formatted: string; label: string };

function parseGcj(location: string): { lat: number; lng: number } | null {
  const [lngS, latS] = location.split(",");
  const lat = Number(latS);
  const lng = Number(lngS);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

function distanceFromNearM(location: string, nearGcj: string): number {
  const a = parseGcj(location);
  const b = parseGcj(nearGcj);
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return haversineM(a.lat, a.lng, b.lat, b.lng);
}

function poiHit(poi: AmapPoi | undefined): ForwardHit | null {
  if (!poi?.location) return null;
  const label = [poi.name, typeof poi.address === "string" ? poi.address : ""]
    .filter(Boolean)
    .join(" · ");
  return {
    location: poi.location,
    formatted: label || poi.name || "",
    label: label || poi.name || "",
  };
}

/** Prefer POIs whose name shares tokens with the query (e.g. 特斯拉 / 温岭). */
function scorePoi(poi: AmapPoi, query: string, nearGcj: string | null): number {
  const name = (poi.name ?? "").toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, "");
  let score = 0;
  if (name && q && name.includes(q)) score += 1000;
  // Token overlap for Chinese POI names (2+ char chunks).
  for (let i = 0; i < q.length - 1; i++) {
    const tok = q.slice(i, i + 2);
    if (name.includes(tok)) score += 20;
  }
  if (nearGcj && poi.location) {
    const d = distanceFromNearM(poi.location, nearGcj);
    // Closer is better; keep within a useful range.
    score += Math.max(0, 500 - d / 100);
  }
  return score;
}

function bestPoi(pois: AmapPoi[] | undefined, query: string, nearGcj: string | null): ForwardHit | null {
  if (!pois?.length) return null;
  let best: AmapPoi | undefined;
  let bestScore = -Infinity;
  for (const poi of pois) {
    if (!poi.location) continue;
    const s = scorePoi(poi, query, nearGcj);
    if (s > bestScore) {
      bestScore = s;
      best = poi;
    }
  }
  return poiHit(best);
}

/** Resolve the city adcode of the bias point so searches stay local. */
async function resolveNearAdcode(amapKey: string, nearGcj: string): Promise<string | null> {
  const params = new URLSearchParams({
    key: amapKey,
    location: nearGcj,
    extensions: "base",
    output: "json",
  });
  const res = await fetchAmapJson<{
    status?: string;
    regeocode?: { addressComponent?: { adcode?: unknown } };
  }>(`${AMAP_REGEO}?${params}`);
  const adcode = res?.status === "1" ? res.regeocode?.addressComponent?.adcode : null;
  // Amap serializes missing fields as [] — only accept a non-empty string.
  return typeof adcode === "string" && adcode.length > 0 ? adcode : null;
}

async function searchAround(
  amapKey: string,
  keywords: string,
  nearGcj: string,
  radiusM: number,
): Promise<ForwardHit | null> {
  const aroundParams = new URLSearchParams({
    key: amapKey,
    keywords,
    location: nearGcj,
    radius: String(radiusM),
    sortrule: "distance",
    offset: "10",
    output: "json",
  });
  const around = await fetchAmapJson<AmapPoiResponse>(`${AMAP_POI_AROUND}?${aroundParams}`);
  if (around?.status !== "1") return null;
  return bestPoi(around.pois, keywords, nearGcj);
}

/**
 * Local-first search. With a map `near` bias we MUST try nearby POI before
 * /geocode/geo — the address index returns same-named streets tens of km away
 * (e.g. searching 特斯拉中心 while looking at 温岭特斯拉中心).
 * Order with near: around → city POI → near-checked geo → near-checked nationwide.
 * Without near: geo → nationwide POI (legacy).
 */
async function forwardSearch(
  amapKey: string,
  address: string,
  nearGcj: string | null,
): Promise<ForwardHit | null> {
  const adcode = nearGcj ? await resolveNearAdcode(amapKey, nearGcj) : null;

  if (nearGcj) {
    const nearHit =
      (await searchAround(amapKey, address, nearGcj, AROUND_RADIUS_NEAR_M)) ??
      (await searchAround(amapKey, address, nearGcj, AROUND_RADIUS_FAR_M));
    if (nearHit) return nearHit;
  }

  if (adcode) {
    const cityParams = new URLSearchParams({
      key: amapKey,
      keywords: address,
      city: adcode,
      citylimit: "true",
      offset: "10",
      output: "json",
    });
    const cityText = await fetchAmapJson<AmapPoiResponse>(`${AMAP_POI_TEXT}?${cityParams}`);
    const cityHit =
      cityText?.status === "1" ? bestPoi(cityText.pois, address, nearGcj) : null;
    if (cityHit) {
      if (
        !nearGcj ||
        distanceFromNearM(cityHit.location, nearGcj) <= AROUND_RADIUS_FAR_M
      ) {
        return cityHit;
      }
    }
  }

  const geoParams = new URLSearchParams({ key: amapKey, address, output: "json" });
  if (adcode) geoParams.set("city", adcode);
  const geo = await fetchAmapJson<AmapGeoResponse>(`${AMAP_GEO}?${geoParams}`);
  const g = geo?.status === "1" ? geo.geocodes?.[0] : undefined;
  if (g?.location) {
    if (!nearGcj || distanceFromNearM(g.location, nearGcj) <= GEO_MAX_FROM_NEAR_M) {
      return {
        location: g.location,
        formatted: g.formatted_address ?? address,
        label: g.formatted_address ?? address,
      };
    }
    // Far geo hit discarded — keep searching.
  }

  const textParams = new URLSearchParams({
    key: amapKey,
    keywords: address,
    offset: "10",
    output: "json",
  });
  if (adcode) {
    textParams.set("city", adcode);
  }
  const text = await fetchAmapJson<AmapPoiResponse>(`${AMAP_POI_TEXT}?${textParams}`);
  const nationHit = text?.status === "1" ? bestPoi(text.pois, address, nearGcj) : null;
  if (!nationHit) return null;
  if (
    nearGcj &&
    distanceFromNearM(nationHit.location, nearGcj) > NATIONWIDE_MAX_FROM_NEAR_M
  ) {
    return null;
  }
  return nationHit;
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
 *   正向地理（返回 GCJ location + formatted）；有 near 时优先周边 POI，
 *   避免 /geocode/geo 跳到同市 20km+ 外的同名街道。
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
