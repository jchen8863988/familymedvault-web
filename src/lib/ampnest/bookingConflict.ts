import type { BookingSlot } from "./types";

export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

const ACTIVE: BookingSlot["status"][] = ["pending", "active"];

export function isBookingActive(booking: BookingSlot): boolean {
  return ACTIVE.includes(booking.status);
}

export function slotConflictsWithBookings(
  spotId: string,
  start: Date,
  end: Date,
  bookings: BookingSlot[],
  excludeId?: string,
): boolean {
  return bookings.some(
    (b) =>
      b.spotId === spotId &&
      isBookingActive(b) &&
      b.id !== excludeId &&
      intervalsOverlap(start, end, new Date(b.startTime), new Date(b.endTime)),
  );
}

export function bookingsForSpot(spotId: string, bookings: BookingSlot[]): BookingSlot[] {
  return bookings
    .filter((b) => b.spotId === spotId && isBookingActive(b))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
