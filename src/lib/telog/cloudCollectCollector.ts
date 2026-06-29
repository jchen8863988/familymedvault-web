/**
 * Optional TeslaMate-style 7×24 collector worker (server-side).
 *
 * Deploy: Vercel Cron → GET /api/telog/cloud-collect/collector
 * or external worker calling runCloudCollectCollectorTick().
 *
 * Production: open refresh token from vault, poll Tesla CN Fleet API per tenant,
 * append events via appendCloudCollectEvents — mirrors teslamate Vehicles.Vehicle.
 */
import { openRefreshToken } from "@/lib/telog/tokenVault";
import { listActiveCloudCollectTenants } from "@/lib/telog/cloudCollectStore";

export type CollectorTickResult = {
  tenants: number;
  polled: number;
  errors: string[];
};

/**
 * One collector tick — stub polls nothing until Fleet API worker is wired.
 * Safe to call from cron; no-ops when no active tenants.
 */
export async function runCloudCollectCollectorTick(): Promise<CollectorTickResult> {
  const tenants = await listActiveCloudCollectTenants();
  const errors: string[] = [];
  let polled = 0;

  for (const tenant of tenants) {
    if (tenant.transport !== "fleet_api") continue;
    const refreshToken = tenant.refreshTokenVault
      ? openRefreshToken(tenant.tenantId, tenant.refreshTokenVault)
      : null;
    if (!refreshToken) {
      errors.push(`${tenant.tenantId}: missing_refresh_token_vault`);
      continue;
    }

    // TODO: Tesla CN Fleet API poll → build CloudVehicleEvent batches
    // await appendCloudCollectEvents(tenant.tenantId, events);
    void refreshToken;
    polled += 1;
  }

  return { tenants: tenants.length, polled, errors };
}
