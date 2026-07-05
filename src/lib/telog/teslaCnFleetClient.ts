/**
 * Server-side Tesla CN Fleet API — used by cloud-collect collector only.
 */
const TESLA_CN_TOKEN_URL = "https://auth.tesla.cn/oauth2/v3/token";
const TESLA_CN_FLEET_API = "https://fleet-api.prd.cn.vn.cloud.tesla.cn";

export type TeslaTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

export async function refreshTeslaAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.TESLA_CN_CLIENT_ID;
  const clientSecret = process.env.TESLA_CN_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const res = await fetch(TESLA_CN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as TeslaTokenResponse;
    if (!res.ok || !data.access_token) return null;
    return data.access_token;
  } catch {
    return null;
  }
}

export type VehicleDataSnapshot = {
  recordedAt: string;
  state: string;
  batteryLevel: number | null;
  batteryRangeKm: number | null;
  odometerKm: number | null;
  latitude: number | null;
  longitude: number | null;
  chargingState: string | null;
  raw: Record<string, unknown>;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Poll vehicle_data — same endpoint as TeLog local collector. */
export async function fetchVehicleDataSnapshot(
  accessToken: string,
  fleetVehicleId: string,
): Promise<VehicleDataSnapshot | null> {
  try {
    const res = await fetch(`${TESLA_CN_FLEET_API}/api/1/vehicles/${fleetVehicleId}/vehicle_data`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { response?: Record<string, unknown> };
    const response = json.response ?? {};
    const charge = (response.charge_state ?? {}) as Record<string, unknown>;
    const drive = (response.drive_state ?? {}) as Record<string, unknown>;
    const vehicle = (response.vehicle_state ?? {}) as Record<string, unknown>;

    return {
      recordedAt: new Date().toISOString(),
      state: String(response.state ?? vehicle.state ?? "unknown"),
      batteryLevel: num(charge.battery_level),
      batteryRangeKm: num(charge.est_battery_range ?? charge.rated_battery_range),
      odometerKm: num(vehicle.odometer),
      latitude: num(drive.latitude),
      longitude: num(drive.longitude),
      chargingState: charge.charging_state != null ? String(charge.charging_state) : null,
      raw: {
        state: response.state,
        charge_state: charge,
        drive_state: {
          latitude: drive.latitude,
          longitude: drive.longitude,
          speed: drive.speed,
          power: drive.power,
        },
        vehicle_state: {
          odometer: vehicle.odometer,
          software_version: vehicle.car_version,
        },
      },
    };
  } catch {
    return null;
  }
}

/** Minute bucket for idempotent snapshot sync keys. */
export function snapshotSyncKey(vin: string, at = new Date()): string {
  const d = new Date(at);
  d.setSeconds(0, 0);
  return `${vin}:snapshot:${d.toISOString()}`;
}
