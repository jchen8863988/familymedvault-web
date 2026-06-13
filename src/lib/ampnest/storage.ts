import type { BuildingPayload } from "./types";

const STORAGE_KEY = "ampnest_web_buildings";

export function loadBuildingPayload(code: string): BuildingPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<
      string,
      BuildingPayload
    >;
    return all[code.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}

export function saveBuildingPayload(code: string, payload: BuildingPayload): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<
      string,
      BuildingPayload
    >;
    all[code.toUpperCase()] = payload;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota errors */
  }
}

export function parseSetupParam(setup: string): BuildingPayload | null {
  try {
    return JSON.parse(decodeURIComponent(setup)) as BuildingPayload;
  } catch {
    return null;
  }
}
