/**
 * TeslaMate-style 7×24 cloud collector — server polls Tesla CN Fleet API per tenant.
 *
 * Deploy: Vercel Cron → GET /api/telog/cloud-collect/collector
 * Schedule: every 5–15 minutes (see vercel.json).
 */
import { appendCloudCollectEvents, listActiveCloudCollectTenants } from "@/lib/telog/cloudCollectStore";
import type { VehicleRef } from "@/lib/telog/cloudCollectStore";
import { openRefreshToken } from "@/lib/telog/tokenVault";
import {
  fetchVehicleDataSnapshot,
  refreshTeslaAccessToken,
  snapshotSyncKey,
} from "@/lib/telog/teslaCnFleetClient";

export type CollectorTickResult = {
  tenants: number;
  polled: number;
  eventsAppended: number;
  errors: string[];
};

function buildSnapshotEvent(vehicle: VehicleRef, snapshot: Awaited<ReturnType<typeof fetchVehicleDataSnapshot>>) {
  if (!snapshot) return null;
  const at = snapshot.recordedAt;
  return {
    carId: vehicle.carId,
    kind: "snapshot" as const,
    at,
    syncKey: snapshotSyncKey(vehicle.vin, new Date(at)),
    vin: vehicle.vin,
    eventType: "state" as const,
    startTime: at,
    payload: {
      fleetVehicleId: vehicle.fleetVehicleId,
      state: snapshot.state,
      batteryLevel: snapshot.batteryLevel,
      batteryRangeKm: snapshot.batteryRangeKm,
      odometerKm: snapshot.odometerKm,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      chargingState: snapshot.chargingState,
      source: "cloud_collector",
      snapshot: snapshot.raw,
    },
  };
}

export async function runCloudCollectCollectorTick(): Promise<CollectorTickResult> {
  const tenants = await listActiveCloudCollectTenants();
  const errors: string[] = [];
  let polled = 0;
  let eventsAppended = 0;

  for (const tenant of tenants) {
    if (tenant.transport !== "fleet_api") continue;

    const refreshToken = tenant.refreshTokenVault
      ? openRefreshToken(tenant.tenantId, tenant.refreshTokenVault)
      : null;
    if (!refreshToken) {
      errors.push(`${tenant.tenantId}: missing_refresh_token_vault`);
      continue;
    }

    const accessToken = await refreshTeslaAccessToken(refreshToken);
    if (!accessToken) {
      errors.push(`${tenant.tenantId}: token_refresh_failed`);
      continue;
    }

    const vehicles = tenant.vehicles ?? [];
    if (vehicles.length === 0) {
      errors.push(`${tenant.tenantId}: no_vehicles`);
      continue;
    }

    const events: unknown[] = [];
    for (const vehicle of vehicles) {
      if (!vehicle.fleetVehicleId || !vehicle.vin) continue;
      const snapshot = await fetchVehicleDataSnapshot(accessToken, vehicle.fleetVehicleId);
      polled += 1;
      if (!snapshot) {
        errors.push(`${tenant.tenantId}:${vehicle.vin}: vehicle_data_failed`);
        continue;
      }
      const event = buildSnapshotEvent(vehicle, snapshot);
      if (event) events.push(event);
    }

    if (events.length === 0) continue;

    try {
      const result = await appendCloudCollectEvents(tenant.tenantId, events);
      eventsAppended += result.accepted;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "append_failed";
      errors.push(`${tenant.tenantId}: ${msg}`);
    }
  }

  return { tenants: tenants.length, polled, eventsAppended, errors };
}
