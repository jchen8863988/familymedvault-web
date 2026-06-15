const STORAGE_KEY = "ampnest_web_waitlist";

export type StoredWaitlistEntry = {
  id: string;
  spotId: string;
  inviteCode: string;
  spotLabel?: string;
  userName: string;
  webPushSubId: string;
  joinedAt: string;
};

function readAll(): StoredWaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Array<
      StoredWaitlistEntry & { email?: string }
    >;
    return raw
      .filter((e) => e.webPushSubId)
      .map((e) => ({
        id: e.id,
        spotId: e.spotId,
        inviteCode: e.inviteCode,
        spotLabel: e.spotLabel,
        userName: e.userName,
        webPushSubId: e.webPushSubId,
        joinedAt: e.joinedAt,
      }));
  } catch {
    return [];
  }
}

function writeAll(list: StoredWaitlistEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function saveWaitlistEntry(entry: StoredWaitlistEntry): void {
  const rest = readAll().filter((e) => e.id !== entry.id);
  writeAll([entry, ...rest]);
}

export function removeWaitlistEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function loadWaitlist(inviteCode: string): StoredWaitlistEntry[] {
  return readAll().filter((e) => e.inviteCode === inviteCode.toUpperCase());
}

export function hasWaitlistForSpot(
  inviteCode: string,
  spotId: string,
  webPushSubId: string,
): boolean {
  const code = inviteCode.toUpperCase();
  return readAll().some(
    (e) => e.inviteCode === code && e.spotId === spotId && e.webPushSubId === webPushSubId,
  );
}

/** One browser push subscription may waitlist at most one spot per building. */
export function hasWaitlistForPushSub(
  inviteCode: string,
  webPushSubId: string,
  exceptSpotId?: string,
): boolean {
  const code = inviteCode.toUpperCase();
  return readAll().some(
    (e) =>
      e.inviteCode === code &&
      e.webPushSubId === webPushSubId &&
      (!exceptSpotId || e.spotId !== exceptSpotId),
  );
}
