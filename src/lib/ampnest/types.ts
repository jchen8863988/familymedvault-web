export type SpotStatus = "free" | "occupied" | "booked";

export interface BookingSlot {
  id: string;
  spotId: string;
  buildingId: string;
  userId: string;
  userName: string;
  phone?: string;
  startTime: string;
  endTime: string;
  status: "pending" | "active" | "completed" | "cancelled";
}

export interface ChargerSpot {
  id: string;
  buildingId: string;
  label: string;
  number: number;
  status: SpotStatus;
  chargerPowerKw?: number;
  occupiedBy?: string;
  estimatedFreeAt?: string;
  nextBooking?: BookingSlot;
}

export interface Building {
  id: string;
  name: string;
  inviteCode: string;
  spotCount: number;
}

export interface BuildingPayload {
  building: Building;
  spots: ChargerSpot[];
  bookings?: BookingSlot[];
  savedAt?: string;
}
