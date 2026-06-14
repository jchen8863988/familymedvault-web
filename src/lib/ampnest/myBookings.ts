import type { BookingSlot } from "./types";
import { isBookingActive } from "./bookingConflict";

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
