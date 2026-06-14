const STORAGE_KEY = "ampnest_web_waitlist";

export type StoredWaitlistEntry = {
  id: string;
  spotId: string;
  inviteCode: string;
  spotLabel?: string;
  userName: string;
  email: string;
  joinedAt: string;
};

function readAll(): StoredWaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as StoredWaitlistEntry[];
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

export function hasWaitlistForSpot(inviteCode: string, spotId: string, email: string): boolean {
  const code = inviteCode.toUpperCase();
  return readAll().some(
    (e) => e.inviteCode === code && e.spotId === spotId && e.email.toLowerCase() === email.toLowerCase(),
  );
}
