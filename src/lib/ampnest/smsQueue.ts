import { push, ref, set, get, update } from "firebase/database";
import type { BookingSlot } from "./types";

const REMINDER_LEAD_MS = 10 * 60 * 1000;

function formatStartLabel(start: Date): string {
  return start.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function enqueueBookingSmsQueue(
  database: ReturnType<typeof import("firebase/database").getDatabase>,
  booking: BookingSlot,
  spotLabel: string,
): Promise<void> {
  if (!booking.phone?.trim()) return;

  const phone = booking.phone.trim();
  const start = new Date(booking.startTime);
  const startStr = formatStartLabel(start);

  const confirmRef = push(ref(database, "smsQueue"));
  await set(confirmRef, {
    bookingId: booking.id,
    phone,
    sendAt: new Date().toISOString(),
    type: "confirm",
    body: `AmpNest: 预约已确认！${spotLabel} · ${startStr} 开始。开始前 10 分钟会再发短信提醒。`,
    status: "pending",
  });

  const reminderAt = new Date(start.getTime() - REMINDER_LEAD_MS);
  if (reminderAt.getTime() > Date.now()) {
    const reminderRef = push(ref(database, "smsQueue"));
    await set(reminderRef, {
      bookingId: booking.id,
      phone,
      sendAt: reminderAt.toISOString(),
      type: "reminder",
      body: `AmpNest: 充电位 ${spotLabel} 10 分钟后开始（${startStr}），请提前将车停好。`,
      status: "pending",
    });
  }
}

export async function cancelBookingSmsQueue(
  database: ReturnType<typeof import("firebase/database").getDatabase>,
  bookingId: string,
): Promise<void> {
  const snap = await get(ref(database, "smsQueue"));
  const all = snap.val() ?? {};
  const updates: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(all)) {
    const item = raw as { bookingId?: string; status?: string };
    if (item.bookingId === bookingId && item.status === "pending") {
      updates[`smsQueue/${key}/status`] = "cancelled";
    }
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
}
