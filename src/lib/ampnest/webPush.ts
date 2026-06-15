"use client";

import { getApps, initializeApp } from "firebase/app";
import { getDatabase, onValue, ref, set, type Database } from "firebase/database";
import { getAmpNestFirebaseConfig, isAmpNestFirebaseConfigured } from "./config";
import type { ChargerSpot } from "./types";

const SW_PATH = "/ampnest-sw.js";
const SUB_KEY = "ampnest_web_push_sub_id";

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_AMPNEST_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function getDb(): Database | null {
  if (!isAmpNestFirebaseConfigured()) return null;
  const app = getApps().length ? getApps()[0]! : initializeApp(getAmpNestFirebaseConfig());
  return getDatabase(app);
}

export function getPushPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermissionState;
}

/** Register SW + subscribe to Web Push; store subscription in Firebase. */
export async function enableWebPush(input: {
  buildingId: string;
  userName?: string;
}): Promise<{
  ok: boolean;
  subId?: string;
  reason?: "denied" | "unsupported" | "no_vapid" | "error";
}> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { ok: false, reason: "no_vapid" };
  }

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const database = getDb();
    if (database && sub) {
      const subId = btoa(sub.endpoint).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
      await set(ref(database, `webPushSubscriptions/${input.buildingId}/${subId}`), {
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys,
        buildingId: input.buildingId,
        userName: input.userName?.trim() || null,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(SUB_KEY, subId);
      return { ok: true, subId };
    }
    return { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Current browser push subscription id for this device (required for web waitlist). */
export function getWebPushSubId(): string | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(SUB_KEY);
  if (!id || id.startsWith("local:")) return null;
  return id;
}

/** Show browser notifications when spots turn free (works without VAPID while page is open). */
export function watchSpotsForLocalNotifications(
  buildingId: string,
  spots: ChargerSpot[],
  t: (key: string, values?: Record<string, string>) => string,
): () => void {
  const database = getDb();
  if (!database || getPushPermissionState() !== "granted") return () => {};

  const prevStatus = new Map<string, ChargerSpot["status"]>();
  for (const s of spots) prevStatus.set(s.id, s.status);

  const unsub = onValue(ref(database, "spots"), (snap) => {
    const all = snap.val() ?? {};
    for (const raw of Object.values(all)) {
      const spot = raw as ChargerSpot;
      if (spot.buildingId !== buildingId) continue;
      const was = prevStatus.get(spot.id);
      if (was && was !== "free" && spot.status === "free") {
        try {
          new Notification("AmpNest ⚡", {
            body: t("pushSpotFree", { label: spot.label }),
            icon: "/favicon.ico",
            tag: `spot-free-${spot.id}`,
          });
        } catch {
          /* ignore */
        }
      }
      prevStatus.set(spot.id, spot.status);
    }
  });

  return unsub;
}

export function isWebPushEnabled(buildingId: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getWebPushSubId());
}
