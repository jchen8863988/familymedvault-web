"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  update,
  get,
  remove,
  type Database,
} from "firebase/database";
import { getAmpNestFirebaseConfig, isAmpNestFirebaseConfigured } from "./config";
import type { BookingSlot, Building, ChargerSpot } from "./types";
import { isBookingActive, slotConflictsWithBookings } from "./bookingConflict";
import { enqueueBookingSmsQueue, cancelBookingSmsQueue } from "./smsQueue";

let app: FirebaseApp | undefined;
let db: Database | undefined;

function getDb(): Database | null {
  if (!isAmpNestFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(getAmpNestFirebaseConfig());
  }
  if (!db) db = getDatabase(app);
  return db;
}

export async function fetchBookingsForSpot(spotId: string): Promise<BookingSlot[]> {
  const database = getDb();
  if (!database) return [];
  const snap = await get(ref(database, "bookings"));
  const all = snap.val() ?? {};
  return Object.values(all).filter(
    (b) => (b as BookingSlot).spotId === spotId && isBookingActive(b as BookingSlot),
  ) as BookingSlot[];
}

export async function loadBuildingFromFirebase(
  inviteCode: string,
  onSpots: (building: Building, spots: ChargerSpot[]) => void,
): Promise<(() => void) | null> {
  const database = getDb();
  if (!database) return null;

  const codeSnap = await get(ref(database, `inviteCodes/${inviteCode.toUpperCase()}`));
  if (!codeSnap.exists()) return null;

  const buildingId = codeSnap.val() as string;
  const bSnap = await get(ref(database, `buildings/${buildingId}`));
  if (!bSnap.exists()) return null;
  const building = bSnap.val() as Building;

  const unsub = onValue(ref(database, "spots"), (snapshot) => {
    const all = snapshot.val() ?? {};
    const spots = Object.values(all).filter(
      (s) => (s as ChargerSpot).buildingId === buildingId,
    ) as ChargerSpot[];
    spots.sort((a, b) => (a.number || 0) - (b.number || 0));
    onSpots(building, spots);
  });

  return unsub;
}

export async function createFirebaseBooking(
  booking: Omit<BookingSlot, "id">,
): Promise<BookingSlot> {
  const database = getDb();
  if (!database) throw new Error("FIREBASE_NOT_CONFIGURED");

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const existing = await fetchBookingsForSpot(booking.spotId);
  if (slotConflictsWithBookings(booking.spotId, start, end, existing)) {
    throw new Error("BOOKING_CONFLICT");
  }

  const bookingRef = push(ref(database, "bookings"));
  const full: BookingSlot = { ...booking, id: bookingRef.key! };
  await set(bookingRef, full);
  await update(ref(database, `spots/${booking.spotId}`), {
    status: "booked",
    nextBooking: full,
  });

  const spotSnap = await get(ref(database, `spots/${booking.spotId}`));
  const spotLabel = (spotSnap.val() as ChargerSpot | null)?.label ?? booking.spotId;
  await enqueueBookingSmsQueue(database, full, spotLabel);

  return full;
}

/** Join web waitlist — notified only via browser Web Push (webPushSubId). */
export async function joinFirebaseWaitlist(input: {
  spotId: string;
  buildingId: string;
  userName: string;
  webPushSubId: string;
}): Promise<string | null> {
  const database = getDb();
  if (!database) return null;

  const userId = `web-${input.webPushSubId}`;
  const entryRef = push(ref(database, `queues/${input.spotId}`));
  const entry = {
    id: entryRef.key,
    spotId: input.spotId,
    buildingId: input.buildingId,
    userId,
    userName: input.userName.trim(),
    userTier: "web",
    webPushSubId: input.webPushSubId,
    joinedAt: new Date().toISOString(),
    status: "waiting",
  };
  await set(entryRef, entry);
  return entryRef.key;
}

export async function leaveFirebaseWaitlist(spotId: string, entryId: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  await remove(ref(database, `queues/${spotId}/${entryId}`));
}

/** Cancel a booking created on web (same device verifies via stored userId). */
export async function cancelFirebaseBooking(
  bookingId: string,
  spotId: string,
  userId: string,
): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("FIREBASE_NOT_CONFIGURED");

  const bookingSnap = await get(ref(database, `bookings/${bookingId}`));
  if (!bookingSnap.exists()) throw new Error("BOOKING_NOT_FOUND");

  const booking = bookingSnap.val() as BookingSlot;
  if (booking.userId !== userId) throw new Error("NOT_YOUR_BOOKING");
  if (!isBookingActive(booking)) throw new Error("BOOKING_NOT_ACTIVE");

  await cancelBookingSmsQueue(database, bookingId);
  await remove(ref(database, `bookings/${bookingId}`));

  const spotSnap = await get(ref(database, `spots/${spotId}`));
  const spot = spotSnap.val() as ChargerSpot | null;
  if (spot?.nextBooking?.id === bookingId) {
    await update(ref(database, `spots/${spotId}`), {
      status: "free",
      nextBooking: null,
    });
  }
}
