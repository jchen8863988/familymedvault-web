import type { BookingSlot, ChargerSpot } from "./types";
import { isBookingActive } from "./bookingConflict";
import { getRememberedWebUserIds, getSavedUserName, rememberWebUserId } from "./webSession";

const STORAGE_KEY = "ampnest_my_bookings";

export type StoredWebBooking = BookingSlot & {
  inviteCode: string;
  spotLabel?: string;
};

function readAll(): StoredWebBooking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as StoredWebBooking[];
  } catch {
    return [];
  }
}

function writeAll(list: StoredWebBooking[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

/** Remember this browser's booking so the user can cancel later without the app. */
export function saveMyBooking(
  booking: BookingSlot,
  inviteCode: string,
  spotLabel?: string,
): void {
  const entry: StoredWebBooking = {
    ...booking,
    inviteCode: inviteCode.toUpperCase(),
    spotLabel,
  };
  const rest = readAll().filter((b) => b.id !== booking.id);
  writeAll([entry, ...rest]);
}

export function removeMyBooking(bookingId: string): void {
  writeAll(readAll().filter((b) => b.id !== bookingId));
}

export function getMyBooking(bookingId: string): StoredWebBooking | undefined {
  return readAll().find((b) => b.id === bookingId);
}

/** Active bookings for this invite code on this device. */
export function loadMyBookings(inviteCode: string): StoredWebBooking[] {
  const code = inviteCode.toUpperCase();
  const now = Date.now();
  return readAll().filter(
    (b) =>
      b.inviteCode === code &&
      isBookingActive(b) &&
      new Date(b.endTime).getTime() > now,
  );
}

export function markMyBookingCancelled(bookingId: string): void {
  writeAll(
    readAll().map((b) =>
      b.id === bookingId ? { ...b, status: "cancelled" as const } : b,
    ),
  );
}

/** Merge localStorage bookings with live spots (web userId or matching name). */
export function collectRecoverableWebBookings(
  inviteCode: string,
  spots: ChargerSpot[],
  userNameInput?: string,
): StoredWebBooking[] {
  const code = inviteCode.toUpperCase();
  const now = Date.now();
  const byId = new Map<string, StoredWebBooking>();

  for (const b of loadMyBookings(inviteCode)) {
    byId.set(b.id, b);
  }

  const knownIds = getRememberedWebUserIds();
  const savedName = (userNameInput?.trim() || getSavedUserName()).toLowerCase();

  for (const spot of spots) {
    const nb = spot.nextBooking;
    if (!nb || !isBookingActive(nb) || byId.has(nb.id)) continue;
    if (!nb.userId.startsWith("web-")) continue;
    if (new Date(nb.endTime).getTime() <= now) continue;

    const idMatch = knownIds.includes(nb.userId);
    const nameMatch =
      savedName.length > 0 && nb.userName.trim().toLowerCase() === savedName;

    if (idMatch || nameMatch) {
      rememberWebUserId(nb.userId);
      byId.set(nb.id, {
        ...nb,
        inviteCode: code,
        spotLabel: spot.label,
      });
    }
  }

  return Array.from(byId.values()).filter(
    (b) =>
      b.inviteCode === code &&
      isBookingActive(b) &&
      new Date(b.endTime).getTime() > now,
  );
}
